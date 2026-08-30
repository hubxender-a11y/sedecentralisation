import { NextRequest, NextResponse } from 'next/server';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { createAgentsInTransaction } from '@/lib/dbService';
import prisma from '@/lib/prisma';
import type { Agent } from '@/lib/dataStore';

interface AgentImportRow {
  nom: string;
  postNom?: string;
  prenom: string;
  sexe?: string;
  matricule?: string;
  directionId?: string;
  directionNom?: string;
  serviceId?: string;
  service?: string;
  email?: string;
  telephone?: string;
  provinceId?: string;
  districtId?: string;
  dateNaissance?: string;
}

export async function POST(request: NextRequest) {
  try {
    const serverUser = await getServerUser(request);
    if (!serverUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await request.json();
    const agents = Array.isArray(payload?.agents) ? payload.agents as AgentImportRow[] : [];

    if (agents.length === 0) {
      return NextResponse.json({ error: 'Aucun agent à importer' }, { status: 400 });
    }

    const matricules = agents
      .map((row) => String(row.matricule || '').trim())
      .filter(Boolean);
    const duplicateMatricules = new Set(matricules.filter((matricule, index) => matricules.indexOf(matricule) !== index));
    const existingAgents = duplicateMatricules.size > 0 || matricules.length > 0
      ? await prisma.agent.findMany({ where: { matricule: { in: Array.from(new Set(matricules)) } }, select: { matricule: true } })
      : [];
    const existingMatricules = new Set(existingAgents.map((agent) => String(agent.matricule)));
    const skipped: Array<{ row: number; reason: string }> = [];
    const acceptedMatricules = new Set<string>();

    const agentsToCreate: Array<Omit<Agent, 'id' | 'createdAt'> & { id?: string }> = [];
    for (const [index, row] of agents.entries()) {
      const normalizedNom = String(row.nom || '').trim();
      const normalizedPrenom = String(row.prenom || '').trim();
      const normalizedEmail = String(row.email || '').trim();

      if (!normalizedNom && !normalizedPrenom && !normalizedEmail) {
        skipped.push({ row: index + 1, reason: 'Ligne vide' });
        continue;
      }

      const matricule = String(row.matricule || '').trim();
      if (matricule && (duplicateMatricules.has(matricule) || existingMatricules.has(matricule) || acceptedMatricules.has(matricule))) {
        skipped.push({ row: index + 1, reason: `Matricule déjà utilisé: ${matricule}` });
        continue;
      }

      const fallbackName = normalizedPrenom || normalizedNom;
      const fallbackLastName = normalizedNom || normalizedPrenom || 'Agent';

      if (!canManageAgent(serverUser, {
        directionId: serverUser.directionId || row.directionId,
        serviceId: row.serviceId,
        service: row.service || row.directionNom,
      })) {
        continue;
      }

      agentsToCreate.push({
        id: `ag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom: normalizedNom || fallbackLastName,
        postNom: row.postNom || '',
        prenom: normalizedPrenom || fallbackName,
        dateNaissance: row.dateNaissance,
        sexe: row.sexe,
        nationalite: 'Congolaise',
        matricule: row.matricule,
        typeCarte: undefined,
        numeroCarte: undefined,
        expirationCarte: undefined,
        lieuDelivrance: undefined,
        directionId: serverUser.directionId || row.directionId,
        directionNom: row.directionNom,
        serviceId: row.serviceId,
        service: row.service || row.directionNom,
        fonctionId: undefined,
        fonctionNom: undefined,
        email: normalizedEmail || undefined,
        telephone: row.telephone || '',
        provinceId: row.provinceId || row.districtId,
        districtId: row.districtId || row.provinceId,
        villeId: undefined,
        communeId: undefined,
        avenue: undefined,
        code: undefined,
        statut: 'BROUILLON',
        statutPaiement: 'NON_PAYE',
        montantPaiement: 0,
      });
      if (matricule) acceptedMatricules.add(matricule);
    }

    const createdAgents = await createAgentsInTransaction(agentsToCreate);

    return NextResponse.json({ ok: true, imported: createdAgents.length, skipped, agents: createdAgents });
  } catch (error) {
    console.error('Agent import failed', error);
    return NextResponse.json({ error: 'Erreur import agent' }, { status: 500 });
  }
}
