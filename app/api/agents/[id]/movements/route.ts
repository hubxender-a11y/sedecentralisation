import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

const MOVEMENT_TYPES = ['RECRUTEMENT', 'AFFECTATION', 'MUTATION', 'TRANSFERT', 'PROMOTION', 'CHANGEMENT_FONCTION', 'MISE_A_DISPOSITION', 'SUSPENSION', 'REINTEGRATION', 'RETRAITE', 'SORTIE', 'DECES'] as const;

function normalizeText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

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

    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.agentMovement.create({
        data: {
          agentId: id,
          type,
          previousSituation: normalizeText(body.previousSituation),
          newSituation: normalizeText(body.newSituation),
          movementDate: new Date(body.movementDate),
          reference: normalizeText(body.reference),
          documentUrl: normalizeText(body.documentUrl),
          userId: user.id,
          comment: normalizeText(body.comment),
        },
      });

      const syncableTypes = ['AFFECTATION', 'MUTATION', 'TRANSFERT', 'PROMOTION', 'CHANGEMENT_FONCTION', 'MISE_A_DISPOSITION'];
      if (syncableTypes.includes(type) && body.newSituation) {
        const parsed = typeof body.newSituation === 'string' ? JSON.parse(body.newSituation) : body.newSituation;
        const nextDirectionId = typeof parsed?.directionId === 'string' ? parsed.directionId : agent.directionId;
        const nextDirectionName = typeof parsed?.directionNom === 'string' ? parsed.directionNom : agent.directionNom;
        const nextServiceId = typeof parsed?.serviceId === 'string' ? parsed.serviceId : agent.serviceId;
        const nextServiceName = typeof parsed?.service === 'string' ? parsed.service : agent.service;
        const nextDivisionId = typeof parsed?.divisionId === 'string' ? parsed.divisionId : agent.divisionId;
        const nextDivisionName = typeof parsed?.divisionNom === 'string' ? parsed.divisionNom : agent.divisionNom;
        const nextFunctionId = typeof parsed?.fonctionId === 'string' ? parsed.fonctionId : agent.fonctionId;
        const nextFunctionName = typeof parsed?.fonctionNom === 'string' ? parsed.fonctionNom : agent.fonctionNom;

        await tx.agent.update({
          where: { id },
          data: {
            directionId: nextDirectionId,
            directionNom: nextDirectionName,
            divisionId: nextDivisionId,
            divisionNom: nextDivisionName,
            serviceId: nextServiceId,
            service: nextServiceName,
            fonctionId: nextFunctionId,
            fonctionNom: nextFunctionName,
          },
        });
      }

      return created;
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
