import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

const MOVEMENT_TYPES = ['RECRUTEMENT', 'AFFECTATION', 'MUTATION', 'TRANSFERT', 'PROMOTION', 'CHANGEMENT_FONCTION', 'MISE_A_DISPOSITION', 'SUSPENSION', 'REINTEGRATION', 'RETRAITE', 'SORTIE', 'DECES'] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
  if (!canManageAgent(user, { directionId: agent.directionId ?? undefined, directionNom: agent.directionNom ?? undefined, serviceId: agent.serviceId ?? undefined, service: agent.service ?? undefined })) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const movements = await prisma.agentMovement.findMany({
    where: { agentId: id },
    orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ ok: true, items: movements });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser(request);
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    if (!canManageAgent(user, { directionId: agent.directionId ?? undefined, directionNom: agent.directionNom ?? undefined, serviceId: agent.serviceId ?? undefined, service: agent.service ?? undefined })) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const body = await request.json();
    const type = String(body.type || '').toUpperCase();
    if (!MOVEMENT_TYPES.includes(type as (typeof MOVEMENT_TYPES)[number])) {
      return NextResponse.json({ error: 'Type de mouvement invalide.' }, { status: 400 });
    }
    if (!body.movementDate) {
      return NextResponse.json({ error: 'La date du mouvement est obligatoire.' }, { status: 400 });
    }

    const movement = await prisma.agentMovement.create({
      data: {
        agentId: id,
        type,
        previousSituation: body.previousSituation || null,
        newSituation: body.newSituation || null,
        movementDate: new Date(body.movementDate),
        reference: body.reference || null,
        documentUrl: body.documentUrl || null,
        userId: user.id,
        comment: body.comment || null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_MOVEMENT',
      entityType: 'AgentMovement',
      entityId: movement.id,
      newValue: { type: movement.type, movementDate: movement.movementDate, reference: movement.reference },
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ ok: true, item: movement }, { status: 201 });
  } catch (error) {
    console.error('POST /api/agents/[id]/movements failed:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer le mouvement.' }, { status: 400 });
  }
}
