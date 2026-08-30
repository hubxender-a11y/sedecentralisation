import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

function normalizeOptional(value: unknown): string | null {
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

  const assignments = await prisma.agentAssignment.findMany({
    where: { agentId: id },
    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ ok: true, items: assignments });
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
    if (!body.effectiveDate || !String(body.reason || '').trim()) {
      return NextResponse.json({ error: 'La date d’effet et le motif sont obligatoires.' }, { status: 400 });
    }

    const newDirectionId = normalizeOptional(body.newDirectionId) || agent.directionId;
    const newDirectionName = normalizeOptional(body.newDirectionName) || agent.directionNom;
    const newDivisionId = normalizeOptional(body.newDivisionId) || agent.divisionId;
    const newDivisionName = normalizeOptional(body.newDivisionName) || agent.divisionNom;
    const newServiceId = normalizeOptional(body.newServiceId) || agent.serviceId;
    const newServiceName = normalizeOptional(body.newServiceName) || agent.service;
    const functionId = normalizeOptional(body.functionId) || agent.fonctionId;
    const functionName = normalizeOptional(body.functionName) || agent.fonctionNom;
    const status = normalizeOptional(body.status) || 'BROUILLON';

    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.agentAssignment.create({
        data: {
          agentId: id,
          previousDirectionId: agent.directionId,
          previousDirectionName: agent.directionNom,
          previousDivisionId: agent.divisionId,
          previousDivisionName: agent.divisionNom,
          previousServiceId: agent.serviceId,
          previousServiceName: agent.service,
          newDirectionId,
          newDirectionName,
          newDivisionId,
          newDivisionName,
          newServiceId,
          newServiceName,
          functionId,
          functionName,
          province: normalizeOptional(body.province),
          city: normalizeOptional(body.city),
          commune: normalizeOptional(body.commune),
          effectiveDate: new Date(body.effectiveDate),
          reason: String(body.reason).trim(),
          documentReference: normalizeOptional(body.documentReference),
          responsibleUserId: user.id,
          status,
          observations: normalizeOptional(body.observations),
        },
      });

      const changedAgentState =
        agent.directionId !== newDirectionId ||
        agent.directionNom !== newDirectionName ||
        agent.divisionId !== newDivisionId ||
        agent.divisionNom !== newDivisionName ||
        agent.serviceId !== newServiceId ||
        agent.service !== newServiceName ||
        agent.fonctionId !== functionId ||
        agent.fonctionNom !== functionName;

      if (changedAgentState) {
        await tx.agent.update({
          where: { id },
          data: {
            directionId: newDirectionId,
            directionNom: newDirectionName,
            divisionId: newDivisionId,
            divisionNom: newDivisionName,
            serviceId: newServiceId,
            service: newServiceName,
            fonctionId: functionId,
            fonctionNom: functionName,
          },
        });
      }

      await tx.agentMovement.create({
        data: {
          agentId: id,
          type: 'AFFECTATION',
          previousSituation: JSON.stringify({
            directionId: agent.directionId,
            divisionId: agent.divisionId,
            serviceId: agent.serviceId,
            functionId: agent.fonctionId,
          }),
          newSituation: JSON.stringify({
            directionId: newDirectionId,
            divisionId: newDivisionId,
            serviceId: newServiceId,
            functionId,
          }),
          movementDate: new Date(body.effectiveDate),
          reference: normalizeOptional(body.documentReference) ?? `AFFECT-${assignment.id}`,
          userId: user.id,
          comment: String(body.reason).trim(),
        },
      });

      return assignment;
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_ASSIGNMENT',
      entityType: 'AgentAssignment',
      entityId: result.id,
      oldValue: { directionId: agent.directionId, divisionId: agent.divisionId, serviceId: agent.serviceId },
      newValue: { directionId: result.newDirectionId, divisionId: result.newDivisionId, serviceId: result.newServiceId },
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ ok: true, item: result }, { status: 201 });
  } catch (error) {
    console.error('POST /api/agents/[id]/assignments failed:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer l’affectation.' }, { status: 400 });
  }
}
