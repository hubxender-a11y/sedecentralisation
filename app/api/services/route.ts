import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerUser } from '@/lib/serverAuth';

async function ensureDivisionForDirection(directionId: string, fallbackName?: string) {
  const direction = await prisma.direction.findUnique({ where: { id: directionId } });
  const divisionId = direction?.id ?? directionId;

  let division = await prisma.division.findUnique({ where: { id: divisionId } });

  if (!division) {
    division = await prisma.division.create({
      data: {
        id: divisionId,
        nom: direction?.nom ?? fallbackName ?? 'Nouvelle division',
        description: direction?.description ?? '',
        statut: direction?.statut ?? 'ACTIF',
      },
    });
  }

  return division;
}

function serializeService(service: {
  id: string;
  nom: string;
  directionId?: string | null;
  directionNom?: string | null;
  divisionId: string | null;
  divisionNom: string | null;
  codeService: string | null;
  description: string | null;
  chefService: string | null;
  statut: string;
  createdAt: Date;
}) {
  return {
    id: service.id,
    nom: service.nom,
    directionId: service.directionId ?? '',
    directionNom: service.directionNom ?? service.divisionNom ?? '',
    divisionId: service.divisionId ?? '',
    divisionNom: service.divisionNom ?? '',
    codeService: service.codeService ?? '',
    description: service.description ?? '',
    chefService: service.chefService ?? '',
    statut: service.statut,
    createdAt: service.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const serverUser = await getServerUser(req);
    const { searchParams } = new URL(req.url);
    const requestedDirectionId = searchParams.get('directionId');
    const divisionId = searchParams.get('divisionId');
    const isGlobalAdmin = serverUser && ['role-super-admin', 'role-admin'].includes(String(serverUser.roleId));
    const directionId = !isGlobalAdmin && serverUser?.directionId
      ? serverUser.directionId
      : requestedDirectionId;
    const direction = directionId
      ? await prisma.direction.findUnique({ select: { id: true, nom: true }, where: { id: directionId } })
      : null;
    const directionName = direction?.nom || '';
    const directionDivisions = directionId
      ? await prisma.division.findMany({ where: { directionId }, select: { id: true, nom: true } })
      : [];

    const services = await prisma.service.findMany({
      where: directionId || divisionId
        ? {
            ...(directionId
              ? {
                  OR: [
                    { directionId },
                    ...(directionName ? [{ directionNom: directionName }, { divisionNom: directionName }] : []),
                    ...directionDivisions.flatMap((division) => [{ divisionId: division.id }, { divisionNom: division.nom }]),
                  ],
                }
              : {}),
            ...(divisionId ? { divisionId } : {}),
          }
        : undefined,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nom: true,
        directionId: true,
        directionNom: true,
        divisionId: true,
        divisionNom: true,
        codeService: true,
        description: true,
        chefService: true,
        statut: true,
        createdAt: true,
      },
    });

    return NextResponse.json(services.map(serializeService));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur listing services';
    console.error('GET /api/services failed:', error);
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
      return NextResponse.json({ ok: false, message: 'Seul un administrateur peut créer un bureau.' }, { status: 403 });
    }

    const body = await req.json();
    const directionId = typeof body.directionId === 'string' ? body.directionId : undefined;
    const directionNom = typeof body.directionNom === 'string' ? body.directionNom : undefined;
    const divisionId = typeof body.divisionId === 'string' && body.divisionId.trim() ? body.divisionId : undefined;

    if (!body.nom) {
      return NextResponse.json(
        { error: 'Le nom du bureau est obligatoire' },
        { status: 400 }
      );
    }

    let division = divisionId
      ? await prisma.division.findUnique({ where: { id: divisionId } })
      : null;

    if (!division && typeof body.divisionNom === 'string') {
      division = await prisma.division.findFirst({ where: { nom: body.divisionNom } });
    }

    if (!division && typeof body.directionId === 'string') {
      division = await ensureDivisionForDirection(body.directionId, body.divisionNom || directionNom || body.nom);
    }

    const created = await prisma.service.create({
      data: {
        id: body.id || `srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom: body.nom,
        directionId: directionId || undefined,
        directionNom: directionNom || undefined,
        divisionId: division?.id || divisionId || undefined,
        divisionNom: division?.nom || body.divisionNom || body.nom,
        codeService: body.codeService || `SRV-${Math.floor(Math.random() * 900 + 100)}`,
        description: body.description || '',
        chefService: body.chefService || '',
        statut: body.statut || 'ACTIF',
      },
      select: {
        id: true,
        nom: true,
        directionId: true,
        directionNom: true,
        divisionId: true,
        divisionNom: true,
        codeService: true,
        description: true,
        chefService: true,
        statut: true,
        createdAt: true,
      },
    });

    return NextResponse.json(serializeService(created), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création du bureau';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
