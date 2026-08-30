import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeGrade(grade: {
  id: string;
  nom: string;
  description: string | null;
  statut: string;
  createdAt: Date;
}) {
  return {
    id: grade.id,
    nom: grade.nom,
    description: grade.description ?? '',
    statut: grade.statut,
    createdAt: grade.createdAt.toISOString(),
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
    const isAdminRole = roleId === 'role-super-admin' || roleId === 'role-admin' || roleId === 'role-secretariat-general';

    if (!isAdminRole) {
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut modifier un grade.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.grade.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Grade introuvable.' }, { status: 404 });
    }

    const body = await req.json();
    const nextNom = typeof body.nom === 'string' ? body.nom.trim() : existing.nom;
    if (!nextNom) {
      return NextResponse.json({ error: 'Le nom du grade est obligatoire.' }, { status: 400 });
    }

    const updated = await prisma.grade.update({
      where: { id },
      data: {
        nom: nextNom,
        description: typeof body.description === 'string' ? body.description : existing.description,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : existing.statut,
      },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPDATE_GRADE',
      entityType: 'Grade',
      entityId: id,
      oldValue: { nom: existing.nom, statut: existing.statut },
      newValue: { nom: updated.nom, statut: updated.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeGrade(updated));
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
    return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
  }

  const roleId = String(serverUser.roleId || '').trim();
  const isAdminRole = roleId === 'role-super-admin' || roleId === 'role-admin' || roleId === 'role-secretariat-general';

  if (!isAdminRole) {
    return NextResponse.json({ ok: false, message: 'Seul un administrateur peut supprimer un grade.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.grade.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Grade introuvable.' }, { status: 404 });
  }

  await prisma.grade.delete({ where: { id } });
  await writeAuditLog({
    userId: serverUser.id,
    action: 'DELETE_GRADE',
    entityType: 'Grade',
    entityId: id,
    oldValue: { nom: existing.nom, statut: existing.statut },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true });
}
