import { NextRequest, NextResponse } from 'next/server';
import { createAgent, getAgents, getDirectionById, getFonctionById, getGradeById, getServiceById } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

export async function GET(req: NextRequest) {
  const user = await getServerUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, items: [], total: 0, page: 1, pageSize: 0 }, { status: 200 });
  }

  // Support pagination and filters via query params
  const url = req.nextUrl;
  const pageParam = Number(url.searchParams.get('page') ?? '1');
  const pageSizeParam = Number(url.searchParams.get('pageSize') ?? '20');
  const directionParam = (url.searchParams.get('directionId') ?? url.searchParams.get('direction') ?? '').trim().toLowerCase();
  const fromParam = url.searchParams.get('from') ?? '';
  const toParam = url.searchParams.get('to') ?? '';
  const searchParam = (url.searchParams.get('search') ?? '').trim();

  const page = Math.max(1, Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1);
  const pageSize = Math.max(1, Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 20);

  const agents = await getAgents();
  // Apply server scope and filters
  const filtered = agents.filter((a) => {
    if (!canManageAgent(user, a)) return false;
    if (directionParam) {
      const id = String(a.directionId ?? '').trim().toLowerCase();
      const name = String(a.directionNom ?? a.divisionNom ?? '').trim().toLowerCase();
      if (id !== directionParam && name !== directionParam) return false;
    }
    if (fromParam || toParam) {
      const fromDate = fromParam ? new Date(fromParam + 'T00:00:00') : null;
      const toDate = toParam ? new Date(toParam + 'T23:59:59') : null;
      const created = a.createdAt ? new Date(String(a.createdAt)) : null;
      if (!created) return false;
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
    }
    if (searchParam) {
      const q = searchParam.toLowerCase();
      const name = `${String(a.nom ?? '')} ${String(a.postNom ?? '')} ${String(a.prenom ?? '')}`.toLowerCase();
      const matricule = String(a.matricule ?? '').toLowerCase();
      if (!name.includes(q) && !matricule.includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return NextResponse.json({ ok: true, items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const rawBody = await req.text();
    let body: Record<string, unknown> = {};

    if (rawBody && rawBody.trim()) {
      try {
        const parsedBody = JSON.parse(rawBody) as Record<string, unknown> | null;
        if (parsedBody && typeof parsedBody === 'object') {
          body = parsedBody;
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Le corps de la requête JSON est invalide' },
          { status: 400 }
        );
      }
    }

    // Basic identity validation
    if (!body.nom || !body.postNom) {
      return NextResponse.json(
        { error: 'Le nom et le postnom sont obligatoires' },
        { status: 400 }
      );
    }

    const directionId = typeof body.directionId === 'string'
      ? body.directionId
      : undefined;
    const divisionId = typeof body.divisionId === 'string' && body.divisionId.trim()
      ? body.divisionId
      : undefined;
    const divisionName = typeof body.division === 'string' && body.division.trim()
      ? body.division
      : undefined;

    const serviceId = typeof body.serviceId === 'string' && body.serviceId.trim()
      ? body.serviceId
      : undefined;

    let resolvedDirectionId = directionId;
    const selectedService = serviceId
      ? await getServiceById(serviceId)
      : undefined;

    if (!resolvedDirectionId && selectedService) {
      resolvedDirectionId = selectedService.directionId;
    }

    if (serverUser.directionId) {
      if (resolvedDirectionId && resolvedDirectionId !== serverUser.directionId) {
        return NextResponse.json(
          { error: 'Vous ne pouvez créer un agent que dans votre direction.' },
          { status: 403 }
        );
      }
      resolvedDirectionId = serverUser.directionId;
    }

    if (!canManageAgent(serverUser, {
      directionId: resolvedDirectionId,
      serviceId: selectedService?.id || serviceId || undefined,
      service: selectedService?.nom || (typeof body.service === 'string' ? body.service : undefined),
    })) {
      return NextResponse.json(
        { error: 'Vous ne pouvez gérer que les agents de votre direction et de votre bureau.' },
        { status: 403 }
      );
    }

    const directionObj = resolvedDirectionId
      ? await getDirectionById(resolvedDirectionId)
      : undefined;
    const gradeObj = body.gradeId
      ? await getGradeById(String(body.gradeId))
      : undefined;
    const fonctionObj = body.fonctionId
      ? await getFonctionById(String(body.fonctionId))
      : undefined;

    if (!body.gradeId || typeof body.gradeId !== 'string') {
      return NextResponse.json(
        { error: 'Le grade est obligatoire.' },
        { status: 400 }
      );
    }

    if (body.gradeId && !gradeObj) {
      return NextResponse.json(
        { error: 'Grade introuvable.' },
        { status: 400 }
      );
    }

    if (!body.fonctionId || typeof body.fonctionId !== 'string') {
      return NextResponse.json(
        { error: 'La fonction est obligatoire.' },
        { status: 400 }
      );
    }

    if (body.fonctionId && !fonctionObj) {
      return NextResponse.json(
        { error: 'Fonction introuvable.' },
        { status: 400 }
      );
    }

    const selectedDirection = resolvedDirectionId ? await getDirectionById(resolvedDirectionId) : undefined;
    const selectedDivision = divisionId ? await prisma.division.findUnique({ where: { id: divisionId } }) : undefined;
    const serviceDirectionMatches = selectedService && resolvedDirectionId && (
      selectedService.directionId === resolvedDirectionId ||
      selectedService.directionNom === selectedDirection?.nom
    );
    const serviceDivisionMatches = selectedService && divisionId && (
      selectedService.divisionId === divisionId ||
      selectedService.divisionNom === selectedDivision?.nom
    );

    if (selectedService && resolvedDirectionId && !serviceDirectionMatches) {
      return NextResponse.json(
        { error: 'Le bureau sélectionné doit appartenir à la division choisie.' },
        { status: 400 }
      );
    }
    if (selectedService && divisionId && !serviceDivisionMatches) {
      return NextResponse.json(
        { error: 'Le bureau sélectionné doit appartenir à la division choisie.' },
        { status: 400 }
      );
    }

    const rawMatricule = typeof body.matricule === 'string' ? body.matricule.trim() : '';
    const normalizedMatriculeCandidate = rawMatricule.toUpperCase();
    const isNU = rawMatricule === '' || /^N\.?U$/i.test(normalizedMatriculeCandidate);
    const numericMatricule = rawMatricule.replace(/[\.\s-]/g, '');
    const digitsOnly = rawMatricule === '' ? false : /^[0-9]+$/.test(numericMatricule);

    if (!isNU && !digitsOnly) {
      return NextResponse.json(
        { error: 'Le matricule doit être soit N.U soit un numéro composé uniquement de chiffres.' },
        { status: 400 }
      );
    }

    const baseMatricule = isNU ? 'N.U' : numericMatricule;

    const statut = (typeof body.statut === 'string' && ['BROUILLON', 'VERIFICATION', 'VALIDE', 'ACTIF', 'REJETE', 'APPROUVE'].includes(body.statut)
      ? body.statut
      : 'VERIFICATION') as 'BROUILLON' | 'VERIFICATION' | 'VALIDE' | 'ACTIF' | 'REJETE' | 'APPROUVE';

    const isRemunerated = body.remunerer === 'OUI' || (typeof body.statutPaiement === 'string' && body.statutPaiement === 'PAYE');
    const statutPaiement = isRemunerated ? 'PAYE' : 'NON_PAYE';
    let montantPaiement: number | undefined;
    let montantPrime: number | undefined;
    const primeApplied = body.prime === 'OUI';

    if (isRemunerated) {
      const montantValue = typeof body.montantPaiement === 'number'
        ? body.montantPaiement
        : typeof body.montantPaiement === 'string'
        ? Number(String(body.montantPaiement).replace(/\s+/g, ''))
        : NaN;

      if (Number.isNaN(montantValue) || montantValue <= 0) {
        return NextResponse.json(
          { error: 'Le montant de paiement doit être un nombre positif lorsque l’agent est rémunéré.' },
          { status: 400 }
        );
      }

      montantPaiement = montantValue;
    }

    if (primeApplied) {
      const primeValue = typeof body.montantPrime === 'number'
        ? body.montantPrime
        : typeof body.montantPrime === 'string'
        ? Number(String(body.montantPrime).replace(/\s+/g, ''))
        : NaN;

      if (Number.isNaN(primeValue) || primeValue <= 0) {
        return NextResponse.json(
          { error: 'Le montant de prime doit être un nombre positif lorsque la prime est accordée.' },
          { status: 400 }
        );
      }

      montantPrime = primeValue;
    }

    const newAgent = await createAgent({
      id: `ag-${Date.now()}`,
      nom: String(body.nom),
      postNom: body.postNom ? String(body.postNom) : '',
      prenom: String(body.prenom),
      dateNaissance: typeof body.dateNaissance === 'string' ? body.dateNaissance : undefined,
      sexe: typeof body.sexe === 'string' ? body.sexe : undefined,
      nationalite: typeof body.nationalite === 'string' ? body.nationalite : undefined,
      matricule: baseMatricule,
      typeCarte: typeof body.typeCarte === 'string' ? body.typeCarte : undefined,
      numeroCarte: typeof body.numeroCarte === 'string' ? body.numeroCarte : undefined,
      expirationCarte: typeof body.expirationCarte === 'string' ? body.expirationCarte : undefined,
      lieuDelivrance: typeof body.lieuDelivrance === 'string' ? body.lieuDelivrance : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      telephone: typeof body.telephone === 'string' ? body.telephone : '',
      dateEngagement: typeof body.dateEngagement === 'string' ? body.dateEngagement : undefined,
      acteEngagement: typeof body.acteEngagement === 'string' ? body.acteEngagement : undefined,
      remunerer:
        typeof body.remunerer === 'string' && (body.remunerer === 'OUI' || body.remunerer === 'NON')
          ? body.remunerer
          : 'NON',
      directionId: resolvedDirectionId,
      directionNom: directionObj ? directionObj.nom : undefined,
      divisionId: divisionId || undefined,
      divisionNom: divisionName || undefined,
      gradeId: typeof body.gradeId === 'string' ? body.gradeId : undefined,
      gradeNom: gradeObj ? gradeObj.nom : undefined,
      fonctionId: typeof body.fonctionId === 'string' ? body.fonctionId : undefined,
      fonctionNom: fonctionObj ? fonctionObj.nom : undefined,
      serviceId: selectedService ? selectedService.id : serviceId || undefined,
      service: selectedService ? selectedService.nom : typeof body.service === 'string' ? body.service : undefined,
      communeId: typeof body.communeId === 'string' ? body.communeId : undefined,
      avenue: typeof body.avenue === 'string' ? body.avenue : undefined,
      code: typeof body.code === 'string' ? body.code : undefined,
      statut,
      statutPresence: 'ACTIF',
      statutPaiement,
      montantPaiement,
      prime: typeof body.prime === 'string' && (body.prime === 'OUI' || body.prime === 'NON') ? body.prime : 'NON',
      montantPrime: primeApplied ? montantPrime : undefined,
      datePaiement: typeof body.datePaiement === 'string' ? body.datePaiement : (statutPaiement === 'PAYE' ? new Date().toISOString().split('T')[0] : undefined),
    });

    if (!newAgent) {
      throw new Error('Impossible de créer l\'agent');
    }

    await writeAuditLog({
      userId: serverUser.id,
      action: 'CREATE_AGENT',
      entityType: 'Agent',
      entityId: newAgent.id,
      newValue: { matricule: newAgent.matricule, statut: newAgent.statut },
      ipAddress: getRequestIp(req),
    });

    return NextResponse.json(newAgent, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur création agent';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

