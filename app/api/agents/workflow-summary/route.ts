import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';

const WORKFLOW_STATUSES = ['BROUILLON', 'VERIFICATION', 'VALIDE', 'APPROUVE', 'REJETE'];

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    const agents = await getAgents();
    const scoped = agents.filter((agent) => canManageAgent(user, agent));
    const inWorkflow = scoped.filter((agent) => WORKFLOW_STATUSES.includes(String(agent.statut || '').toUpperCase()));

    const totals = {
      total: scoped.length,
      inWorkflow: inWorkflow.length,
      brouillon: inWorkflow.filter((agent) => String(agent.statut).toUpperCase() === 'BROUILLON').length,
      verification: inWorkflow.filter((agent) => String(agent.statut).toUpperCase() === 'VERIFICATION').length,
      valide: inWorkflow.filter((agent) => ['VALIDE', 'APPROUVE', 'ACTIF'].includes(String(agent.statut).toUpperCase())).length,
      rejete: inWorkflow.filter((agent) => String(agent.statut).toUpperCase() === 'REJETE').length,
    };

    const byStatus = ['BROUILLON', 'VERIFICATION', 'VALIDE', 'APPROUVE', 'REJETE'].map((status) => ({
      status,
      count: inWorkflow.filter((agent) => String(agent.statut).toUpperCase() === status).length,
    }));

    const byDirection = Array.from(
      new Map(
        inWorkflow
          .filter((agent) => agent.directionNom || agent.directionId)
          .map((agent) => {
            const name = agent.directionNom || 'Direction non attribuée';
            return [name, { name, count: 0 }];
          })
      ).keys()
    ).map((name) => ({
      name,
      count: inWorkflow.filter((agent) => (agent.directionNom || 'Direction non attribuée') === name).length,
    })).sort((a, b) => b.count - a.count);

    const recent = [...inWorkflow]
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 8)
      .map((agent) => ({
        id: agent.id,
        nom: agent.nom,
        prenom: agent.prenom,
        matricule: agent.matricule || 'N.U',
        statut: agent.statut,
        directionNom: agent.directionNom || 'Direction non attribuée',
        createdAt: agent.createdAt,
      }));

    return NextResponse.json({
      ok: true,
      totals,
      byStatus,
      byDirection,
      recent,
    });
  } catch (error) {
    console.error('Workflow summary failed', error);
    return NextResponse.json({ ok: false, error: 'Erreur lecture workflow' }, { status: 500 });
  }
}
