import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

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

    const body = await req.json();
    const name = typeof body.nom === 'string' ? body.nom.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Le nom de la direction est obligatoire.' }, { status: 400 });
    }

    const created = await prisma.direction.create({
      data: {
        id: body.id || `dir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom: name,
        description: body.description || '',
        statut: body.statut || 'ACTIF',
      },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'CREATE_DIRECTION',
      entityType: 'Direction',
      entityId: created.id,
      newValue: { nom: created.nom, statut: created.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeDirection(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création direction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
