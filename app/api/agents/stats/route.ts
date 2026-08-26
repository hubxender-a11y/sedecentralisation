import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  const user = await getServerUser(req);
  const agents = await getAgents();
  const filteredAgents = user ? agents.filter((a) => canManageAgent(user, a)) : agents;

  const total = filteredAgents.length;
  const verification = filteredAgents.filter((a) => a.statut === 'VERIFICATION').length;
  const valide = filteredAgents.filter((a) => a.statut === 'VALIDE' || a.statut === 'ACTIF' || a.statut === 'APPROUVE').length;
  const rejete = filteredAgents.filter((a) => a.statut === 'REJETE').length;
  const brouillon = filteredAgents.filter((a) => a.statut === 'BROUILLON').length;

  const paye = filteredAgents.filter((a) => a.statutPaiement === 'PAYE').length;
  const nonPaye = filteredAgents.filter((a) => a.statutPaiement !== 'PAYE').length;
  const montantTotalPaye = filteredAgents
    .filter((a) => a.statutPaiement === 'PAYE')
    .reduce((sum, a) => sum + (a.montantPaiement || 0), 0);
  const montantTotalNonPaye = filteredAgents
    .filter((a) => a.statutPaiement !== 'PAYE')
    .reduce((sum, a) => sum + (a.montantPaiement || 0), 0);

  return NextResponse.json({
    total,
    verification,
    valide,
    rejete,
    brouillon,
    paye,
    nonPaye,
    montantTotalPaye,
    montantTotalNonPaye,
  });
}
