import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeDivision(division: {
  id: string;
  directionId?: string | null;
  directionNom?: string | null;
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const directionId = searchParams.get('directionId');

    const divisions = await prisma.division.findMany({
      where: directionId ? { directionId } : undefined,
      orderBy: { createdAt: 'asc' },
      select: { id: true, directionId: true, directionNom: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(divisions.map(serializeDivision));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur listing divisions';
    console.error('GET /api/divisions failed:', error);
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
    const isAdminRole = ['role-super-admin', 'role-admin', 'role-secretariat-general', 'role-chef-direction', 'role-chef-division'].includes(roleId);

    if (!isAdminRole) {
      return NextResponse.json({ ok: false, message: 'Seul un administrateur ou chef de direction/division peut créer une division.' }, { status: 403 });
    }

    const body = await req.json();
    const divisionName = typeof body.nom === 'string' && body.nom.trim() ? body.nom.trim() : 'Nouvelle Division';

    const created = await prisma.division.create({
      data: {
        id: body.id || `div-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        directionId: typeof body.directionId === 'string' && body.directionId.trim() ? body.directionId : undefined,
        directionNom: typeof body.directionNom === 'string' && body.directionNom.trim() ? body.directionNom : undefined,
        nom: divisionName,
        description: typeof body.description === 'string' ? body.description : '',
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : 'ACTIF',
      },
      select: { id: true, directionId: true, directionNom: true, nom: true, description: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'CREATE_DIVISION',
      entityType: 'Division',
      entityId: created.id,
      newValue: { nom: created.nom, directionId: created.directionId, statut: created.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeDivision(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création division';
    console.error('Division creation failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
