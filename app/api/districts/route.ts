import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dbStore } from '@/lib/dataStore';
import { getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function serializeProvince(province: {
  id: string;
  nom: string;
  statut: string | null;
  createdAt: Date | null;
}) {
  return {
    id: province.id,
    nom: province.nom,
    statut: province.statut ?? 'ACTIF',
    createdAt: province.createdAt ? province.createdAt.toISOString() : null,
  };
}

export async function GET() {
  try {
    const provinces = await prisma.province.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, nom: true, statut: true, createdAt: true },
    });

    return NextResponse.json(provinces.map((province) => ({
      id: province.id,
      nom: province.nom,
      statut: province.statut ?? 'ACTIF',
      createdAt: province.createdAt ? province.createdAt.toISOString() : null,
    })));
  } catch (error) {
    console.error('GET /api/districts failed, falling back to memory data:', error);
    return NextResponse.json(dbStore.districts);
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
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut créer un district.' }, { status: 403 });
    }

    const body = await req.json();
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    if (!nom) {
      return NextResponse.json({ error: 'Le nom du district est obligatoire.' }, { status: 400 });
    }

    const created = await prisma.province.create({
      data: {
        id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `dist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom,
        statut: typeof body.statut === 'string' && body.statut.trim() ? body.statut : 'ACTIF',
      },
      select: { id: true, nom: true, statut: true, createdAt: true },
    });

    await writeAuditLog({
      userId: serverUser.id,
      action: 'CREATE_PROVINCE',
      entityType: 'Province',
      entityId: created.id,
      newValue: { nom: created.nom, statut: created.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(serializeProvince(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création district';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
