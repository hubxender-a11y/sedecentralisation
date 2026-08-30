import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeDivision(division: {
  id: string;
  directionId: string | null;
  directionNom: string | null;
  nom: string;
  description: string | null;
  statut: string;
  createdAt: Date;
}) {
  return {
    id: division.id,
    directionId: division.directionId ?? '',
    directionNom: division.directionNom ?? '',
    nom: division.nom,
    description: division.description ?? '',
    statut: division.statut,
    createdAt: division.createdAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverUser = await getServerUser(req);
  if (!serverUser) {
    return NextResponse.json({ error: 'Utilisateur non autorisé.' }, { status: 401 });
  }

  const { id } = await params;
  const division = await prisma.division.findUnique({
    where: { id },
    select: {
      id: true,
      directionId: true,
      directionNom: true,
      nom: true,
      description: true,
      statut: true,
      createdAt: true,
    },
  });

  if (!division) {
    return NextResponse.json({ error: 'Division non trouvée' }, { status: 404 });
  }

  return NextResponse.json(serializeDivision(division));
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
    const isAdminRole = ['role-super-admin', 'role-admin', 'role-secretariat-general', 'role-chef-direction', 'role-chef-division'].includes(roleId);
    if (!isAdminRole) {
      return NextResponse.json({ ok: false, message: 'Seul un administrateur ou chef de direction/division peut modifier une division.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Division non trouvée' }, { status: 404 });
    }

    const updated = await prisma.division.update({
      where: { id },
      data: {
        directionId: typeof body.directionId === 'string' && body.directionId.trim() ? body.directionId.trim() : existing.directionId,
        directionNom: typeof body.directionNom === 'string' && body.directionNom.trim() ? body.directionNom.trim() : existing.directionNom,
        nom: typeof body.nom === 'string' && body.nom.trim() ? body.nom.trim() : existing.nom,
        description: typeof body.description === 'string' ? body.description : existing.description,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : existing.statut,
      },
      select: {
        id: true,
        directionId: true,
        directionNom: true,
        nom: true,
        description: true,
        statut: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPDATE_DIVISION',
      entityType: 'Division',
      entityId: id,
      oldValue: {
        nom: existing.nom,
        directionId: existing.directionId,
        statut: existing.statut,
      },
      newValue: {
        nom: updated.nom,
        directionId: updated.directionId,
        statut: updated.statut,
      },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeDivision(updated));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur mise à jour';
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
    return NextResponse.json({ ok: false, message: 'Seul un administrateur peut supprimer une division.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.division.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Division non trouvée' }, { status: 404 });
  }

  await prisma.division.delete({ where: { id } });
  await writeAuditLog({
    userId: serverUser.id,
    action: 'DELETE_DIVISION',
    entityType: 'Division',
    entityId: id,
    oldValue: {
      nom: existing.nom,
      directionId: existing.directionId,
      statut: existing.statut,
    },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true });
}
