'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle, Clock, FileText, Search, Users } from 'lucide-react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { buildAuthHeaders, getCurrentUser, isSuperAdmin, type AdminUser } from '@/lib/accessControl';
import './presence.css';

type Bureau = { id: string; nom: string; directionId?: string; directionNom?: string };
type Direction = { id: string; nom: string };
type Agent = {
  id: string;
  nom: string;
  postNom?: string;
  prenom: string;
  matricule?: string;
  service?: string;
  directionNom?: string;
  statutPresence?: 'ACTIF' | 'INACTIF';
  presence?: { id: string; heure: string } | null;
};

function formatHour(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
}

export default function PresencePage() {
  const [bureaux, setBureaux] = useState<Bureau[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedDirection, setSelectedDirection] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('');
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [date, setDate] = useState('');
  const [pointageOuvert, setPointageOuvert] = useState(false);
  const [pointageMessage, setPointageMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  const isGlobalAdmin = Boolean(currentUser && (isSuperAdmin(currentUser) || currentUser.roleId === 'role-admin'));

  async function loadDirections(user: AdminUser | null) {
    if (user && !isSuperAdmin(user) && user.roleId !== 'role-admin') return;
    const response = await fetch('/api/directions', { headers: buildAuthHeaders() });
    const data = await response.json();
    setDirections(Array.isArray(data) ? data : []);
  }

  async function loadBureaux(user: AdminUser | null, directionId = '') {
    const params = new URLSearchParams();
    if (user && !isSuperAdmin(user) && user.roleId !== 'role-admin' && user.directionId) {
      params.set('directionId', user.directionId);
    } else if (directionId) {
      params.set('directionId', directionId);
    }
    const response = await fetch(`/api/services?${params.toString()}`, { headers: buildAuthHeaders() });
    const data = await response.json();
    const list = Array.isArray(data) ? data : data?.data || [];
    setBureaux(list.map((item: Bureau) => ({ id: item.id, nom: item.nom, directionId: item.directionId, directionNom: item.directionNom })));
  }

  async function loadPresence() {
    if (isGlobalAdmin && !selectedDirection) {
      setAgents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedDirection) params.set('directionId', selectedDirection);
      if (selectedBureau) params.set('serviceId', selectedBureau);
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/presences?${params.toString()}`, { headers: buildAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Impossible de charger le pointage.');
      setAgents(Array.isArray(data.agents) ? data.agents : []);
      setDate(data.date || '');
      setPointageOuvert(Boolean(data.pointageOuvert));
      setPointageMessage(data.pointageMessage || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger le pointage.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        if (user && !isSuperAdmin(user) && user.roleId !== 'role-admin' && user.directionId) {
          setSelectedDirection(user.directionId);
        }
        return Promise.all([
          loadDirections(user),
          user && !isSuperAdmin(user) && user.roleId !== 'role-admin'
            ? loadBureaux(user, user.directionId || '')
            : Promise.resolve(),
        ]);
      })
      .catch(() => setError('Impossible de charger les bureaux.'));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadPresence(), 250);
    return () => window.clearTimeout(timer);
  }, [selectedBureau, selectedDirection, search, isGlobalAdmin]);

  useEffect(() => {
    if (!currentUser || !isGlobalAdmin) return;
    setSelectedBureau('');
    setBureaux([]);
    if (selectedDirection) {
      loadBureaux(currentUser, selectedDirection).catch(() => setError('Impossible de charger les bureaux de cette direction.'));
    }
  }, [selectedDirection, currentUser, isGlobalAdmin]);

  async function pointer(agent: Agent) {
    setSavingId(agent.id);
    setMessage('');
    setError('');
    try {
      const bureau = bureaux.find((item) => item.id === selectedBureau);
      const response = await fetch('/api/presences', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ agentId: agent.id, serviceId: selectedBureau, serviceNom: bureau?.nom || '' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Pointage refusé.');
      setMessage(`${agent.nom} ${agent.prenom} est pointé à ${formatHour(data.presence.heure)}.`);
      await loadPresence();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pointage refusé.');
    } finally {
      setSavingId(null);
    }
  }

  async function exportPdf() {
    setError('');
    try {
      const bureau = bureaux.find((item) => item.id === selectedBureau);
      const response = await fetch('/api/presences/export-pdf', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ date, directionId: selectedDirection, serviceId: selectedBureau, serviceNom: bureau?.nom || '' }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Impossible de générer le PDF.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presence-${date}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de générer le PDF.');
    }
  }

  const pointedCount = useMemo(() => agents.filter((agent) => agent.presence).length, [agents]);
  const remainingCount = agents.length - pointedCount;

  return (
    <div className="office-layout">
      <OfficeHeader />
      <div className="office-body">
        <OfficeSidebar />
        <main className="office-content">
          <div className="presence-hero">
            <div>
              <div className="presence-kicker">RH · PRÉSENCE DU JOUR</div>
              <h1>Pointage quotidien</h1>
              <p>Retrouvez rapidement un agent et enregistrez sa signature avec l’heure officielle du système.</p>
            </div>
            <button type="button" className="presence-export" onClick={exportPdf}>
              <FileText size={18} />
              <span>Exporter la feuille</span>
            </button>
          </div>

          <section className="presence-toolbar">
            {isGlobalAdmin && (
              <div className="presence-field">
                <label htmlFor="presence-direction">Direction</label>
                <select id="presence-direction" value={selectedDirection} onChange={(event) => setSelectedDirection(event.target.value)}>
                  <option value="">Choisir une direction</option>
                  {directions.map((direction) => <option key={direction.id} value={direction.id}>{direction.nom}</option>)}
                </select>
              </div>
            )}
            <div className="presence-field">
              <label htmlFor="presence-bureau">Bureau / service</label>
              <select id="presence-bureau" value={selectedBureau} disabled={isGlobalAdmin && !selectedDirection} onChange={(event) => setSelectedBureau(event.target.value)}>
                  <option value="">Tous les bureaux de la direction</option>
                  {bureaux.map((bureau) => <option key={bureau.id} value={bureau.id}>{bureau.nom}</option>)}
              </select>
            </div>
            <div className="presence-field presence-search-field">
              <label htmlFor="presence-search">Recherche rapide</label>
              <div className="presence-search">
                <Search size={18} />
                <input id="presence-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, prénom ou matricule" />
              </div>
            </div>
          </section>

          <section className="presence-overview">
            <div className="presence-date"><CalendarDays size={19} /><div><span>Date du pointage</span><strong>{date || '...'}</strong></div></div>
            <div className="presence-metric"><CheckCircle size={19} /><div><span>Déjà pointés</span><strong>{pointedCount}</strong></div></div>
            <div className="presence-metric"><Users size={19} /><div><span>En attente</span><strong>{remainingCount}</strong></div></div>
            <div className={`presence-status ${pointageOuvert ? 'is-open' : 'is-closed'}`}><Clock size={19} /><div><span>État du pointage</span><strong>{pointageMessage || (pointageOuvert ? 'Ouvert jusqu’à 09h30' : 'Fermé')}</strong></div></div>
          </section>

          {message && <div className="presence-alert success"><CheckCircle size={18} />{message}</div>}
          {error && <div className="presence-alert error"><Clock size={18} />{error}</div>}

          <section className="presence-list-card">
            <div className="presence-list-heading"><div><h2>Agents enregistrés</h2><p>{agents.length} agent(s) dans ce périmètre</p></div><span className="presence-window">07:00 <i /> 09:30</span></div>
            {loading ? <div className="presence-empty">Chargement des agents...</div> : isGlobalAdmin && !selectedDirection ? <div className="presence-empty"><Users size={34} /><h3>Sélectionnez une direction</h3><p>La liste des agents apparaîtra après le choix de la direction.</p></div> : agents.length === 0 ? <div className="presence-empty">Aucun agent trouvé pour ces critères.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="presence-table">
                  <thead><tr><th>Agent</th><th>Matricule</th><th>Bureau</th><th>Pointage</th><th>Action</th></tr></thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id}>
                        <td><strong>{agent.nom} {agent.postNom || ''} {agent.prenom}</strong></td>
                        <td>{agent.matricule || 'N.U'}</td>
                        <td>{agent.service || agent.directionNom || 'Non renseigné'}</td>
                        <td>{agent.presence ? <span style={{ color: '#15803d', fontWeight: 700 }}>Présent à {formatHour(agent.presence.heure)}</span> : <span style={{ color: '#64748b' }}>En attente</span>}</td>
                        <td>
                          <button type="button" className="presence-action" disabled={Boolean(agent.presence) || !pointageOuvert || savingId === agent.id} onClick={() => pointer(agent)}>
                            <CheckCircle size={16} /> {savingId === agent.id ? 'Enregistrement...' : agent.presence ? 'Pointé' : 'Pointer'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}