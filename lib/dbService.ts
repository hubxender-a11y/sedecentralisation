import type { Agent, DocumentRecord, Direction, Service, Fonction, Grade } from './dataStore';
import type { Prisma } from '@prisma/client';
import prisma from './prisma';

function normalizeAgent(agent: Agent): Agent {
  return {
    ...agent,
    nom:
      agent.nom && String(agent.nom).trim()
        ? String(agent.nom)
        : agent.postNom && String(agent.postNom).trim()
        ? String(agent.postNom)
        : agent.prenom && String(agent.prenom).trim()
        ? String(agent.prenom)
        : 'Agent',
    prenom: agent.prenom || '',
    telephone: agent.telephone || '',
    createdAt: typeof agent.createdAt === 'string' && agent.createdAt ? agent.createdAt : new Date().toISOString(),
  };
}

function mapPrismaAgent(r: any): Agent {
  return normalizeAgent({
    id: String(r.id),
    nom: r.nom,
    postNom: r.postNom || undefined,
    prenom: r.prenom,
    dateNaissance: r.dateNaissance || undefined,
    dateEngagement: r.dateEngagement || undefined,
    acteEngagement: r.acteEngagement || undefined,
    remunerer: (r.remunerer as Agent['remunerer']) || 'NON',
    sexe: r.sexe || undefined,
    nationalite: r.nationalite || undefined,
    matricule: r.matricule || undefined,
    typeCarte: r.typeCarte || undefined,
    numeroCarte: r.numeroCarte || undefined,
    expirationCarte: r.expirationCarte || undefined,
    lieuDelivrance: r.lieuDelivrance || undefined,
    directionId: r.directionId || r.divisionId || undefined,
    directionNom: r.directionNom || r.divisionNom || undefined,
    divisionId: r.divisionId || r.directionId || undefined,
    divisionNom: r.divisionNom || r.directionNom || undefined,
    serviceId: r.serviceId || undefined,
    service: r.service || undefined,
    gradeId: r.gradeId || undefined,
    gradeNom: r.gradeNom || undefined,
    fonctionId: r.fonctionId || undefined,
    fonctionNom: r.fonctionNom || undefined,
    email: r.email || undefined,
    telephone: r.telephone || '',
    districtId: r.districtId || undefined,
    villeId: r.villeId || undefined,
    communeId: r.communeId || undefined,
    avenue: r.avenue || undefined,
    code: r.code || undefined,
    statut: (r.statut as Agent['statut']) || 'BROUILLON',
    statutPresence: (r.statutPresence as Agent['statutPresence']) || 'ACTIF',
    presenceInactiveAt: r.presenceInactiveAt ? new Date(r.presenceInactiveAt).toISOString() : undefined,
    presenceInactiveReason: r.presenceInactiveReason || undefined,
    presenceReactivatedAt: r.presenceReactivatedAt ? new Date(r.presenceReactivatedAt).toISOString() : undefined,
    presenceReactivatedBy: r.presenceReactivatedBy || undefined,
    statutPaiement: (r.statutPaiement as Agent['statutPaiement']) || 'NON_PAYE',
    montantPaiement: r.montantPaiement || 0,
    prime: (r.prime as Agent['prime']) || 'NON',
    montantPrime: r.montantPrime || 0,
    datePaiement: r.datePaiement || undefined,
    createdAt: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt)) : new Date().toISOString(),
  });
}

