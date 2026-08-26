import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { seedAdminState } from '@/lib/adminState';

function normalizeFullName(value: unknown, fallback?: unknown): string {
  const raw = String(value ?? fallback ?? '').trim();
  const cleaned = raw.replace(/undefined/gi, '').replace(/\s+/g, ' ').trim();
  if (cleaned) return cleaned;
  const fallbackValue = String(fallback ?? 'Utilisateur').trim();
  return fallbackValue || 'Utilisateur';
}

export async function POST(request: NextRequest) {
  try {
    await seedAdminState();
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: 'Email et mot de passe requis.' }, { status: 400 });
    }

    const [user] = await prisma.$queryRaw<{
      id: string;
      fullName: string;
      email: string;
      password: string;
      roleId: string | null;
      directionId: string | null;
      directionNom: string | null;
      divisionId: string | null;
      divisionNom: string | null;
      serviceId: string | null;
      serviceNom: string | null;
      permissions: string | null;
      status: string;
      passwordResetRequired: boolean | number | null;
    }[]>`
      SELECT
        pu.id,
        pu.full_name as fullName,
        pu.email,
        pu.password,
        pu.role_id as roleId,
        pu.direction_id as directionId,
        pu.direction_nom as directionNom,
        pu.division_id as divisionId,
        pu.division_nom as divisionNom,
        pu.service_id as serviceId,
        pu.service_nom as serviceNom,
        pu.permissions,
        pu.status,
        pu.password_reset_required as passwordResetRequired
      FROM portal_users pu
      WHERE LOWER(pu.email) = LOWER(${email})
      LIMIT 1
    `;

    if (!user || user.status !== 'Actif' || !user.password) {
      return NextResponse.json({ ok: false, message: 'Identifiants invalides ou compte inactif.' }, { status: 401 });
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json({ ok: false, message: 'Identifiants invalides ou compte inactif.' }, { status: 401 });
    }

    const payload = {
      ok: true,
      id: user.id,
      fullName: normalizeFullName(user.fullName, user.email),
      email: user.email,
      roleId: user.roleId,
      directionId: user.directionId ?? undefined,
      directionNom: user.directionNom ?? undefined,
      divisionId: user.divisionId ?? undefined,
      divisionNom: user.divisionNom ?? undefined,
      serviceId: user.serviceId ?? undefined,
      serviceNom: user.serviceNom ?? undefined,
      permissions: JSON.parse(user.permissions || '[]'),
      status: user.status,
      passwordResetRequired: Boolean(user.passwordResetRequired),
    };

    const res = NextResponse.json(payload);
    const secure = process.env.NODE_ENV === 'production';
    res.cookies.set('kana-current-user-id', String(user.id), {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure,
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    console.error('Login failed', error);
    return NextResponse.json({ ok: false, message: 'Erreur serveur lors de la connexion.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('kana-current-user-id', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    console.error('Logout error', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
