'use client';

import React, { useEffect, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { getCurrentUser, type AdminUser, filterByUserDirection } from '@/lib/accessControl';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ShieldAlert,
  ArrowRight
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

export default function WorkflowsPage() {
  const [pendingAgents, setPendingAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  async function loadPending() {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/agents`);
      const data = await res.json();
      const list = Array.isArray(data) ? (data as Agent[]) : (data.data as Agent[]) || [];
      const filtered = filterByUserDirection<Agent>(list, currentUser);
      setPendingAgents(
        filtered.filter((a) => a.statut === 'BROUILLON' || a.statut === 'VERIFICATION')
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (!cancelled) {
        setCurrentUser(user);
      }
      await loadPending();
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function updateStatus(id: string, statut: 'VALIDE' | 'REJETE') {
    try {
      await fetch(`${BACKEND_URL}/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      loadPending();
    } catch (err) {
      console.error(err);
    }
  }

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

                  {!loading && pendingAgents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        <CheckCircle2 size={32} style={{ color: '#16a34a', margin: '0 auto 10px auto' }} />
                        <p style={{ margin: 0, fontWeight: 700 }}>Tous les dossiers ont été traités !</p>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          Aucun dossier en cours de validation.
                        </span>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    pendingAgents.map((agent) => (
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