export async function getAgents(): Promise<Agent[]> {
  try {
    const records = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: { presences: { orderBy: { heure: 'desc' }, take: 1 } },
    });
    const inactiveSince = new Date();
    inactiveSince.setMonth(inactiveSince.getMonth() - 2);
    const mapped = records.map(mapPrismaAgent);

    for (const [index, record] of records.entries()) {
      const lastPresence = record.presences[0];
      const activityDate = lastPresence?.heure ?? record.createdAt;
      if (
        record.statutPresence !== 'INACTIF' &&
        activityDate < inactiveSince
      ) {
        await prisma.agent.update({
          where: { id: record.id },
          data: {
            statutPresence: 'INACTIF',
            presenceInactiveAt: new Date(),
            presenceInactiveReason: 'Inactivité automatique : aucune présence enregistrée depuis deux mois.',
          },
        });
        mapped[index].statutPresence = 'INACTIF';
        mapped[index].presenceInactiveReason = 'Inactivité automatique : aucune présence enregistrée depuis deux mois.';
        mapped[index].presenceInactiveAt = new Date().toISOString();
      }
    }
    return mapped;
  } catch (e) {
    console.error('Prisma getAgents failed', e);
    return [];
  }
}

export async function getAgentById(id: string): Promise<(Agent & { documents?: DocumentRecord[] }) | null> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!agent) return null;

    return {
      ...mapPrismaAgent(agent),
      documents: agent.documents.map((d) => ({
        id: d.id,
        agentId: d.agentId,
        name: d.name,
        size: d.size,
        type: d.type,
        url: d.url,
        uploadedAt: d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : String(d.uploadedAt),
      })),
    };
  } catch (e) {
    console.error('Prisma getAgentById failed', e);
    return null;
  }
}

export async function getDirectionById(id: string): Promise<Direction | null> {
  const direction = await prisma.direction.findUnique({ where: { id } });
  if (!direction) return null;
  return {
    id: direction.id,
    nom: direction.nom,
    description: direction.description ?? undefined,
    statut: direction.statut,
    createdAt: direction.createdAt.toISOString(),
  };
}

export async function getServiceById(id: string): Promise<Service | null> {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return null;
  return {
    id: service.id,
    nom: service.nom,
    directionId: service.directionId ?? '',
    directionNom: service.directionNom ?? undefined,
    divisionId: service.divisionId ?? undefined,
    divisionNom: service.divisionNom ?? undefined,
    codeService: service.codeService ?? undefined,
    description: service.description ?? undefined,
    chefService: service.chefService ?? undefined,
    statut: service.statut,
    createdAt: service.createdAt.toISOString(),
  };
}

export async function getGradeById(id: string): Promise<Grade | null> {
  const grade = await prisma.grade.findUnique({ where: { id } });
  if (!grade) return null;
  return {
    id: grade.id,
    nom: grade.nom,
    description: grade.description ?? undefined,
    statut: grade.statut,
    createdAt: grade.createdAt.toISOString(),
  };
}

export async function getFonctionById(id: string): Promise<Fonction | null> {
  const fonction = await prisma.fonction.findUnique({ where: { id } });
  if (!fonction) return null;
  return {
    id: fonction.id,
    nom: fonction.nom,
    description: fonction.description ?? undefined,
    statut: fonction.statut,
    createdAt: fonction.createdAt.toISOString(),
  };
}

export async function getAllDocuments(): Promise<(DocumentRecord & { agentName?: string; directionNom?: string; service?: string })[]> {
  try {
    const docs = await prisma.documentRecord.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: { agent: true },
    });

    return docs.map((doc) => ({
      id: doc.id,
      agentId: doc.agentId,
      name: doc.name,
      size: doc.size,
      type: doc.type,
      url: doc.url,
      uploadedAt: doc.uploadedAt instanceof Date ? doc.uploadedAt.toISOString() : String(doc.uploadedAt),
      agentName: doc.agent ? `${doc.agent.nom} ${doc.agent.postNom || ''} ${doc.agent.prenom}`.trim() : undefined,
      directionNom: doc.agent?.divisionNom ?? undefined,
      service: doc.agent?.service ?? undefined,
    }));
  } catch (e) {
    console.error('Prisma getAllDocuments failed', e);
    return [];
  }
}

