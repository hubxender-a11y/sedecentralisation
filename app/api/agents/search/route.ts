import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) return NextResponse.json({ items: [] });

    const serverUser = await getServerUser(req);
    const agents = await getAgents();
    const items = agents
      .filter((a) => {
        const combined = `${a.nom} ${a.prenom} ${a.matricule || ''} ${a.telephone || ''}`.toLowerCase();
        return combined.includes(q);
      })
      .filter((a) => (serverUser ? canManageAgent(serverUser, a) : true))
      .slice(0, 12)
      .map((a) => ({ id: a.id, nom: a.nom, prenom: a.prenom, matricule: a.matricule, montantPaiement: a.montantPaiement || 0 }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error('Agent search failed', e);
    return NextResponse.json({ items: [] });
  }
}
