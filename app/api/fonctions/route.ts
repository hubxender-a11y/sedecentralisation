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

export async function GET() {
  try {
    const fonctions = await prisma.fonction.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(fonctions.map(serializeFonction));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur listing fonctions';
    console.error('GET /api/fonctions failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    if (String(serverUser.roleId) !== 'role-super-admin') {
      return NextResponse.json({ ok: false, message: 'Seul le super-admin peut créer une fonction.' }, { status: 403 });
    }

    const body = await req.json();
    const created = await prisma.fonction.create({
      data: {
        id: body.id || `fnc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom: body.nom || 'Nouvelle fonction',
        description: body.description || '',
        statut: body.statut || 'ACTIF',
      },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(serializeFonction(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création fonction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
