import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  const user = await getServerUser(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const rows = await prisma.presence.findMany({
      orderBy: [{ date: 'desc' }, { heure: 'asc' }],
      include: { agent: true },
    });
    const divisions = await prisma.division.findMany({
      select: { id: true, nom: true, directionId: true, directionNom: true },
    });
    const divisionById = new Map(divisions.map((division) => [division.id, division]));
    const divisionByName = new Map(divisions.map((division) => [division.nom.trim().toLowerCase(), division]));
    const directions = await prisma.direction.findMany({ select: { id: true, nom: true } });
    const directionById = new Map(directions.map((direction) => [direction.id, direction]));
    const directionByName = new Map(directions.map((direction) => [direction.nom.trim().toLowerCase(), direction]));
    const services = await prisma.service.findMany({
      select: { id: true, nom: true, directionId: true, directionNom: true, divisionId: true, divisionNom: true },
    });
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const serviceByName = new Map(services.map((service) => [service.nom.trim().toLowerCase(), service]));
    const groups = new Map<string, {
      date: string;
      directionId: string;
      directionNom: string;
      serviceId: string;
      serviceNom: string;
      bureaux: string[];
      total: number;
      firstHour: Date;
      lastHour: Date;
    }>();

    for (const row of rows) {
      if (!canManageAgent(user, row.agent as any)) continue;
      const serviceId = row.serviceId || '';
      const serviceNom = row.serviceNom || row.agent.service || 'Tous les bureaux';
      const service = serviceById.get(serviceId) || serviceByName.get(serviceNom.trim().toLowerCase());
      const division = (row.agent.divisionId ? divisionById.get(row.agent.divisionId) : undefined) ||
        (row.agent.divisionNom ? divisionByName.get(row.agent.divisionNom.trim().toLowerCase()) : undefined) ||
        (service?.divisionId ? divisionById.get(service.divisionId) : undefined) ||
        (service?.divisionNom ? divisionByName.get(service.divisionNom.trim().toLowerCase()) : undefined);
      const legacyDirectionId = row.directionId || row.agent.directionId || service?.directionId || '';
      const legacyDirectionName = row.directionNom || row.agent.directionNom || service?.directionNom || '';
      const legacyDirection = directionById.get(legacyDirectionId) || directionByName.get(legacyDirectionId.trim().toLowerCase()) || directionByName.get(legacyDirectionName.trim().toLowerCase());
      const directionId = division?.directionId || service?.directionId || legacyDirection?.id || legacyDirectionId;
      const directionNom = division?.directionNom || service?.directionNom || legacyDirection?.nom || directionById.get(directionId)?.nom || legacyDirectionName || 'Direction non renseignée';
      const key = `${row.date}|${directionId}|${directionNom}`;
      const existing = groups.get(key);
      if (existing) {
        existing.total += 1;
        if (row.heure < existing.firstHour) existing.firstHour = row.heure;
        if (row.heure > existing.lastHour) existing.lastHour = row.heure;
        if (!existing.bureaux.includes(serviceNom)) existing.bureaux.push(serviceNom);
      } else {
        groups.set(key, {
          date: row.date,
          directionId,
          directionNom,
          serviceId: '',
          serviceNom: 'Tous les bureaux',
          bureaux: [serviceNom],
          total: 1,
          firstHour: row.heure,
          lastHour: row.heure,
        });
      }
    }

    return NextResponse.json(Array.from(groups.values()));
  } catch (error) {
    console.error('GET /api/presences/journal failed:', error);
    return NextResponse.json({ error: 'Impossible de charger le journal.' }, { status: 500 });
  }
}