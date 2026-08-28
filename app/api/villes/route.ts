import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dbStore } from '@/lib/dataStore';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeVille(ville: {
  id: string;
  nom: string;
  provinceId: string | null;
  statut: string | null;
  createdAt: Date | null;
}) {
  return {
    id: ville.id,
    nom: ville.nom,
    provinceId: ville.provinceId ?? '',
    districtId: ville.provinceId ?? '',
    statut: ville.statut ?? 'ACTIF',
    createdAt: ville.createdAt ? ville.createdAt.toISOString() : null,
  };
}

export async function GET() {
  try {
    const villes = await prisma.ville.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, nom: true, provinceId: true, statut: true, createdAt: true },
    });

    return NextResponse.json(villes.map((ville) => ({
      id: ville.id,
      nom: ville.nom,
      provinceId: ville.provinceId,
      districtId: ville.provinceId,
      statut: ville.statut ?? 'ACTIF',
      createdAt: ville.createdAt ? ville.createdAt.toISOString() : null,
    })));
  } catch (error) {
    console.error('GET /api/villes failed, falling back to memory data:', error);
    return NextResponse.json(dbStore.villes);
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
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut créer une ville.' }, { status: 403 });
    }

    const body = await req.json();
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const provinceId = typeof body.provinceId === 'string' ? body.provinceId.trim() : (typeof body.districtId === 'string' ? body.districtId.trim() : '');

    if (!nom || !provinceId) {
      return NextResponse.json({ error: 'Le nom et le district/province sont obligatoires.' }, { status: 400 });
    }

    const created = await prisma.ville.create({
      data: {
        id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `vil-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom,
        provinceId,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : 'ACTIF',
      },
      select: { id: true, nom: true, provinceId: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'CREATE_VILLE',
      entityType: 'Ville',
      entityId: created.id,
      newValue: { nom: created.nom, provinceId: created.provinceId, statut: created.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeVille(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création ville';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
