import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
    }

    const account = await prisma.portalUser.findUnique({ where: { id: user.id }, select: { password: true } });
    if (!account || !verifyPassword(currentPassword, account.password)) {
      await writeAuditLog({ action: 'CHANGE_PASSWORD', userId: user.id, ipAddress: getRequestIp(request), result: 'FAILURE' });
      return NextResponse.json({ ok: false, message: 'Mot de passe actuel incorrect.' }, { status: 400 });
    }

    await prisma.portalUser.update({
      where: { id: user.id },
      data: { password: hashPassword(newPassword), password_reset_required: false },
    });
    await writeAuditLog({ action: 'CHANGE_PASSWORD', userId: user.id, entityType: 'PortalUser', entityId: user.id, ipAddress: getRequestIp(request) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Change password failed', error);
    return NextResponse.json({ ok: false, message: 'Erreur serveur lors du changement de mot de passe.' }, { status: 500 });
  }
}