export async function createAgent(
  data: Omit<Agent, 'id' | 'createdAt'> & { id?: string },
  database: typeof prisma | Prisma.TransactionClient = prisma,
): Promise<Agent> {
  const newAgent: Agent = {
    ...data,
    id: data.id || `ag-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  try {
      const createData: any = {
        id: newAgent.id,
        nom: newAgent.nom,
        postNom: newAgent.postNom,
        prenom: newAgent.prenom,
        dateNaissance: newAgent.dateNaissance,
        sexe: newAgent.sexe,
        nationalite: newAgent.nationalite,
        matricule: newAgent.matricule,
        typeCarte: newAgent.typeCarte,
        numeroCarte: newAgent.numeroCarte,
        expirationCarte: newAgent.expirationCarte,
        lieuDelivrance: newAgent.lieuDelivrance,
        divisionId: newAgent.divisionId ?? newAgent.directionId,
        divisionNom: newAgent.divisionNom ?? newAgent.directionNom,
        serviceId: newAgent.serviceId,
        service: newAgent.service,
        gradeId: newAgent.gradeId,
        fonctionId: newAgent.fonctionId,
        fonctionNom: newAgent.fonctionNom,
        email: newAgent.email,
        telephone: newAgent.telephone,
        dateEngagement: newAgent.dateEngagement,
        acteEngagement: newAgent.acteEngagement,
        remunerer: newAgent.remunerer,
        districtId: newAgent.districtId,
        villeId: newAgent.villeId,
        communeId: newAgent.communeId,
        avenue: newAgent.avenue,
        code: newAgent.code,
        statut: newAgent.statut,
        statutPresence: newAgent.statutPresence || 'ACTIF',
        statutPaiement: newAgent.statutPaiement,
        montantPaiement: newAgent.montantPaiement !== undefined ? newAgent.montantPaiement : undefined,
        prime: newAgent.prime,
        montantPrime: newAgent.montantPrime !== undefined ? newAgent.montantPrime : undefined,
        datePaiement: newAgent.datePaiement,
        createdAt: new Date(newAgent.createdAt),
      };

      const created = await database.agent.create({
        data: createData,
      });

      return mapPrismaAgent(created);
    } catch (e) {
      console.error('Prisma createAgent failed', e);
      throw e instanceof Error ? e : new Error(String(e));
    }
}

export async function createAgentsInTransaction(
  agents: Array<Omit<Agent, 'id' | 'createdAt'> & { id?: string }>,
): Promise<Agent[]> {
  return prisma.$transaction(async (transaction) => {
    const createdAgents: Agent[] = [];
    for (const agent of agents) {
      createdAgents.push(await createAgent(agent, transaction));
    }
    return createdAgents;
  });
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
  const data: Record<string, unknown> = {};

  if (updates.nom !== undefined) data.nom = updates.nom;
  if (updates.postNom !== undefined) data.postNom = updates.postNom;
  if (updates.prenom !== undefined) data.prenom = updates.prenom;
  if (updates.dateNaissance !== undefined) data.dateNaissance = updates.dateNaissance;
  if (updates.sexe !== undefined) data.sexe = updates.sexe;
  if (updates.nationalite !== undefined) data.nationalite = updates.nationalite;
  if (updates.matricule !== undefined) data.matricule = updates.matricule;
  if (updates.typeCarte !== undefined) data.typeCarte = updates.typeCarte;
  if (updates.numeroCarte !== undefined) data.numeroCarte = updates.numeroCarte;
  if (updates.expirationCarte !== undefined) data.expirationCarte = updates.expirationCarte;
  if (updates.lieuDelivrance !== undefined) data.lieuDelivrance = updates.lieuDelivrance;
  if (updates.divisionId !== undefined) {
    data.divisionId = updates.divisionId;
  } else if (updates.directionId !== undefined) {
    data.divisionId = updates.directionId;
  }
  if (updates.divisionNom !== undefined) {
    data.divisionNom = updates.divisionNom;
  } else if (updates.directionNom !== undefined) {
    data.divisionNom = updates.directionNom;
  }
  if (updates.serviceId !== undefined) data.serviceId = updates.serviceId;
  if (updates.service !== undefined) data.service = updates.service;
  if (updates.gradeId !== undefined) data.gradeId = updates.gradeId;
  if (updates.fonctionId !== undefined) data.fonctionId = updates.fonctionId;
  if (updates.fonctionNom !== undefined) data.fonctionNom = updates.fonctionNom;
  if (updates.email !== undefined) data.email = updates.email;
  if (updates.telephone !== undefined) data.telephone = updates.telephone;
  if (updates.dateEngagement !== undefined) data.dateEngagement = updates.dateEngagement;
  if (updates.acteEngagement !== undefined) data.acteEngagement = updates.acteEngagement;
  if (updates.remunerer !== undefined) data.remunerer = updates.remunerer;
  if (updates.districtId !== undefined) data.districtId = updates.districtId;
  if (updates.villeId !== undefined) data.villeId = updates.villeId;
  if (updates.communeId !== undefined) data.communeId = updates.communeId;
  if (updates.avenue !== undefined) data.avenue = updates.avenue;
  if (updates.code !== undefined) data.code = updates.code;
  if (updates.statut !== undefined) data.statut = updates.statut;
  if (updates.statutPresence !== undefined) data.statutPresence = updates.statutPresence;
  if (updates.presenceInactiveAt !== undefined) data.presenceInactiveAt = updates.presenceInactiveAt ? new Date(updates.presenceInactiveAt) : null;
  if (updates.presenceInactiveReason !== undefined) data.presenceInactiveReason = updates.presenceInactiveReason;
  if (updates.presenceReactivatedAt !== undefined) data.presenceReactivatedAt = updates.presenceReactivatedAt ? new Date(updates.presenceReactivatedAt) : null;
  if (updates.presenceReactivatedBy !== undefined) data.presenceReactivatedBy = updates.presenceReactivatedBy;
  if (updates.statutPaiement !== undefined) data.statutPaiement = updates.statutPaiement;
  if (updates.montantPaiement !== undefined) data.montantPaiement = updates.montantPaiement;
  if (updates.prime !== undefined) data.prime = updates.prime;
  if (updates.montantPrime !== undefined) data.montantPrime = updates.montantPrime;
  if (updates.datePaiement !== undefined) data.datePaiement = updates.datePaiement;

  try {
    const updated = await prisma.agent.update({
      where: { id },
      data,
    });

    return mapPrismaAgent(updated);
  } catch (e) {
    console.error('Prisma updateAgent failed', e);
    return null;
  }
}

export async function deleteAgent(id: string): Promise<boolean> {
  try {
    await prisma.agent.delete({ where: { id } });
  } catch (e) {
    console.error('Prisma deleteAgent failed', e);
    return false;
  }

  return true;
}

export async function createDocumentRecord(doc: Omit<DocumentRecord, 'id' | 'uploadedAt'> & { id?: string }): Promise<DocumentRecord> {
  const newDoc: DocumentRecord = {
    ...doc,
    id: doc.id || `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    uploadedAt: new Date().toISOString(),
  };

  try {
    const created = await prisma.documentRecord.create({
      data: {
        id: newDoc.id,
        agentId: newDoc.agentId,
        name: newDoc.name,
        size: newDoc.size,
        type: newDoc.type,
        url: newDoc.url,
        uploadedAt: new Date(newDoc.uploadedAt),
      },
    });

    const createdRecord: DocumentRecord = {
      ...newDoc,
      uploadedAt: created.uploadedAt instanceof Date ? created.uploadedAt.toISOString() : String(created.uploadedAt),
    };

    return createdRecord;
  } catch (e) {
    console.error('Prisma createDocumentRecord failed', e);
    throw e instanceof Error ? e : new Error(String(e));
  }
}
