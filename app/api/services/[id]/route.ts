import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeService(service: {
  id: string;
  nom: string;
  directionId: string | null;
  directionNom: string | null;
  divisionId: string | null;
  divisionNom: string | null;
  codeService: string | null;
  description: string | null;
  chefService: string | null;
  statut: string;
  createdAt: Date;
}) {
  return {
    id: service.id,
    nom: service.nom,
    directionId: service.directionId ?? '',
    directionNom: service.directionNom ?? service.divisionNom ?? '',
    divisionId: service.divisionId ?? '',
    divisionNom: service.divisionNom ?? '',
    codeService: service.codeService ?? '',
    description: service.description ?? '',
    chefService: service.chefService ?? '',
    statut: service.statut,
    createdAt: service.createdAt.toISOString(),
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
  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      directionId: true,
      directionNom: true,
      divisionId: true,
      divisionNom: true,
      codeService: true,
      description: true,
      chefService: true,
      statut: true,
      createdAt: true,
    },
  });

  if (!service) {
    return NextResponse.json({ error: 'Bureau introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeService(service));
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
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut modifier un bureau.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Bureau introuvable' }, { status: 404 });
    }

    const directionId = typeof body.directionId === 'string' && body.directionId.trim()
      ? body.directionId.trim()
      : typeof body.divisionId === 'string' && body.divisionId.trim()
      ? body.divisionId.trim()
      : existing.directionId ?? undefined;

    const divisionId = typeof body.divisionId === 'string' && body.divisionId.trim() ? body.divisionId.trim() : existing.divisionId ?? undefined;
    const directionNom = typeof body.directionNom === 'string' && body.directionNom.trim() ? body.directionNom.trim() : existing.directionNom ?? undefined;
    const divisionNom = typeof body.divisionNom === 'string' && body.divisionNom.trim() ? body.divisionNom.trim() : existing.divisionNom ?? undefined;

    let division = null as { id: string; nom: string } | null;
    if (divisionId) {
      division = await prisma.division.findUnique({ where: { id: divisionId }, select: { id: true, nom: true } });
    }
    if (!division && typeof body.divisionNom === 'string' && body.divisionNom.trim()) {
      division = await prisma.division.findFirst({ where: { nom: body.divisionNom.trim() }, select: { id: true, nom: true } });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        nom: typeof body.nom === 'string' && body.nom.trim() ? body.nom.trim() : existing.nom,
        directionId: directionId || null,
        directionNom: directionNom || null,
        divisionId: divisionId || division?.id || null,
        divisionNom: divisionNom || division?.nom || directionNom || existing.divisionNom || existing.directionNom || null,
        codeService: typeof body.codeService === 'string' ? body.codeService : existing.codeService,
        description: typeof body.description === 'string' ? body.description : existing.description,
        chefService: typeof body.chefService === 'string' ? body.chefService : existing.chefService,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : existing.statut,
      },
      select: {
        id: true,
        nom: true,
        directionId: true,
        directionNom: true,
        divisionId: true,
        divisionNom: true,
        codeService: true,
        description: true,
        chefService: true,
        statut: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPDATE_SERVICE',
      entityType: 'Service',
      entityId: id,
      oldValue: {
        nom: existing.nom,
        directionId: existing.directionId,
        divisionId: existing.divisionId,
        statut: existing.statut,
      },
      newValue: {
        nom: updated.nom,
        directionId: updated.directionId,
        divisionId: updated.divisionId,
        statut: updated.statut,
      },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeService(updated));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur modification du bureau';
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
    return NextResponse.json({ ok: false, message: 'Seul un administrateur peut supprimer un bureau.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Bureau introuvable' }, { status: 404 });
  }

  await prisma.service.delete({ where: { id } });
  await writeAuditLog({
    userId: serverUser.id,
    action: 'DELETE_SERVICE',
    entityType: 'Service',
    entityId: id,
    oldValue: {
      nom: existing.nom,
      directionId: existing.directionId,
      divisionId: existing.divisionId,
      statut: existing.statut,
    },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true });
}
