import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

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

    const assignment = await prisma.agentAssignment.create({
      data: {
        agentId: id,
        previousDirectionId: agent.directionId,
        previousDirectionName: agent.directionNom,
        previousDivisionId: agent.divisionId,
        previousDivisionName: agent.divisionNom,
        previousServiceId: agent.serviceId,
        previousServiceName: agent.service,
        newDirectionId: body.newDirectionId || agent.directionId,
        newDirectionName: body.newDirectionName || agent.directionNom,
        newDivisionId: body.newDivisionId || agent.divisionId,
        newDivisionName: body.newDivisionName || agent.divisionNom,
        newServiceId: body.newServiceId || agent.serviceId,
        newServiceName: body.newServiceName || agent.service,
        functionId: body.functionId || agent.fonctionId,
        functionName: body.functionName || agent.fonctionNom,
        province: body.province || null,
        city: body.city || null,
        commune: body.commune || null,
        effectiveDate: new Date(body.effectiveDate),
        reason: String(body.reason).trim(),
        documentReference: body.documentReference || null,
        responsibleUserId: user.id,
        status: body.status || 'BROUILLON',
        observations: body.observations || null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_ASSIGNMENT',
      entityType: 'AgentAssignment',
      entityId: assignment.id,
      oldValue: { directionId: agent.directionId, divisionId: agent.divisionId, serviceId: agent.serviceId },
      newValue: { directionId: assignment.newDirectionId, divisionId: assignment.newDivisionId, serviceId: assignment.newServiceId },
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ ok: true, item: assignment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/agents/[id]/assignments failed:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer l’affectation.' }, { status: 400 });
  }
}
