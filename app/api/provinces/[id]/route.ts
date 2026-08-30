import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeProvince(province: {
  id: string;
  nom: string;
  statut: string | null;
  createdAt: Date | null;
}) {
  return {
    id: province.id,
    nom: province.nom,
    statut: province.statut ?? 'ACTIF',
    createdAt: province.createdAt ? province.createdAt.toISOString() : null,
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    const roleId = String(serverUser.roleId || '').trim();
    const isAdminRole = ['role-super-admin', 'role-admin', 'role-secretariat-general'].includes(roleId);
    if (!isAdminRole) {
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut modifier une province.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.province.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Province introuvable.' }, { status: 404 });
    }

    const body = await req.json();
    const updated = await prisma.province.update({
      where: { id },
      data: {
        nom: typeof body.nom === 'string' && body.nom.trim() ? body.nom.trim() : existing.nom,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : existing.statut,
      },
      select: { id: true, nom: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPDATE_PROVINCE',
      entityType: 'Province',
      entityId: id,
      oldValue: { nom: existing.nom, statut: existing.statut },
      newValue: { nom: updated.nom, statut: updated.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeProvince(updated));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur mise à jour province';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverUser = await getServerUser(req);
  if (!serverUser) {
    return NextResponse.json({ error: 'Utilisateur non autorisé.' }, { status: 401 });
  }

  const roleId = String(serverUser.roleId || '').trim();
  const isAdminRole = ['role-super-admin', 'role-admin', 'role-secretariat-general'].includes(roleId);
  if (!isAdminRole) {
    return NextResponse.json({ ok: false, message: 'Seul un administrateur peut supprimer une province.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.province.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Province introuvable.' }, { status: 404 });
  }

  await prisma.province.delete({ where: { id } });
  await writeAuditLog({
    userId: serverUser.id,
    action: 'DELETE_PROVINCE',
    entityType: 'Province',
    entityId: id,
    oldValue: { nom: existing.nom, statut: existing.statut },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true });
}
