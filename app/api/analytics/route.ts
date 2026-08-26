import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/dbService';
import { getServerUser, canManageAgent } from '@/lib/serverAuth';

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser(req);

    // Support query params: from, to (YYYY-MM-DD), direction
    const url = req.nextUrl;
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const directionParam = url.searchParams.get('directionId') ?? url.searchParams.get('direction') ?? '';

    const fromDate = fromParam ? new Date(fromParam + 'T00:00:00') : null;
    const toDate = toParam ? new Date(toParam + 'T23:59:59') : null;

    const agents = await getAgents();

    // Respect user scope and apply additional filters from query
    const filteredAgents = agents.filter((a) => {
      if (!canManageAgent(user, a)) return false;
      if (directionParam) {
        const selectedDirection = directionParam.trim().toLowerCase();
        const id = String(a.directionId ?? '').trim().toLowerCase();
        const name = String(a.directionNom ?? a.divisionNom ?? '').trim().toLowerCase();
        if (id !== selectedDirection && name !== selectedDirection) return false;
      }
      if (fromDate || toDate) {
        const created = a.createdAt ? new Date(String(a.createdAt)) : null;
        if (!created) return false;
        if (fromDate && created < fromDate) return false;
        if (toDate && created > toDate) return false;
      }
      return true;
    });

    const payeTotal = filteredAgents.filter((a) => a.statutPaiement === 'PAYE').length;
    const nonPayeTotal = filteredAgents.filter((a) => a.statutPaiement !== 'PAYE').length;

    const totals = {
            total: filteredAgents.length,
            verification: filteredAgents.filter((a) => String(a.statut).toUpperCase() === 'VERIFICATION').length,
            valide: filteredAgents.filter((a) => ['VALIDE', 'ACTIF', 'APPROUVE'].includes(String(a.statut).toUpperCase())).length,
            rejete: filteredAgents.filter((a) => String(a.statut).toUpperCase() === 'REJETE').length,
            brouillon: filteredAgents.filter((a) => String(a.statut).toUpperCase() === 'BROUILLON').length,
            payeTotal,
            nonPayeTotal,
    };

    // By direction aggregation
    const dirMap = new Map<string, any>();
    for (const a of filteredAgents) {
      const dir = (a.directionNom ?? a.divisionNom ?? 'Sans direction') as string;
      const entry = dirMap.get(dir) ?? {
        direction: dir,
        total: 0,
        verification: 0,
        valide: 0,
        rejete: 0,
        brouillon: 0,
        montantPaiement: 0,
        montantPrime: 0,
      };

      entry.total += 1;
      const st = String(a.statut ?? '').toUpperCase();
      if (st === 'VERIFICATION') entry.verification += 1;
      if (['VALIDE', 'ACTIF', 'APPROUVE'].includes(st)) entry.valide += 1;
      if (st === 'REJETE') entry.rejete += 1;
      if (st === 'BROUILLON') entry.brouillon += 1;

      entry.montantPaiement += Number(a.montantPaiement ?? 0);
      entry.montantPrime += Number(a.montantPrime ?? 0);

      dirMap.set(dir, entry);
    }

    const byDirection = Array.from(dirMap.values()).sort((x, y) => y.total - x.total);

    // By month (createdAt)
    const monthMap = new Map<string, { month: string; total: number }>();
    for (const a of filteredAgents) {
      const created = a.createdAt ? new Date(String(a.createdAt)) : null;
      if (!created || isNaN(created.getTime())) continue;
      const key = monthKey(created);
      const cur = monthMap.get(key) ?? { month: key, total: 0 };
      cur.total += 1;
      monthMap.set(key, cur);
    }
    const byMonth = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ ok: true, totals, byDirection, byMonth });
  } catch (e) {
    console.error('Analytics GET failed', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
