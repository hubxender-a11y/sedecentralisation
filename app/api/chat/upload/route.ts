import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerUser } from '@/lib/serverAuth';
import { ensureUploadRoot } from '@/lib/documentStorage';

const DEFAULT_MAX = 10 * 1024 * 1024; // 10MB
// allow common images, documents, text and audio. Support wildcards (image/*, audio/*)
const DEFAULT_TYPES = ['image/*', 'audio/*', 'application/pdf', 'text/plain'];

function sanitizeFileName(name: string) {
  // remove any path segments and dangerous chars
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function isAllowedMime(mime: string, allowed: string[]) {
  if (!mime) return false;
  for (const a of allowed) {
    if (a.endsWith('/*')) {
      const prefix = a.replace(/\*$/, '');
      if (mime.startsWith(prefix)) return true;
    } else {
      if (mime === a) return true;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser(req);
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { conversationId, filename, contentBase64, contentType, contentSize } = body;
    if (!filename || !contentBase64 || !conversationId) {
      return NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 });
    }

    // decode buffer
    const buffer = Buffer.from(contentBase64, 'base64');
    const actualSize = buffer.length;
    const declaredSize = typeof contentSize === 'number' ? Number(contentSize) : null;

    const maxSize = DEFAULT_MAX;
    if (declaredSize && declaredSize > maxSize) {
      return NextResponse.json({ ok: false, error: 'File too large' }, { status: 413 });
    }
    if (actualSize > maxSize) {
      return NextResponse.json({ ok: false, error: 'File too large' }, { status: 413 });
    }

    // determine content type (prefer declared, fallback to extension)
    let mime = contentType || '';
    if (!mime) {
      const ext = (filename || '').split('.').pop() || '';
      const map: Record<string,string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', pdf: 'application/pdf', txt: 'text/plain' };
      mime = map[ext.toLowerCase()] || '';
    }

    if (DEFAULT_TYPES.length > 0 && !isAllowedMime(mime, DEFAULT_TYPES)) {
      return NextResponse.json({ ok: false, error: 'File type not allowed' }, { status: 400 });
    }

    // ensure base upload root
    const root = ensureUploadRoot();
    const chatDir = path.join(root, 'chat', String(conversationId));
    if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });

    const safeName = sanitizeFileName(filename);
    const targetPath = path.join(chatDir, safeName);

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = path.posix.join('/uploads', 'chat', String(conversationId), safeName);

    return NextResponse.json({ ok: true, url: publicUrl, name: safeName });
  } catch (e) {
    console.error('chat/upload error', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
