import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/dbService';

export async function GET() {
  const agents = await getAgents();
  const totalAgents = agents.length;

  const awaitingReview = agents.filter((agent) => agent.statut === 'VERIFICATION' || agent.statut === 'BROUILLON').length;
  const validatedCount = agents.filter((agent) => ['VALIDE', 'ACTIF', 'APPROUVE'].includes(agent.statut)).length;
  const rejectedCount = agents.filter((agent) => agent.statut === 'REJETE').length;
  const unpaidAgents = agents.filter((agent) => agent.statutPaiement !== 'PAYE').length;
  const unpaidAmount = agents
    .filter((agent) => agent.statutPaiement !== 'PAYE')
    .reduce((sum, agent) => sum + (agent.montantPaiement || 0), 0);

  const validatedRate = totalAgents > 0 ? Math.round((validatedCount / totalAgents) * 100) : 0;

  const pendingByDirection = agents.reduce<Record<string, number>>((acc, agent) => {
    if (agent.statut === 'VERIFICATION' || agent.statut === 'BROUILLON') {
      const key = agent.directionNom || 'Direction inconnue';
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});

  const highestPendingDirectionEntry = Object.entries(pendingByDirection).sort((a, b) => b[1] - a[1])[0];
  const highPriorityDirection = highestPendingDirectionEntry
    ? `${highestPendingDirectionEntry[0]} (${highestPendingDirectionEntry[1]} dossiers)`
    : 'Aucune direction prioritaire détectée';

  const insights = [
    {
      title: 'Dossiers en attente de traitement',
      detail: `IA identifie ${awaitingReview} dossier(s) en vérification ou brouillon. ${highPriorityDirection} doit être priorisé par l’équipe.`,
    },
    {
      title: 'Tendance de validation',
      detail: `Taux de validation estimé à ${validatedRate}% sur ${totalAgents} agents. La charge de validation est stable et nécessite un suivi régulier.`,
    },
    {
      title: 'Paiements et risques',
      detail: `Il reste ${unpaidAgents} agent(s) non payé(s), avec un montant en attente de ${unpaidAmount.toLocaleString('fr-FR')} CDF. Cela peut impacter la clôture des dossiers.`,
    },
  ];

  if (rejectedCount > 0) {
    insights.push({
      title: 'Dossiers rejetés',
      detail: `IA signale ${rejectedCount} dossier(s) rejeté(s). Un examen manuel est recommandé pour corriger les cas récurrents.`,
    });
  }

  return NextResponse.json({ insights });
}
