import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function serializeDirection(direction: {
  id: string;
  nom: string;
  description: string | null;
  statut: string;
  createdAt: Date;
}) {
  return {
    id: direction.id,
    nom: direction.nom,
    description: direction.description ?? '',
    statut: direction.statut,
    createdAt: direction.createdAt.toISOString(),
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.direction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Direction non trouvée' }, { status: 404 });
    }

    const updated = await prisma.direction.update({
      where: { id },
      data: {
        nom: body.nom ?? existing.nom,
        description: body.description ?? existing.description,
        statut: body.statut ?? existing.statut,
      },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(serializeDirection(updated));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur mise à jour';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.direction.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ success: true });
  }

  await prisma.direction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
