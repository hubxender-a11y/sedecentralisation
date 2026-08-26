import { NextRequest, NextResponse } from 'next/server';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { createAgent } from '@/lib/dbService';

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

    const createdAgents = [];
    for (const row of agents) {
      const normalizedNom = String(row.nom || '').trim();
      const normalizedPrenom = String(row.prenom || '').trim();
      const normalizedEmail = String(row.email || '').trim();

      if (!normalizedNom && !normalizedPrenom && !normalizedEmail) {
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

      const agent = await createAgent({
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
        districtId: undefined,
        villeId: undefined,
        communeId: undefined,
        avenue: undefined,
        code: undefined,
        statut: 'BROUILLON',
        statutPaiement: 'NON_PAYE',
        montantPaiement: 0,
      });
      createdAgents.push(agent);
    }

    return NextResponse.json({ ok: true, imported: createdAgents.length, agents: createdAgents });
  } catch (error) {
    console.error('Agent import failed', error);
    return NextResponse.json({ error: 'Erreur import agent' }, { status: 500 });
  }
}
