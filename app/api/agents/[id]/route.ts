import { NextRequest, NextResponse } from 'next/server';
import { deleteAgent, getAgentById, getDirectionById, getFonctionById, getServiceById, updateAgent } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverUser = await getServerUser(req);
  const { id } = await params;
  const agent = await getAgentById(id);

  if (!agent) {
    return NextResponse.json({ error: 'Agent non trouvé' }, { status: 404 });
  }

  if (!canManageAgent(serverUser, agent)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  return NextResponse.json(agent);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingAgent = await getAgentById(id);
    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent non trouvé' }, { status: 404 });
    }

    if (!canManageAgent(serverUser, existingAgent)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const requestedPresenceStatus = body.statutPresence === 'ACTIF' || body.statutPresence === 'INACTIF'
      ? body.statutPresence
      : undefined;
    const isReactivation = existingAgent.statutPresence === 'INACTIF' && requestedPresenceStatus === 'ACTIF';
    const isPresenceAdmin = ['role-super-admin', 'role-admin', 'role-secretariat-general'].includes(String(serverUser.roleId));
    const reactivationReason = typeof body.presenceReactivationReason === 'string'
      ? body.presenceReactivationReason.trim()
      : '';

    if (isReactivation && !isPresenceAdmin) {
      return NextResponse.json({ error: 'Seul un administrateur peut réactiver cet agent.' }, { status: 403 });
    }
    if (isReactivation && reactivationReason.length < 5) {
      return NextResponse.json({ error: 'Une raison d’au moins 5 caractères est obligatoire pour réactiver cet agent.' }, { status: 400 });
    }

    const directionId = typeof body.directionId === 'string'
      ? body.directionId
      : undefined;

    const serviceId = typeof body.serviceId === 'string'
      ? body.serviceId
      : typeof body.divisionId === 'string'
      ? body.divisionId
      : undefined;

    let resolvedDirectionId = directionId;
    const serviceObj = serviceId
      ? await getServiceById(serviceId)
      : undefined;

    if (!resolvedDirectionId && serviceObj) {
      resolvedDirectionId = serviceObj.directionId;
    }

    if (serverUser.directionId) {
      if (resolvedDirectionId && resolvedDirectionId !== serverUser.directionId) {
        return NextResponse.json({ error: 'Vous ne pouvez déplacer un agent que dans votre propre direction.' }, { status: 403 });
      }
      resolvedDirectionId = serverUser.directionId;
    }

    const directionObj = resolvedDirectionId
      ? await getDirectionById(resolvedDirectionId)
      : undefined;
    const fonctionObj = body.fonctionId
      ? await getFonctionById(String(body.fonctionId))
      : undefined;

    if (resolvedDirectionId && !directionObj) {
      return NextResponse.json({ error: 'Direction introuvable' }, { status: 400 });
    }
    if (body.fonctionId && !fonctionObj) {
      return NextResponse.json({ error: 'Fonction introuvable' }, { status: 400 });
    }
    if (serviceId && !serviceObj) {
      return NextResponse.json({ error: 'Bureau introuvable' }, { status: 400 });
    }
    if (serviceObj && resolvedDirectionId && serviceObj.directionId !== resolvedDirectionId) {
      return NextResponse.json({ error: 'Le bureau sélectionné doit appartenir à la division choisie.' }, { status: 400 });
    }

    const updates = {
      statut: typeof body.statut === 'string' ? body.statut : undefined,
      statutPresence: (requestedPresenceStatus === 'INACTIF'
        ? 'INACTIF'
        : requestedPresenceStatus === 'ACTIF'
        ? 'ACTIF'
        : undefined) as 'ACTIF' | 'INACTIF' | undefined,
      presenceInactiveAt: requestedPresenceStatus === 'ACTIF' ? null : existingAgent.presenceInactiveAt,
      presenceInactiveReason: requestedPresenceStatus === 'ACTIF' ? reactivationReason : undefined,
      presenceReactivatedAt: isReactivation ? new Date().toISOString() : undefined,
      presenceReactivatedBy: isReactivation ? serverUser.id : undefined,
      statutPaiement: typeof body.statutPaiement === 'string' ? body.statutPaiement : undefined,
      montantPaiement: typeof body.montantPaiement === 'number' ? body.montantPaiement : undefined,
      prime: typeof body.prime === 'string' ? body.prime : undefined,
      montantPrime: typeof body.montantPrime === 'number' ? body.montantPrime : undefined,
      datePaiement: typeof body.datePaiement === 'string' ? body.datePaiement : undefined,
      nom: typeof body.nom === 'string' ? body.nom : undefined,
      postNom: typeof body.postNom === 'string' ? body.postNom : undefined,
      prenom: typeof body.prenom === 'string' ? body.prenom : undefined,
      dateNaissance: typeof body.dateNaissance === 'string' ? body.dateNaissance : undefined,
      dateEngagement: typeof body.dateEngagement === 'string' ? body.dateEngagement : undefined,
      acteEngagement: typeof body.acteEngagement === 'string' ? body.acteEngagement : undefined,
      remunerer: typeof body.remunerer === 'string' ? body.remunerer : undefined,
      provinceId: typeof body.provinceId === 'string' && body.provinceId.trim() ? body.provinceId.trim() : (typeof body.districtId === 'string' && body.districtId.trim() ? body.districtId.trim() : undefined),
      districtId: typeof body.districtId === 'string' && body.districtId.trim() ? body.districtId.trim() : (typeof body.provinceId === 'string' && body.provinceId.trim() ? body.provinceId.trim() : undefined),
      villeId: typeof body.villeId === 'string' ? body.villeId : undefined,
      communeId: typeof body.communeId === 'string' ? body.communeId : undefined,
      avenue: typeof body.avenue === 'string' ? body.avenue : undefined,
      code: typeof body.code === 'string' ? body.code : undefined,
      fonctionId: typeof body.fonctionId === 'string' ? body.fonctionId : undefined,
      directionId: resolvedDirectionId ?? existingAgent.directionId,
      directionNom: directionObj ? directionObj.nom : existingAgent.directionNom,
      serviceId: serviceId ?? existingAgent.serviceId,
      service: serviceObj ? serviceObj.nom : body.service ?? existingAgent.service,
      fonctionNom: fonctionObj ? fonctionObj.nom : existingAgent.fonctionNom,
    };

    const updatedAgent = await updateAgent(id, updates);

    if (!updatedAgent) {
      return NextResponse.json({ error: 'Impossible de mettre à jour l\'agent' }, { status: 500 });
    }

    await writeAuditLog({
      userId: serverUser.id,
      action: 'UPDATE_AGENT',
      entityType: 'Agent',
      entityId: id,
      oldValue: { statut: existingAgent.statut, directionId: existingAgent.directionId, serviceId: existingAgent.serviceId },
      newValue: { statut: updatedAgent.statut, directionId: updatedAgent.directionId, serviceId: updatedAgent.serviceId },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(updatedAgent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur mise à jour';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverUser = await getServerUser(req);
  if (!serverUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;
  const agent = await getAgentById(id);
  if (!agent) {
    return NextResponse.json({ error: 'Agent non trouvé' }, { status: 404 });
  }

  if (!canManageAgent(serverUser, agent)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  await deleteAgent(id);
  await writeAuditLog({
    userId: serverUser.id,
    action: 'ARCHIVE_AGENT',
    entityType: 'Agent',
    entityId: id,
    oldValue: { statut: agent.statut },
    ipAddress: getRequestIp(req),
  });
  return NextResponse.json({ success: true });
}
