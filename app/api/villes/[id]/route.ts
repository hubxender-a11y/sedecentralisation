import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeVille(ville: {
  id: string;
  nom: string;
  provinceId: string | null;
  statut: string | null;
  createdAt: Date | null;
}) {
  return {
    id: ville.id,
    nom: ville.nom,
    provinceId: ville.provinceId ?? '',
    districtId: ville.provinceId ?? '',
    statut: ville.statut ?? 'ACTIF',
    createdAt: ville.createdAt ? ville.createdAt.toISOString() : null,
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
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut modifier une ville.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.ville.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ville introuvable.' }, { status: 404 });
    }

    const body = await req.json();
    const provinceId = typeof body.provinceId === 'string' && body.provinceId.trim()
      ? body.provinceId.trim()
      : typeof body.districtId === 'string' && body.districtId.trim()
        ? body.districtId.trim()
        : existing.provinceId;

    const updated = await prisma.ville.update({
      where: { id },
      data: {
        nom: typeof body.nom === 'string' && body.nom.trim() ? body.nom.trim() : existing.nom,
        provinceId,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : existing.statut,
      },
      select: { id: true, nom: true, provinceId: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPDATE_VILLE',
      entityType: 'Ville',
      entityId: id,
      oldValue: { nom: existing.nom, provinceId: existing.provinceId, statut: existing.statut },
      newValue: { nom: updated.nom, provinceId: updated.provinceId, statut: updated.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeVille(updated));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur mise à jour ville';
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
    return NextResponse.json({ ok: false, message: 'Seul un administrateur peut supprimer une ville.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.ville.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Ville introuvable.' }, { status: 404 });
  }

  await prisma.ville.delete({ where: { id } });
  await writeAuditLog({
    userId: serverUser.id,
    action: 'DELETE_VILLE',
    entityType: 'Ville',
    entityId: id,
    oldValue: { nom: existing.nom, provinceId: existing.provinceId, statut: existing.statut },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true });
}
