import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAgents } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekday(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function isWithinPointageWindow(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 7 * 60 && minutes <= 9 * 60 + 30;
}

function pointageStatus(date: Date) {
  if (!isWeekday(date)) return 'Le pointage est fermé le samedi et le dimanche.';
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 7 * 60) return 'Le pointage ouvrira à 07h00.';
  if (minutes > 9 * 60 + 30) return 'La période de pointage est clôturée depuis 09h30.';
  return 'Le pointage est ouvert jusqu’à 09h30.';
}

function agentMatchesBureau(
  agent: { serviceId?: string; service?: string; divisionId?: string; divisionNom?: string },
  serviceId: string,
  serviceNom: string,
) {
  if (!serviceId && !serviceNom) return true;
  return Boolean(
    (serviceId && agent.serviceId === serviceId) ||
    (serviceNom && (agent.service === serviceNom || agent.divisionNom === serviceNom)) ||
    (serviceId && agent.divisionId === serviceId)
  );
}

export async function GET(req: NextRequest) {
  const user = await getServerUser(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const url = req.nextUrl;
  const date = url.searchParams.get('date') || localDate(new Date());
  const serviceId = url.searchParams.get('serviceId') || '';
  const serviceNom = url.searchParams.get('serviceNom') || '';
  const directionId = url.searchParams.get('directionId') || '';
  const search = (url.searchParams.get('search') || '').trim().toLowerCase();

  const selectedService = serviceId
    ? await prisma.service.findUnique({ select: { id: true, nom: true }, where: { id: serviceId } })
    : null;
  const selectedDirection = directionId
    ? await prisma.direction.findUnique({ select: { id: true, nom: true }, where: { id: directionId } })
    : null;
  const directionDivisions = directionId
    ? await prisma.division.findMany({
        where: { directionId },
        select: { id: true, nom: true },
      })
    : [];
  const directionValues = [directionId, selectedDirection?.nom || '']
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const resolvedServiceNom = serviceNom || selectedService?.nom || '';

  const agents = (await getAgents()).filter((agent) => {
    if (!canManageAgent(user, agent)) return false;
    if (agent.statut === 'REJETE') return false;
    if (directionValues.length > 0) {
      const agentDirectionValues = [agent.directionId, agent.directionNom, agent.divisionId, agent.divisionNom]
        .map((value) => String(value || '').trim().toLowerCase());
      const divisionValues = directionDivisions.flatMap((division) => [division.id, division.nom])
        .map((value) => value.trim().toLowerCase());
      if (!directionValues.some((value) => agentDirectionValues.includes(value)) &&
          !divisionValues.some((value) => agentDirectionValues.includes(value))) return false;
    }
    if (!agentMatchesBureau(agent, serviceId, resolvedServiceNom)) return false;
    if (!search) return true;
    const fullName = `${agent.nom} ${agent.postNom || ''} ${agent.prenom}`.toLowerCase();
    return fullName.includes(search) || String(agent.matricule || '').toLowerCase().includes(search);
  });

  const presences = await prisma.presence.findMany({
    where: { date, agentId: { in: agents.map((agent) => agent.id) } },
    select: { id: true, agentId: true, date: true, heure: true, serviceId: true, serviceNom: true },
    orderBy: { heure: 'asc' },
  });
  const presenceByAgent = new Map(presences.map((presence) => [presence.agentId, presence]));

  const now = new Date();
  return NextResponse.json({
    date,
    pointageOuvert: isWeekday(now) && isWithinPointageWindow(now),
    pointageMessage: pointageStatus(now),
    agents: agents.map((agent) => ({
      ...agent,
      presence: presenceByAgent.get(agent.id) || null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getServerUser(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const now = new Date();
  if (!isWeekday(now)) {
    return NextResponse.json({ error: 'Le pointage est fermé le samedi et le dimanche.' }, { status: 400 });
  }
  if (!isWithinPointageWindow(now)) {
    return NextResponse.json({ error: 'Le pointage est ouvert du lundi au vendredi, de 07h00 à 09h30.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const agentId = typeof body.agentId === 'string' ? body.agentId : '';
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : '';
  const serviceNom = typeof body.serviceNom === 'string' ? body.serviceNom : '';
  if (!agentId) return NextResponse.json({ error: 'Agent requis.' }, { status: 400 });

  const agent = (await getAgents()).find((item) => item.id === agentId);
  if (!agent || !canManageAgent(user, agent)) {
    return NextResponse.json({ error: 'Agent introuvable ou accès refusé.' }, { status: 404 });
  }
  if (agent.statut === 'REJETE' || agent.statutPresence === 'INACTIF') {
    return NextResponse.json({ error: 'Cet agent ne peut pas être pointé.' }, { status: 400 });
  }
  const selectedService = serviceId
    ? await prisma.service.findUnique({ select: { id: true, nom: true }, where: { id: serviceId } })
    : null;
  if (!agentMatchesBureau(agent, serviceId, serviceNom || selectedService?.nom || '')) {
    return NextResponse.json({ error: 'L’agent ne appartient pas au bureau sélectionné.' }, { status: 400 });
  }

  const date = localDate(now);
  try {
    const presence = await prisma.presence.create({
      data: {
        agentId,
        date,
        heure: now,
        serviceId: agent.serviceId || serviceId || undefined,
        serviceNom: agent.service || serviceNom || undefined,
        directionId: agent.directionId,
        directionNom: agent.directionNom,
        createdBy: user.id,
      },
      select: { id: true, agentId: true, date: true, heure: true, serviceId: true, serviceNom: true },
    });
    return NextResponse.json({ ok: true, presence }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Cet agent est déjà pointé aujourd’hui.' }, { status: 409 });
    }
    console.error('POST /api/presences failed:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer le pointage.' }, { status: 500 });
  }
}