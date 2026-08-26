import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';

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

export async function GET() {
  try {
    const directions = await prisma.direction.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(directions.map(serializeDirection));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur listing directions';
    console.error('GET /api/directions failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function ensureDirectionSeed() {
  const defaults = [
    {
      id: 'dir-communication',
      nom: 'Direction de la Communication',
      description: 'Direction de la Communication',
      statut: 'ACTIF',
    },
    {
      id: 'dir-1',
      nom: 'Direction Générale',
      description: 'Direction générale du Secrétariat général',
      statut: 'ACTIF',
    },
  ];

  for (const item of defaults) {
    const existing = await prisma.direction.findUnique({ where: { id: item.id } });
    if (!existing) {
      await prisma.direction.create({
        data: {
          id: item.id,
          nom: item.nom,
          description: item.description,
          statut: item.statut,
        },
      });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    const roleId = String(serverUser.roleId || '').trim();
    const isAdminRole = roleId === 'role-super-admin' || roleId === 'role-admin' || roleId === 'role-secretariat-general';

    if (!isAdminRole) {
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut créer une direction.' }, { status: 403 });
    }

    await ensureDirectionSeed();

    const body = await req.json();
    const created = await prisma.direction.create({
      data: {
        id: body.id || `dir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom: body.nom || 'Nouvelle Direction',
        description: body.description || '',
        statut: body.statut || 'ACTIF',
      },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(serializeDirection(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création direction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
