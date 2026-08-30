import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeCommune(commune: {
  id: string;
  nom: string;
  villeId: string | null;
  statut: string | null;
  createdAt: Date | null;
}) {
  return {
    id: commune.id,
    nom: commune.nom,
    villeId: commune.villeId ?? '',
    statut: commune.statut ?? 'ACTIF',
    createdAt: commune.createdAt ? commune.createdAt.toISOString() : null,
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
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut modifier une commune.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.commune.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Commune introuvable.' }, { status: 404 });
    }

    const body = await req.json();
    const updated = await prisma.commune.update({
      where: { id },
      data: {
        nom: typeof body.nom === 'string' && body.nom.trim() ? body.nom.trim() : existing.nom,
        villeId: typeof body.villeId === 'string' && body.villeId.trim() ? body.villeId.trim() : existing.villeId,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : existing.statut,
      },
      select: { id: true, nom: true, villeId: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPDATE_COMMUNE',
      entityType: 'Commune',
      entityId: id,
      oldValue: { nom: existing.nom, villeId: existing.villeId, statut: existing.statut },
      newValue: { nom: updated.nom, villeId: updated.villeId, statut: updated.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeCommune(updated));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur mise à jour commune';
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
    return NextResponse.json({ ok: false, message: 'Seul un administrateur peut supprimer une commune.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.commune.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Commune introuvable.' }, { status: 404 });
  }

  await prisma.commune.delete({ where: { id } });
  await writeAuditLog({
    userId: serverUser.id,
    action: 'DELETE_COMMUNE',
    entityType: 'Commune',
    entityId: id,
    oldValue: { nom: existing.nom, villeId: existing.villeId, statut: existing.statut },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true });
}
