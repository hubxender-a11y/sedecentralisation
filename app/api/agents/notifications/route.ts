import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  try {
    const serverUser = await getServerUser(req);
    if (!serverUser) {
      return NextResponse.json({ items: [], error: 'Utilisateur non autorisé.' }, { status: 401 });
    }

    const agents = await getAgents();
    const notifs = agents
      .filter((a) => a.statut === 'VERIFICATION')
      .filter((a) => canManageAgent(serverUser, a))
      .sort((x, y) => (x.createdAt || '').localeCompare(y.createdAt || ''))
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        nom: a.nom,
        prenom: a.prenom,
        matricule: a.matricule,
        statut: a.statut,
      }));

    return NextResponse.json({ items: notifs });
  } catch (e) {
    console.error('Agent notifications failed', e);
    return NextResponse.json({ items: [] });
  }
}
