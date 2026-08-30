import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeFonction(fonction: {
  id: string;
  nom: string;
  description: string | null;
  statut: string;
  createdAt: Date;
}) {
  return {
    id: fonction.id,
    nom: fonction.nom,
    description: fonction.description ?? '',
    statut: fonction.statut,
    createdAt: fonction.createdAt.toISOString(),
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

    if (String(serverUser.roleId) !== 'role-super-admin') {
      return NextResponse.json({ ok: false, message: 'Seul le super-admin peut modifier une fonction.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.fonction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Fonction non trouvée' }, { status: 404 });
    }

    const nextNom = typeof body.nom === 'string' ? body.nom.trim() : existing.nom;
    if (!nextNom) {
      return NextResponse.json({ error: 'Le nom de la fonction est obligatoire.' }, { status: 400 });
    }

    const updated = await prisma.fonction.update({
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
      action: 'UPDATE_FONCTION',
      entityType: 'Fonction',
      entityId: id,
      oldValue: { nom: existing.nom, statut: existing.statut },
      newValue: { nom: updated.nom, statut: updated.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeFonction(updated));
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

  if (String(serverUser.roleId) !== 'role-super-admin') {
    return NextResponse.json({ ok: false, message: 'Seul le super-admin peut supprimer une fonction.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.fonction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Fonction non trouvée' }, { status: 404 });
  }

  await prisma.fonction.delete({ where: { id } });
  await writeAuditLog({
    userId: serverUser.id,
    action: 'DELETE_FONCTION',
    entityType: 'Fonction',
    entityId: id,
    oldValue: { nom: existing.nom, statut: existing.statut },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true });
}
