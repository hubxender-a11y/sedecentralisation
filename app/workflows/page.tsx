'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { buildAuthHeaders, getCurrentUser, type AdminUser, filterByUserDirection } from '@/lib/accessControl';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ShieldAlert,
  ArrowRight,
  BarChart3,
  Search,
  Layers,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { BACKEND_URL } from '@/lib/backend';

type Agent = {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  directionId?: string;
  directionNom?: string;
  fonctionNom?: string;
  telephone: string;
  statut: string;
  createdAt: string;
};

type WorkflowSummary = {
  totals: {
    total: number;
    inWorkflow: number;
    brouillon: number;
    verification: number;
    valide: number;
    rejete: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byDirection: Array<{ name: string; count: number }>;
  recent: Array<{
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
    statut: string;
    directionNom: string;
    createdAt: string;
  }>;
};

export default function WorkflowsPage() {
  const [pendingAgents, setPendingAgents] = useState<Agent[]>([]);
  const [summary, setSummary] = useState<WorkflowSummary | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'TOUS' | 'BROUILLON' | 'VERIFICATION' | 'VALIDE' | 'APPROUVE' | 'REJETE'>('TOUS');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  const loadPending = useCallback(async (user: AdminUser | null = currentUser) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/agents`, {
        credentials: 'same-origin',
        headers: buildAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Chargement impossible (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? (data as Agent[]) : (data.items as Agent[]) || (data.data as Agent[]) || [];
      const filtered = filterByUserDirection<Agent>(list, user);
      const workflowOnly = filtered.filter((a) => a.statut === 'BROUILLON' || a.statut === 'VERIFICATION');
      setPendingAgents(workflowOnly);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const loadSummary = useCallback(async (user: AdminUser | null = currentUser) => {
    try {
      const res = await fetch(`${BACKEND_URL}/agents/workflow-summary`, {
        credentials: 'same-origin',
        headers: buildAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok) {
        setSummary(data);
      }
    } catch (error) {
      console.error('Unable to load workflow summary', error);
    }
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (!cancelled) {
        setCurrentUser(user);
      }
      await Promise.all([loadPending(user), loadSummary(user)]);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadPending]);

  async function updateStatus(id: string, statut: 'VALIDE' | 'REJETE') {
    try {
      const response = await fetch(`${BACKEND_URL}/agents/${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ statut }),
      });
      if (!response.ok) throw new Error(`Mise à jour impossible (${response.status})`);
      await Promise.all([loadPending(), loadSummary()]);
    } catch (err) {
      console.error(err);
    }
  }

  const filteredPending = useMemo(() => {
    return pendingAgents.filter((agent) => {
      const matchesStatus = selectedStatus === 'TOUS' || agent.statut === selectedStatus;
      const needle = keyword.trim().toLowerCase();
      const matchesKeyword = !needle || `${agent.nom} ${agent.prenom} ${agent.matricule || ''}`.toLowerCase().includes(needle);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, pendingAgents, selectedStatus]);

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="direction-container">
            <div className="direction-header">
              <div>
                <h1>{currentUser?.directionNom ? `${currentUser.directionNom} — Workflow RH` : 'Workflow & Approbations RH'}</h1>
                <p>
                  {currentUser?.directionNom
                    ? `Validation des dossiers agents pour ${currentUser.directionNom}`
                    : 'Validation hiérarchique des nouveaux dossiers agents créés'}
                </p>
              </div>

              <div className="system-pill">
                <span className="dot"></span>
                {pendingAgents.length} dossier(s) en attente
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              {[
                { label: 'Total dossiers', value: summary?.totals?.total ?? pendingAgents.length, accent: '#0f172a', icon: Layers },
                { label: 'En attente', value: summary?.totals?.verification ?? pendingAgents.filter((a) => a.statut === 'VERIFICATION').length, accent: '#f59e0b', icon: Clock },
                { label: 'Brouillons', value: summary?.totals?.brouillon ?? pendingAgents.filter((a) => a.statut === 'BROUILLON').length, accent: '#3b82f6', icon: FileText },
                { label: 'Validés', value: summary?.totals?.valide ?? 0, accent: '#16a34a', icon: CheckCircle2 },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>{card.label}</span>
                      <Icon size={18} color={card.accent} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: card.accent }}>{card.value}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '18px', marginBottom: '18px' }}>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f172a' }}>
                    <BarChart3 size={18} color="#0f172a" />
                    File d’attente RH
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Rechercher un agent"
                      style={{ width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '10px 12px 10px 36px', fontSize: '14px' }}
                    />
                  </div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                    style={{ borderRadius: '10px', border: '1px solid #cbd5e1', padding: '10px 12px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="TOUS">Tous</option>
                    <option value="BROUILLON">Brouillon</option>
                    <option value="VERIFICATION">Vérification</option>
                    <option value="VALIDE">Validé</option>
                    <option value="APPROUVE">Approuvé</option>
                    <option value="REJETE">Rejeté</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                  {(summary?.byStatus ?? []).map((item) => (
                    <div key={item.status} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{item.status}</div>
                      <div style={{ fontWeight: 800, fontSize: '24px', color: '#0f172a', marginTop: '4px' }}>{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                  <Layers size={18} color="#0f172a" />
                  Répartition par direction
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(summary?.byDirection ?? []).slice(0, 6).map((item) => (
                    <div key={item.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                        <span>{item.name}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(8, (item.count / Math.max(1, summary?.totals?.inWorkflow || 1)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #f97316)', borderRadius: '999px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="direction-table-card">
              <table className="direction-table">
                <thead>
                  <tr>
                    <th>Dossier Agent</th>
                    <th>Affectation Prévue</th>
                    <th>Contact</th>
                    <th>Étape Workflow</th>
                    <th>Décision rapide</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="empty">
                        Chargement des dossiers en attente...
                      </td>
                    </tr>
                  )}

                  {!loading && filteredPending.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        <CheckCircle2 size={32} style={{ color: '#16a34a', margin: '0 auto 10px auto' }} />
                        <p style={{ margin: 0, fontWeight: 700 }}>Aucun dossier correspondant.</p>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          La file d’attente est vide ou aucun dossier n’a été trouvé avec les filtres actifs.
                        </span>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    filteredPending.map((agent) => (
                      <tr key={agent.id}>
                        <td>
                          <strong>
                            {(agent.nom || 'Agent')} {agent.prenom || ''}
                          </strong>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Matricule: {agent.matricule || 'Généré à la validation'}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {agent.directionNom || 'Division non attribuée'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {agent.fonctionNom || 'Non renseigné'}
                          </div>
                        </td>

                        <td>{agent.telephone}</td>

                        <td>
                          <span
                            className={`status ${
                              agent.statut === 'VERIFICATION' ? 'inactive' : 'active'
                            }`}
                            style={{
                              background: agent.statut === 'VERIFICATION' ? '#ffedd5' : '#e5e7eb',
                              color: agent.statut === 'VERIFICATION' ? '#c2410c' : '#334155',
                            }}
                          >
                            <Clock size={14} /> {agent.statut}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href={`/agents/${agent.id}`}>
                              <button
                                style={{
                                  background: '#dbeafe',
                                  color: '#2563eb',
                                  border: 'none',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Eye size={16} /> Examiner
                              </button>
                            </Link>

                            <button
                              style={{
                                background: '#16a34a',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                              onClick={() => updateStatus(agent.id, 'VALIDE')}
                            >
                              Approuver
                            </button>

                            <button
                              style={{
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                              onClick={() => updateStatus(agent.id, 'REJETE')}
                            >
                              Rejeter
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
