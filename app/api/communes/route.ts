import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeCommune(commune: {
  id: string;
  nom: string;
  villeId: string | null;
  statut: string | null;
  createdAt: Date | null;
}) {
  return {
    id: commune.id,
    nom: commune.nom,
    villeId: commune.villeId ?? '',
    statut: commune.statut ?? 'ACTIF',
    createdAt: commune.createdAt ? commune.createdAt.toISOString() : null,
  };
}

export async function GET() {
  try {
    const communes = await prisma.commune.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, nom: true, villeId: true, statut: true, createdAt: true },
    });

    return NextResponse.json(communes.map((commune) => ({
      id: commune.id,
      nom: commune.nom,
      villeId: commune.villeId,
      statut: commune.statut ?? 'ACTIF',
      createdAt: commune.createdAt ? commune.createdAt.toISOString() : null,
    })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur listing communes';
    console.error('GET /api/communes failed:', error);
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
    const isAdminRole = ['role-super-admin', 'role-admin', 'role-secretariat-general'].includes(roleId);

    if (!isAdminRole) {
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut créer une commune.' }, { status: 403 });
    }

    const body = await req.json();
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const villeId = typeof body.villeId === 'string' ? body.villeId.trim() : '';

    if (!nom || !villeId) {
      return NextResponse.json({ error: 'Le nom et la ville sont obligatoires.' }, { status: 400 });
    }

    const created = await prisma.commune.create({
      data: {
        id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `com-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom,
        villeId,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : 'ACTIF',
      },
      select: { id: true, nom: true, villeId: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'CREATE_COMMUNE',
      entityType: 'Commune',
      entityId: created.id,
      newValue: { nom: created.nom, villeId: created.villeId, statut: created.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeCommune(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création commune';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
