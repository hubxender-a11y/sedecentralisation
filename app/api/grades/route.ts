import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';

function serializeGrade(grade: {
  id: string;
  nom: string;
  description: string | null;
  statut: string;
  createdAt: Date;
}) {
  return {
    id: grade.id,
    nom: grade.nom,
    description: grade.description ?? '',
    statut: grade.statut,
    createdAt: grade.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(grades.map(serializeGrade));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur listing grades';
    console.error('GET /api/grades failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ ok: false, message: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    // Allow super-admin and other admin roles to create grades
    const roleId = String(serverUser.roleId || '').trim();
    const isAdminRole = roleId === 'role-super-admin' || roleId === 'role-admin' || roleId === 'role-secretariat-general';

    if (!isAdminRole) {
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut créer un grade.' }, { status: 403 });
    }

    const body = await req.json();
    const created = await prisma.grade.create({
      data: {
        id: body.id || `grd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom: body.nom || 'Nouveau Grade',
        description: body.description || '',
        statut: body.statut || 'ACTIF',
      },
      select: { id: true, nom: true, description: true, statut: true, createdAt: true },
    });

    return NextResponse.json(serializeGrade(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création grade';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
