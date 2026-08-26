import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);
const NAPS2_EXE = 'C:\\Program Files\\NAPS2\\NAPS2.Console.exe';

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const profile = typeof body.profile === 'string' ? body.profile : undefined;
    const device = typeof body.device === 'string' ? body.device : undefined;
    const driver = typeof body.driver === 'string' ? body.driver : undefined;
    const dpi = body.dpi ? String(body.dpi) : undefined;
    const bitdepth = body.bitdepth ? String(body.bitdepth) : undefined;

    if (!(await fileExists(NAPS2_EXE))) {
      return NextResponse.json({ ok: false, error: `NAPS2 not found at ${NAPS2_EXE}` }, { status: 500 });
    }

    const tmpDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(tmpDir, `scan-${timestamp}.png`);

    const args: string[] = [];
    if (profile) {
      args.push('--profile', profile);
    }
    if (device) {
      args.push('--device', device);
    }
    if (driver) {
      args.push('--driver', driver);
    }
    if (dpi) {
      args.push('--dpi', dpi);
    }
    if (bitdepth) {
      args.push('--bitdepth', bitdepth);
    }

    // output and verbose
    args.push('-o', outFile, '-v');

    // run NAPS2
    const { stdout, stderr } = await execFileAsync(NAPS2_EXE, args, { windowsHide: true, timeout: 2 * 60 * 1000 });

    // verify file
    if (!(await fileExists(outFile))) {
      return NextResponse.json({ ok: false, error: 'Scan completed but output file not found', stdout, stderr }, { status: 500 });
    }

    const data = await fs.readFile(outFile);
    const base64 = data.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ ok: true, filename: path.basename(outFile), path: outFile, dataUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('POST /api/scan-local error:', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const wantProfiles = searchParams.get('profiles');
    const wantDevices = searchParams.get('devices');
    const tmpDir = path.join(process.cwd(), 'tmp');

    if (wantDevices) {
      if (!(await fileExists(NAPS2_EXE))) {
        return NextResponse.json({ ok: false, error: `NAPS2 not found at ${NAPS2_EXE}`, scanners: [] }, { status: 500 });
      }

      try {
        const scanners: Array<{ id: string; name: string; driver: string }> = [];
        for (const driver of ['wia', 'twain', 'escl']) {
          try {
            const { stdout, stderr } = await execFileAsync(NAPS2_EXE, ['--driver', driver, '--listdevices'], { windowsHide: true, timeout: 30 * 1000 });
            const lines = `${stdout}\n${stderr}`
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => line && !/^(-|scanner|device|name|no devices?)/i.test(line));
            for (const name of Array.from(new Set(lines))) {
              if (!scanners.some((scanner) => scanner.name === name && scanner.driver === driver)) {
                scanners.push({ id: `${driver}:${name}`, name, driver });
              }
            }
          } catch {
            // A missing driver or no device should not prevent the other drivers from being checked.
          }
        }
        return NextResponse.json({ ok: true, scanners });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ ok: false, error: message, scanners: [] }, { status: 500 });
      }
    }

    // If caller requested profiles, attempt to read NAPS2 profiles from APPDATA
    if (wantProfiles) {
      const appdata = process.env.APPDATA || '';
      const profilesPath = path.join(appdata, 'NAPS2', 'profiles.xml');
      try {
        const xml = await fs.readFile(profilesPath, { encoding: 'utf8' });
        // simple parse: extract DisplayName or Name elements
        const matches = Array.from(xml.matchAll(/<DisplayName>(.*?)<\/DisplayName>/g));
        const names = matches.map((m) => m[1].trim()).filter(Boolean);
        return NextResponse.json({ ok: true, profiles: names });
      } catch (err) {
        console.error('Unable to read profiles.xml at', profilesPath, err);
        return NextResponse.json({ ok: true, profiles: [] });
      }
    }

    if (name) {
      const filePath = path.join(tmpDir, name);
      if (!(await fileExists(filePath))) {
        return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
      }
      const buf = await fs.readFile(filePath);
      return new NextResponse(buf, { headers: { 'Content-Type': 'image/png' } });
    }

    // list files
    const files = await fs.readdir(tmpDir).catch(() => []);
    const scans = files
      .filter((f) => f.startsWith('scan-'))
      .map((f) => ({ name: f, path: `/api/scan-local?name=${encodeURIComponent(f)}` }))
      .sort((a, b) => (a.name < b.name ? 1 : -1));

    return NextResponse.json({ ok: true, scans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('GET /api/scan-local error:', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
