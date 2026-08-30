'use client';

import { useEffect, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import StatCard from '@/components/StatCard';
import { getCurrentUser, type AdminUser, filterAgentsByUserScope, isSuperAdmin } from '@/lib/accessControl';

import {
  Users,
  Clock,
  CalendarDays,
  CheckCircle,
  XCircle,
  FileText,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import Pagination from '@/components/Pagination';
import { BACKEND_URL } from '@/lib/backend';
import Link from 'next/link';
import DashboardOverview from '@/components/DashboardOverview';

type Stats = {
  total: number;
  verification: number;
  valide: number;
  rejete: number;
  brouillon: number;
  payeTotal?: number;
  avgPaye?: number;
  nonPayeTotal?: number;
  avgNonPaye?: number;
  percentActifs?: number;
};

type DirectionStat = {
  id?: string;
  name: string;
  total: number;
  verification: number;
  valide: number;
  rejete: number;
  brouillon: number;
  montantPaiement?: number;
  montantPrime?: number;
};

type PresenceWidget = {
  total: number;
  pointed: number;
  message: string;
  open: boolean;
};

function buildDirectionStats(agents: Array<{ directionNom?: string; statut?: string }>): DirectionStat[] {
  const map = new Map<string, DirectionStat>();

  for (const agent of agents) {
    const directionName = agent.directionNom?.trim() || 'Sans direction';
    const current = map.get(directionName) ?? {
      name: directionName,
      total: 0,
      verification: 0,
      valide: 0,
      rejete: 0,
      brouillon: 0,
    };

    current.total += 1;

    if (agent.statut === 'VERIFICATION') {
      current.verification += 1;
    }

    if (['VALIDE', 'ACTIF', 'APPROUVE'].includes(agent.statut ?? '')) {
      current.valide += 1;
    }

    if (agent.statut === 'REJETE') {
      current.rejete += 1;
    }

    if (agent.statut === 'BROUILLON') {
      current.brouillon += 1;
    }

    map.set(directionName, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    verification: 0,
    valide: 0,
    rejete: 0,
    brouillon: 0,
    payeTotal: 0,
    avgPaye: 0,
    nonPayeTotal: 0,
    avgNonPaye: 0,
    percentActifs: 0,
  });

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [directionStats, setDirectionStats] = useState<DirectionStat[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [totalAgents, setTotalAgents] = useState<number>(0);
  const [presenceWidget, setPresenceWidget] = useState<PresenceWidget>({ total: 0, pointed: 0, message: '', open: false });

  // Analytics UI state
  const [selectedDirection, setSelectedDirection] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    // On mount: fetch current user
    let cancelled = false;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!cancelled) setCurrentUser(user);
      } catch (e) {
        console.warn('Impossible de charger l’utilisateur courant', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch analytics and paged agents whenever filters / pagination change
  useEffect(() => {
    let cancelled = false;

    async function reload() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedDirection) { params.set('directionId', selectedDirection); params.set('direction', selectedDirection); }
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        if (searchQuery) params.set('search', searchQuery);

        // status filter: pass as comma-separated list (server currently ignores status but param kept for future)
        const statuses = Object.entries(statusFilter).filter(([, v]) => v).map(([k]) => k);
        if (statuses.length) params.set('status', statuses.join(','));

        // Fetch analytics with filters
        try {
          const analyticsResp = await fetch(`${BACKEND_URL}/analytics?${params.toString()}`);
          if (analyticsResp.ok) {
            const analyticsJson = await analyticsResp.json();
            if (analyticsJson && analyticsJson.ok) {
              const { totals, byDirection } = analyticsJson;
              setStats({
                total: totals.total ?? 0,
                verification: totals.verification ?? 0,
                valide: totals.valide ?? 0,
                rejete: totals.rejete ?? 0,
                brouillon: totals.brouillon ?? 0,
              });

              // map byDirection and try to attach directionId when possible from agentsList
              const mapped = Array.isArray(byDirection)
                ? byDirection.map((d: any) => {
                    const name = d.direction ?? d.directional ?? 'Sans direction';
                    const meta = getUniqueDirections().find((x) => x.name === name);
                    return {
                      id: meta?.id ?? String(name),
                      name,
                      total: d.total ?? 0,
                      verification: d.verification ?? 0,
                      valide: d.valide ?? 0,
                      rejete: d.rejete ?? 0,
                      brouillon: d.brouillon ?? 0,
                      montantPaiement: Number(d.montantPaiement ?? 0),
                      montantPrime: Number(d.montantPrime ?? 0),
                    };
                  })
                : [];
 
              const payeTotal = Number(totals.payeTotal ?? 0);
              const avgPaye = mapped.length > 0 ? Math.round(payeTotal / mapped.length) : 0;
              const nonPayeTotal = Number(totals.nonPayeTotal ?? 0);
              const avgNonPaye = mapped.length > 0 ? Math.round(nonPayeTotal / mapped.length) : 0;
              const percentActifs = totals.total && totals.total > 0 ? Math.round(((totals.valide ?? 0) / totals.total) * 100) : 0;
 
              setStats((prev) => ({
                ...prev,
                total: totals.total ?? 0,
                verification: totals.verification ?? 0,
                valide: totals.valide ?? 0,
                rejete: totals.rejete ?? 0,
                brouillon: totals.brouillon ?? 0,
                payeTotal,
                avgPaye,
                nonPayeTotal,
                avgNonPaye,
                percentActifs,
              }));
 
              setDirectionStats(mapped);
            }
          }
        } catch (e) {
          console.warn('Impossible de lire /api/analytics', e);
        }

        // Fetch paged agents
        try {
          params.set('page', String(page));
          params.set('pageSize', String(pageSize));
          const agentsResp = await fetch(`${BACKEND_URL}/agents?${params.toString()}`);
          if (agentsResp.ok) {
            const agentsJson = await agentsResp.json();
            if (agentsJson && agentsJson.ok && Array.isArray(agentsJson.items)) {
              setAgentsList(agentsJson.items);
              setTotalAgents(Number(agentsJson.total ?? 0));
              const totalPagesCalc = Math.max(1, Math.ceil((Number(agentsJson.total ?? 0) || 0) / pageSize));
              if (page > totalPagesCalc) setPage(totalPagesCalc);
            } else if (Array.isArray(agentsJson)) {
              // fallback: legacy response returns an array
              setAgentsList(agentsJson);
              setTotalAgents(agentsJson.length);
            } else {
              setAgentsList([]);
              setTotalAgents(0);
            }
          } else {
            console.warn('Agents fetch failed', agentsResp.statusText);
            setAgentsList([]);
            setTotalAgents(0);
          }
        } catch (e) {
          console.warn('Impossible de lire /api/agents', e);
          setAgentsList([]);
          setTotalAgents(0);
        }

        try {
          const presenceParams = selectedDirection ? `?directionId=${encodeURIComponent(selectedDirection)}` : '';
          const presenceResp = await fetch(`${BACKEND_URL}/presences${presenceParams}`);
          if (presenceResp.ok) {
            const presenceJson = await presenceResp.json();
            const presenceAgents = Array.isArray(presenceJson.agents) ? presenceJson.agents : [];
            setPresenceWidget({
              total: presenceAgents.length,
              pointed: presenceAgents.filter((agent: any) => agent.presence).length,
              message: String(presenceJson.pointageMessage || ''),
              open: Boolean(presenceJson.pointageOuvert),
            });
          }
        } catch (e) {
          console.warn('Impossible de lire le pointage du jour', e);
        }
      } catch (error) {
        console.error('Erreur dashboard', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    reload();

    return () => { cancelled = true; };
  }, [selectedDirection, dateFrom, dateTo, JSON.stringify(statusFilter), page, pageSize, searchQuery]);


  // ---------- Analytics helpers ----------
  function getUniqueDirections() {
    // return list of { id, name } preserving either directionId if present or fallback to directionNom
    const map = new Map<string, { id: string; name: string }>();
    agentsList.forEach((a) => {
      const id = String(a.directionId ?? a.direction_id ?? '').trim();
      const name = String((a.directionNom ?? a.direction_nom ?? a.direction ?? id) || 'Sans direction').trim();
      const key = id || name;
      if (!map.has(key)) map.set(key, { id: id || name, name });
    });
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
  }

  function parseDate(v: any): Date | null {
    if (!v) return null;
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function inDateRange(d: Date | null): boolean {
    if (!d) return true;
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00');
      if (d < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      if (d > to) return false;
    }
    return true;
  }

  function filteredAgents(): any[] {
    return agentsList.filter((a) => {
      if (selectedDirection) {
        // prefer directionId when available, fallback to name comparison for backward compatibility
        if (a.directionId || a.direction_id) {
          if (String(a.directionId ?? a.direction_id) !== selectedDirection) return false;
        } else if ((a.directionNom ?? a.direction_nom ?? a.direction) !== selectedDirection) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = String(a.Nom_postnom_prenom ?? a.fullName ?? a.nom ?? '').toLowerCase();
        if (!name.includes(q) && !(String(a.Matricule ?? a.matricule ?? '').toLowerCase().includes(q))) return false;
      }
      const created = parseDate(a.createdAt ?? a.created_at ?? a.datePaiement ?? a.date_paiement ?? a.Date_de_naissance ?? a.Date_d_engagement);
      if (!inDateRange(created)) return false;
      if (Object.keys(statusFilter).length > 0) {
        const stat = String(a.statut ?? '').toUpperCase();
        const allowed = Object.entries(statusFilter).filter(([,v])=>v).map(([k])=>k);
        if (allowed.length > 0 && !allowed.includes(stat)) return false;
      }
      return true;
    });
  }

  function groupByMonth(agents: any[]) {
    const map = new Map<string, number>();
    agents.forEach((a) => {
      const d = parseDate(a.createdAt ?? a.created_at ?? a.datePaiement ?? a.date_paiement ?? a.Date_de_naissance);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const entries = Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
    return entries;
  }

  function buildLinePoints(entries: [string, number][]) {
    if (entries.length === 0) return [] as {label:string, value:number}[];
    return entries.map(([k,v])=>({label:k, value:v}));
  }

  function paginate(items: any[]) {
    const start = (page-1)*pageSize;
    return items.slice(start, start+pageSize);
  }

  return (
    <div className="office-layout">
      <OfficeHeader />
      <div className="office-body">
        <OfficeSidebar />
        <DashboardOverview
          currentUser={currentUser}
          stats={stats}
          directionStats={directionStats}
          agents={agentsList}
          presence={presenceWidget}
          loading={loading}
        />
      </div>
    </div>
  );

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          {/* HEADER DASHBOARD */}
          <div className="dashboard-title">
            <div>
              <h1>{currentUser?.directionNom ? currentUser?.directionNom : 'Tableau de bord Kna+'}</h1>
              <p>
                Bienvenue {currentUser?.fullName ?? 'utilisateur'}
                {currentUser?.directionNom ? `, vous êtes dans la direction ${currentUser?.directionNom}` : ''}
              </p>
            </div>
          </div>

          {/* STATISTIQUES */}
          <section className="stats">
            <StatCard
              title="Total Agents"
              value={loading ? '...' : String(stats.total)}
              icon={Users}
              color="#2563eb"
            />

            <StatCard
              title="En vérification"
              value={loading ? '...' : String(stats.verification)}
              icon={Clock}
              color="#ea580c"
            />

            <StatCard
              title="Agents validés"
              value={loading ? '...' : String(stats.valide)}
              icon={CheckCircle}
              color="#16a34a"
            />

            <StatCard
              title="Agents rejetés"
              value={loading ? '...' : String(stats.rejete)}
              icon={XCircle}
              color="#dc2626"
            />
          </section>

          {(isSuperAdmin(currentUser) || currentUser?.directionNom) && (
            <section className="direction-overview-panel">
              <div className="dashboard-section-header">
                <div>
                  <h2 className="section-title no-margin">Analyse et indicateurs</h2>
                  <p>Tableau d’analyse centralisé — filtres, visualisations et tableaux détaillés.</p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {/* Export buttons moved to the table footer in the analytics section */}
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <select value={selectedDirection} onChange={(e) => { setSelectedDirection(e.target.value); setPage(1); }}>
                    <option value="">Toutes les directions</option>
                    {getUniqueDirections().map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                </div>
                <div>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
                </div>

                <div>
                  <input placeholder="Recherche nom ou matricule" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="quick-btn" onClick={() => { setSelectedDirection(''); setDateFrom(''); setDateTo(''); setStatusFilter({}); setSearchQuery(''); }}>
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* Key metrics */}
              <section className="dashboard-presence-widget">
                <div className="dashboard-presence-heading">
                  <div>
                    <span className="dashboard-presence-kicker"><CalendarDays size={15} /> POINTAGE DU JOUR</span>
                    <h3>Présence quotidienne</h3>
                    <p>{presenceWidget.message || 'Suivi des signatures enregistrées aujourd’hui.'}</p>
                  </div>
                  <Link href="/presence" className="dashboard-presence-link">Ouvrir le pointage <ArrowRight size={16} /></Link>
                </div>
                <div className="dashboard-presence-metrics">
                  <div><strong>{loading ? '...' : presenceWidget.pointed}</strong><span>Présents</span></div>
                  <div><strong>{loading ? '...' : Math.max(0, presenceWidget.total - presenceWidget.pointed)}</strong><span>En attente</span></div>
                  <div className={presenceWidget.open ? 'is-open' : 'is-closed'}><strong>{presenceWidget.open ? 'OUVERT' : 'FERMÉ'}</strong><span>Fenêtre 07h00 - 09h30</span></div>
                </div>
              </section>
              <section className="stats">
                <StatCard title="Total Agents (filtrés)" value={String(filteredAgents().length)} icon={Users} color="#2563eb" />
                <StatCard title="Validés" value={String(filteredAgents().filter((a)=>['VALIDE','ACTIF','APPROUVE'].includes((a.statut||'').toUpperCase())).length)} icon={CheckCircle} color="#16a34a" />
                <StatCard title="En vérification" value={String(filteredAgents().filter((a)=> (a.statut||'').toUpperCase()==='VERIFICATION').length)} icon={Clock} color="#ea580c" />
                <StatCard title="Rejetés" value={String(filteredAgents().filter((a)=> (a.statut||'').toUpperCase()==='REJETE').length)} icon={XCircle} color="#dc2626" />
                {/* Payments KPIs */}
                <StatCard title="Total agents payés" value={loading ? '...' : new Intl.NumberFormat('fr-FR').format(Number(stats.payeTotal ?? 0))} icon={FileText} color="#7c3aed" />
                <StatCard title="Moy. agents payés / direction" value={loading ? '...' : new Intl.NumberFormat('fr-FR').format(Number(stats.avgPaye ?? 0))} icon={Clock} color="#0ea5a4" />
                <StatCard title="Total agents non payés" value={loading ? '...' : new Intl.NumberFormat('fr-FR').format(Number(stats.nonPayeTotal ?? 0))} icon={FileText} color="#dc2626" />
                <StatCard title="Moy. agents non payés / direction" value={loading ? '...' : new Intl.NumberFormat('fr-FR').format(Number(stats.avgNonPaye ?? 0))} icon={Clock} color="#ea580c" />
                <StatCard title="% Actifs" value={loading ? '...' : `${Number(stats.percentActifs ?? 0)}%`} icon={ShieldCheck} color="#059669" />
              </section>

              {/* Visualisations: bar chart per direction + evolution */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="table-card">
                  <h3>Agents par direction</h3>
                  <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={directionStats} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip formatter={(value:any, name:any) => typeof value === 'number' ? new Intl.NumberFormat('fr-FR').format(value) : value} />
                      <Bar dataKey="montantPaiement" name="Montant payé" fill="#7c3aed" />
                      <Bar dataKey="total" name="Nombre agents" fill="#dc2626" />
                    </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                <div className="table-card">
                  <h3>Évolution (agents créés par mois)</h3>
                  <div style={{ paddingTop: 12 }}>
                    {(() => {
                      const entries = groupByMonth(filteredAgents());
                      const points = entries.map(([m, v]) => ({ month: m, value: v }));
                      if (!points.length) return <div>Aucune donnée</div>;
                      return (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Table of agents with pagination and export */}
              <div className="table-card" style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Liste des agents</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                  {/* Export disabled as requested */}
                  </div>
                </div>

                <table style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nom</th>
                      <th>Matricule</th>
                      <th>Direction</th>
                      <th>Statut</th>
                      <th>Créé le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredAgents()).map((a, idx) => (
                      <tr key={idx}>
                        <td>{(page-1)*pageSize + idx + 1}</td>
                        <td>{a.Nom_postnom_prenom ?? a.fullName ?? a.nom ?? ''}</td>
                        <td>{a.Matricule ?? a.matricule ?? ''}</td>
                        <td>{a.directionNom ?? a.direction_nom ?? a.direction ?? ''}</td>
                        <td>{a.statut ?? ''}</td>
                        <td>{String(a.createdAt ?? a.created_at ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    {/* Reusable pagination component */}
                    <div>
                      {/* left slot preserved for future action buttons */}
                    </div>
                    <div>
                      <Pagination
                        page={page}
                        pageSize={pageSize}
                        total={totalAgents}
                        onPageChange={(p)=>setPage(p)}
                        onPageSizeChange={(s)=>{ setPageSize(s); }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </section>
          )}

          {/* APPLICATIONS */}
          <h2 className="section-title">Applications Kna+</h2>

          <section className="application-grid">
            <div className="application-card">
              <div className="application-icon">
                <Users size={28} />
              </div>
              <h3>Gestion Agents</h3>
              <p>Création, modification et suivi des agents.</p>
              <Link href="/agents">
                <button>
                  Ouvrir <ArrowRight size={16} />
                </button>
              </Link>
            </div>

            <div className="application-card">
              <div className="application-icon">
                <ShieldCheck size={28} />
              </div>
              <h3>Workflow</h3>
              <p>Contrôle, validation et approbation.</p>
              <Link href="/workflows">
                <button>
                  Ouvrir <ArrowRight size={16} />
                </button>
              </Link>
            </div>

            <div className="application-card">
              <div className="application-icon">
                <FileText size={28} />
              </div>
              <h3>Documents</h3>
              <p>Gestion des pièces justificatives.</p>
              <Link href="/documents">
                <button>
                  Ouvrir <ArrowRight size={16} />
                </button>
              </Link>
            </div>

            <div className="application-card">
              <div className="application-icon">
                <BarChart3 size={28} />
              </div>
              <h3>Rapports</h3>
              <p>Analyse et statistiques métier.</p>
              <Link href="/reports">
                <button>
                  Ouvrir <ArrowRight size={16} />
                </button>
              </Link>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
