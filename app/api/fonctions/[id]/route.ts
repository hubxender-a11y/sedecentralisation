import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';

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

    const updated = await prisma.fonction.update({
      where: { id },
      data: {
        nom: typeof body.nom === 'string' ? body.nom : existing.nom,
        description: typeof body.description === 'string' ? body.description : existing.description,
        statut: typeof body.statut === 'string' ? body.statut : existing.statut,
      },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
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
  await prisma.fonction.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
