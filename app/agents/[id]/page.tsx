'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import RdcLogo from '@/components/RdcLogo';
import { getCurrentUser, type AdminUser, buildAuthHeaders, canManageAgent } from '@/lib/accessControl';
import {
  User,
  ChevronLeft,
  Building2,
  Phone,
  MapPin,
  FileText,
  Pencil,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  Download,
  Mail,
  ShieldCheck,
  Calendar,
  CreditCard,
  Briefcase,
  Network
} from 'lucide-react';
import { BACKEND_URL } from '@/lib/backend';
import '../agents.css';

function getAgentFolderFromUrl(url?: string) {
  if (!url) return 'Dossier inconnu';
  const segments = url.split('/').filter(Boolean);
  return segments.length >= 3 ? segments[2] : 'Dossier inconnu';
}

type DocumentRecord = {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  uploadedAt: string;
};

type Direction = {
  id: string;
  nom: string;
};

type Division = {
  id: string;
  nom: string;
  directionId: string;
};

type Grade = {
  id: string;
  nom: string;
};

type AgentDetails = {
  id: string;
  nom: string;
  postNom?: string;
  prenom: string;
  dateNaissance?: string;
  sexe?: string;
  nationalite?: string;
  matricule?: string;
  typeCarte?: string;
  numeroCarte?: string;
  expirationCarte?: string;
  lieuDelivrance?: string;
  directionId?: string;
  directionNom?: string;
  fonctionId?: string;
  fonctionNom?: string;
  serviceId?: string;
  service?: string;
  email?: string;
  telephone: string;
  avenue?: string;
  code?: string;
  statut: 'BROUILLON' | 'VERIFICATION' | 'VALIDE' | 'ACTIF' | 'REJETE' | 'APPROUVE';
  statutPaiement?: 'PAYE' | 'NON_PAYE';
  montantPaiement?: number;
  prime?: 'OUI' | 'NON';
  montantPrime?: number;
  datePaiement?: string;
  createdAt: string;
  documents?: DocumentRecord[];
};

export default function AgentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState<{
    directionId: string;
    fonctionId: string;
    divisionId: string;
    division: string;
    serviceId: string;
    service: string;
    email: string;
    telephone: string;
    statutPaiement: 'PAYE' | 'NON_PAYE';
    montantPaiement: string;
    prime: 'OUI' | 'NON';
    montantPrime: string;
  }>({
    directionId: '',
    fonctionId: '',
    divisionId: '',
    division: '',
    serviceId: '',
    service: '',
    email: '',
    telephone: '',
    statutPaiement: 'NON_PAYE',
    montantPaiement: '',
    prime: 'NON',
    montantPrime: '',
  });

  async function loadAgent() {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/agents/${id}`, { headers: buildAuthHeaders() });
      if (!res.ok) throw new Error('Agent introuvable');
      const data = await res.json();
      setAgent(data);
      setEditForm({
        directionId: data.directionId || '',
        fonctionId: data.fonctionId || '',
        divisionId: data.serviceId || '',
        division: data.service || '',
        serviceId: data.serviceId || '',
        service: data.service || '',
        email: data.email || '',
        telephone: data.telephone || '',
        statutPaiement: data.statutPaiement || 'NON_PAYE',
        montantPaiement: data.montantPaiement ? String(data.montantPaiement) : '',
        prime: data.prime || 'NON',
        montantPrime: data.montantPrime ? String(data.montantPrime) : '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDirections() {
    try {
      const res = await fetch(`${BACKEND_URL}/directions`);
      if (!res.ok) throw new Error('Impossible de charger les directions');
      setDirections(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  async function loadDivisions() {
    try {
      const res = await fetch(`${BACKEND_URL}/divisions`);
      if (!res.ok) throw new Error('Impossible de charger les divisions');
      setDivisions(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // run initial loads in parallel
        await Promise.all([loadAgent(), loadDirections(), loadDivisions()]);
      } catch (err) {
        console.error('Initial data loads failed', err);
      }
    })();

    (async () => {
      try {
        const user = await getCurrentUser();
        if (!cancelled) setCurrentUser(user);
      } catch (e) {
        console.warn('Impossible de charger l’utilisateur courant', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!agent || !currentUser) {
      setAccessDenied(false);
      return;
    }

    if (!canManageAgent(currentUser, agent)) {
      setAccessDenied(true);
    } else {
      setAccessDenied(false);
    }
  }, [agent, currentUser]);

  useEffect(() => {
    if (searchParams.get('edit') === '1' && agent) {
      setIsEditing(true);
      requestAnimationFrame(() => {
        const target = document.getElementById('agent-edit-top-anchor');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }, [agent, searchParams]);

  async function loadGrades() {
    try {
      const res = await fetch(`${BACKEND_URL}/fonctions`);
      if (!res.ok) throw new Error('Impossible de charger les grades');
      setGrades(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  async function updateStatus(newStatut: AgentDetails['statut']) {
    if (!agent) return;
    try {
      const res = await fetch(`${BACKEND_URL}/agents/${agent.id}`, {
        method: 'PUT',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ statut: newStatut }),
      });
      if (res.ok) {
        setAgent({ ...agent, statut: newStatut });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function updatePaymentStatus(newPaymentStatus: 'PAYE' | 'NON_PAYE') {
    if (!agent) return;
    try {
      const datePaiement = newPaymentStatus === 'PAYE' ? new Date().toISOString().split('T')[0] : undefined;
      const res = await fetch(`${BACKEND_URL}/agents/${agent.id}`, {
        method: 'PUT',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({
          statutPaiement: newPaymentStatus,
          datePaiement,
        }),
      });
      if (res.ok) {
        setAgent({ ...agent, statutPaiement: newPaymentStatus, datePaiement });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !agent) return;
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agentId', agent.id);

      const res = await fetch(`${BACKEND_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await loadAgent();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="office-layout">
        <OfficeHeader />
        <div className="office-body">
          <OfficeSidebar />
          <main className="office-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '16px' }}>Chargement du dossier agent...</p>
          </main>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="office-layout">
        <OfficeHeader />
        <div className="office-body">
          <OfficeSidebar />
          <main className="office-content">
            <div className="direction-container">
              <div className="direction-header">
                <div>
                  <h1>Accès refusé</h1>
                  <p>Ce dossier agent ne fait pas partie de votre direction.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="office-layout">
        <OfficeHeader />
        <div className="office-body">
          <OfficeSidebar />
          <main className="office-content">
            <Link href="/agents" className="back-link">
              <ChevronLeft size={18} /> Retour à la liste des agents
            </Link>
            <div className="alert error" style={{ marginTop: '20px' }}>
              Le dossier de cet agent est introuvable ou a été supprimé.
            </div>
          </main>
        </div>
      </div>
    );
  }

  const resolvedDirectionName =
    currentUser?.directionNom ||
    (currentUser?.directionId ? directions.find((d) => d.id === currentUser.directionId)?.nom : undefined);
  const agentDirectionName =
    agent.directionNom ||
    (agent.directionId ? directions.find((d) => d.id === agent.directionId)?.nom : undefined) ||
    resolvedDirectionName ||
    'Direction non affectée';

  const agentDirectionDisplay = agentDirectionName || resolvedDirectionName || 'Direction non affectée';

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="agent-detail-page">
            {/* BACK LINK */}
            <div className="detail-top-row">
              <Link href="/agents" className="back-link">
                <ChevronLeft size={18} />
                Retour aux agents
              </Link>
            </div>

            <div className="agent-profile-banner">
              <div className="agent-profile-banner-row">
                <RdcLogo size="lg" variant="full" />

                <div className="agent-profile-identity">
                  <span className="agent-profile-tag">
                    Agent • {agentDirectionName}
                  </span>
                  <p>Secrétariat Général à la Décentralisation • RDC</p>
                </div>
              </div>

              <div className="agent-hierarchy-path">
                <span className="path-segment path-primary">RDC</span>
                <span className="path-separator">&gt;</span>
                <span>Secrétariat Général à la Décentralisation</span>
                <span className="path-separator">&gt;</span>
                <span className="path-chip">Division: {agentDirectionName || 'Non affecté'}</span>
                <span className="path-separator">&gt;</span>
                <span className="path-chip path-chip-secondary">Sous-division: {agent.service || 'Général'}</span>
                <span className="path-separator">&gt;</span>
                <span className="path-chip path-chip-accent">Grade: {agent.fonctionNom || 'Non spécifié'}</span>
              </div>
            </div>

            <div className="agent-card-header">
              <div className="agent-card-header-left">
                <div className="agent-card-avatar">
                  {agent.nom ? agent.nom.charAt(0) : 'A'}
                  {agent.prenom ? agent.prenom.charAt(0) : ''}
                </div>

                <div className="agent-card-header-meta">
                  <h1 className="agent-card-title">
                    {(agent.nom || 'Agent')} {agent.postNom || ''} {agent.prenom || ''}
                  </h1>
                  <p className="agent-card-subtitle">
                    Matricule: <strong>{agent.matricule || 'N.U'}</strong> | Créé le{' '}
                    {new Date(agent.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* ACTION STATUT BUTTONS */}
              <div className="agent-card-actions">
                <span
                  className={`status-badge ${
                    agent.statut === 'ACTIF' || agent.statut === 'VALIDE' || agent.statut === 'APPROUVE'
                      ? 'valide'
                      : agent.statut === 'VERIFICATION'
                      ? 'verification'
                      : agent.statut === 'REJETE'
                      ? 'rejete'
                      : 'brouillon'
                  }`}
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  DOSSIER: {agent.statut === 'ACTIF' || agent.statut === 'VALIDE' || agent.statut === 'APPROUVE'
                    ? 'VALIDÉ'
                    : agent.statut === 'VERIFICATION'
                    ? 'EN VÉRIFICATION'
                    : agent.statut === 'REJETE'
                    ? 'REJETÉ'
                    : 'BROUILLON'}
                </span>

                <span
                  style={{
                    fontSize: '13px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 800,
                    backgroundColor: agent.statutPaiement === 'PAYE' ? '#dcfce7' : '#fef3c7',
                    color: agent.statutPaiement === 'PAYE' ? '#15803d' : '#b45309',
                    border: `1px solid ${agent.statutPaiement === 'PAYE' ? '#bbf7d0' : '#fde68a'}`,
                  }}
                >
                  PAIEMENT: {agent.statutPaiement === 'PAYE' ? 'OUI' : 'NON'}
                </span>

                {agent.statutPaiement !== 'PAYE' ? (
                  <button
                    style={{
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => updatePaymentStatus('PAYE')}
                  >
                    <CreditCard size={16} /> Marquer comme OUI (Payé)
                  </button>
                ) : (
                  <button
                    style={{
                      background: '#ea580c',
                      color: 'white',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => updatePaymentStatus('NON_PAYE')}
                  >
                    <Clock size={16} /> Marquer comme NON (Non Payé)
                  </button>
                )}

                {agent.statut === 'BROUILLON' && (
                  <button
                    style={{
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => updateStatus('VALIDE')}
                  >
                    <CheckCircle size={16} /> Valider Dossier
                  </button>
                )}

                {agent.statut === 'VERIFICATION' && (
                  <button
                    style={{
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => updateStatus('VALIDE')}
                  >
                    <CheckCircle size={16} /> Valider Dossier
                  </button>
                )}

                {(agent.statut === 'ACTIF' || agent.statut === 'VALIDE' || agent.statut === 'APPROUVE') && (
                  <button
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => updateStatus('VERIFICATION')}
                  >
                    <Clock size={16} /> Revenir en vérification
                  </button>
                )}

                {agent.statut !== 'REJETE' && agent.statut !== 'ACTIF' && agent.statut !== 'VALIDE' && agent.statut !== 'APPROUVE' && (
                  <button
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => updateStatus('REJETE')}
                  >
                    <XCircle size={16} /> Rejeter
                  </button>
                )}

                <button
                  className="action-button"
                  style={{
                    background: isEditing ? '#f8fafc' : '#2563eb',
                    color: isEditing ? '#1f2937' : 'white',
                    border: `1px solid ${isEditing ? '#cbd5e1' : 'transparent'}`,
                  }}
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setEditError('');
                    if (agent) {
                      setEditForm({
                        directionId: agent.directionId || '',
                        fonctionId: agent.fonctionId || '',
                        divisionId: agent.serviceId || '',
                        division: agent.service || '',
                        serviceId: agent.serviceId || '',
                        service: agent.service || '',
                        email: agent.email || '',
                        telephone: agent.telephone || '',
                        statutPaiement: agent.statutPaiement || 'NON_PAYE',
                        montantPaiement: agent.montantPaiement ? String(agent.montantPaiement) : '',
                        prime: agent.prime || 'NON',
                        montantPrime: agent.montantPrime ? String(agent.montantPrime) : '',
                      });
                    }
                  }}
                >
                  {isEditing ? 'Annuler' : 'Modifier'}
                </button>

                {isEditing && (
                  <button
                    className="action-button"
                    style={{
                      background: '#16a34a',
                      color: 'white',
                    }}
                    onClick={async () => {
                      if (!agent) return;
                      if (!editForm.telephone.trim() || !editForm.fonctionId) {
                        setEditError('Le téléphone et le grade sont obligatoires.');
                        return;
                      }
                      if (editForm.statutPaiement === 'PAYE') {
                        const montantValue = Number(editForm.montantPaiement);
                        if (!editForm.montantPaiement.trim() || Number.isNaN(montantValue) || montantValue <= 0) {
                          setEditError('Veuillez saisir un montant de paiement valide lorsque le paiement est marqué comme payé.');
                          return;
                        }
                      }
                      if (editForm.prime === 'OUI') {
                        const montantPrimeValue = Number(editForm.montantPrime);
                        if (!editForm.montantPrime.trim() || Number.isNaN(montantPrimeValue) || montantPrimeValue <= 0) {
                          setEditError('Veuillez saisir un montant de prime valide lorsque la prime est accordée.');
                          return;
                        }
                      }
                      setSaving(true);
                      setEditError('');

                      try {
                        const response = await fetch(`${BACKEND_URL}/agents/${agent.id}`, {
                          method: 'PUT',
                          headers: buildAuthHeaders('application/json'),
                          body: JSON.stringify({
                            directionId: editForm.directionId || undefined,
                            fonctionId: editForm.fonctionId || undefined,
                            divisionId: editForm.divisionId || undefined,
                            division: editForm.division || undefined,
                            email: editForm.email.trim() || undefined,
                            telephone: editForm.telephone,
                            statutPaiement: editForm.statutPaiement,
                            montantPaiement: editForm.statutPaiement === 'PAYE' ? Number(editForm.montantPaiement) : 0,
                            prime: editForm.prime,
                            montantPrime: editForm.prime === 'OUI' ? Number(editForm.montantPrime) : 0,
                          }),
                        });

                        if (!response.ok) {
                          const errorText = await response.text();
                          throw new Error(errorText || 'Erreur lors de la mise à jour');
                        }

                        const updatedAgent = await response.json();
                        setAgent(updatedAgent);
                        setIsEditing(false);
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Erreur de mise à jour';
                        setEditError(message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    <CheckCircle size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                )}
              </div>
            </div>

            {isEditing && (
              <div id="agent-edit-top-anchor" style={{ marginBottom: 18, background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#1d4ed8', fontWeight: 800 }}>
                  <Pencil size={16} /> Modification rapide
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <label className="agent-field-label">Direction</label>
                    <select
                      value={editForm.directionId}
                      onChange={(e) => {
                        const selectedDirectionId = e.target.value;
                        setEditForm((prev) => ({
                          ...prev,
                          directionId: selectedDirectionId,
                          serviceId: '',
                          service: '',
                        }));
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Choisir direction</option>
                      {directions.map((direction) => (
                        <option key={direction.id} value={direction.id}>{direction.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="agent-field-label">Grade</label>
                    <select
                      value={editForm.fonctionId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, fonctionId: e.target.value }))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Choisir un grade</option>
                      {grades.map((fonction) => (
                        <option key={fonction.id} value={fonction.id}>{fonction.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="agent-field-label">Division</label>
                    <select
                      value={editForm.divisionId}
                      onChange={(e) => {
                        const selected = divisions.find((s) => s.id === e.target.value);
                        setEditForm((prev) => ({
                          ...prev,
                          divisionId: e.target.value,
                          division: selected?.nom || '',
                        }));
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Choisir division</option>
                      {divisions
                        .filter((s) => !editForm.directionId || s.directionId === editForm.directionId)
                        .map((division) => (
                          <option key={division.id} value={division.id}>{division.nom}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="agent-field-label">Téléphone</label>
                    <input
                      type="tel"
                      value={editForm.telephone}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, telephone: e.target.value }))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label className="agent-field-label">Email Pro</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label className="agent-field-label">Paiement</label>
                    <select
                      value={editForm.statutPaiement}
                      onChange={(e) => {
                        const newValue = e.target.value as 'PAYE' | 'NON_PAYE';
                        setEditForm((prev) => ({ ...prev, statutPaiement: newValue }));
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="NON_PAYE">Non payé</option>
                      <option value="PAYE">Payé</option>
                    </select>
                  </div>
                  {editForm.statutPaiement === 'PAYE' && (
                    <div>
                      <label className="agent-field-label">Montant du paiement</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.montantPaiement}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, montantPaiement: e.target.value }))}
                        placeholder="Montant du paiement"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  )}
                  <div>
                    <label className="agent-field-label">Prime accordée</label>
                    <select
                      value={editForm.prime}
                      onChange={(e) => {
                        const value = e.target.value as 'OUI' | 'NON';
                        setEditForm((prev) => ({
                          ...prev,
                          prime: value,
                          montantPrime: value === 'OUI' ? prev.montantPrime : '',
                        }));
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="NON">Non</option>
                      <option value="OUI">Oui</option>
                    </select>
                  </div>
                  {editForm.prime === 'OUI' && (
                    <div>
                      <label className="agent-field-label">Montant de la prime</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.montantPrime}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, montantPrime: e.target.value }))}
                        placeholder="Montant de la prime"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  )}
                </div>
                {editError && <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 700 }}>{editError}</div>}
              </div>
            )}

            {/* GRID OF SECTIONS */}
            <div className="agent-section-grid">
              {/* SECTION 1: IDENTITE */}
              <div className="agent-section-card">
                <div className="agent-section-card-header">
                  <User size={20} />
                  <h2>Identité &amp; Pièce d&apos;identité</h2>
                </div>

                <div className="agent-section-grid-double">
                  <div>
                    <label className="agent-field-label">Sexe</label>
                    <p className="agent-field-value">
                      {agent.sexe === 'M' ? 'Masculin' : agent.sexe === 'F' ? 'Féminin' : 'Non renseigné'}
                    </p>
                  </div>

                  <div>
                    <label className="agent-field-label">Nationalité</label>
                    <p className="agent-field-value">{agent.nationalite || 'Congolaise'}</p>
                  </div>

                  <div>
                    <label className="agent-field-label">Date de naissance</label>
                    <p className="agent-field-value">{agent.dateNaissance || 'Non renseignée'}</p>
                  </div>

                  <div>
                    <label className="agent-field-label">Type de carte</label>
                    <p className="agent-field-value">{agent.typeCarte || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <label className="agent-field-label">Numéro de carte</label>
                    <p className="agent-field-value">{agent.numeroCarte || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <label className="agent-field-label">Expiration carte</label>
                    <p className="agent-field-value">{agent.expirationCarte || 'Non renseignée'}</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: AFFECTATION */}
              <div className="agent-section-card">
                <div className="agent-section-card-header">
                  <Briefcase size={20} />
                  <h2>Affectation Professionnelle</h2>
                </div>

                <div className="agent-section-grid-double">
                  <div>
                    <label className="agent-field-label">Direction</label>
                    {isEditing ? (
                      <select
                        value={editForm.directionId}
                        onChange={(e) => {
                          const selectedDirectionId = e.target.value;
                          setEditForm((prev) => ({
                            ...prev,
                            directionId: selectedDirectionId,
                            serviceId: '',
                            service: '',
                          }));
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">Choisir direction</option>
                        {directions.map((direction) => (
                          <option key={direction.id} value={direction.id}>
                            {direction.nom}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="agent-field-value">{agentDirectionDisplay}</p>
                    )}
                  </div>

                  <div>
                    <label className="agent-field-label">Grade</label>
                    {isEditing ? (
                      <select
                        value={editForm.fonctionId}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, fonctionId: e.target.value }))}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">Choisir un grade</option>
                        {grades.map((fonction) => (
                          <option key={fonction.id} value={fonction.id}>
                            {fonction.nom}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="agent-field-value">{agent.fonctionNom || 'Non spécifié'}</p>
                    )}
                  </div>

                  <div>
                    <label className="agent-field-label">Division</label>
                    {isEditing ? (
                      <select
                        value={editForm.divisionId}
                        onChange={(e) => {
                          const selected = divisions.find((s) => s.id === e.target.value);
                          setEditForm((prev) => ({
                            ...prev,
                            divisionId: e.target.value,
                            division: selected?.nom || '',
                          }));
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">Choisir division</option>
                        {divisions
                          .filter((s) => !editForm.directionId || s.directionId === editForm.directionId)
                          .map((division) => (
                            <option key={division.id} value={division.id}>
                              {division.nom}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <p className="agent-field-value">{agent.service || 'Général'}</p>
                    )}
                  </div>

                  <div>
                    <label className="agent-field-label">Matricule Officiel</label>
                    <p className="agent-field-value accent">{agent.matricule || 'N.U'}</p>
                  </div>
                </div>
              </div>

              {/* SECTION: STATUT DE PAIEMENT & REMUNERATION */}
              <div className="agent-section-card">
                <div className="agent-section-card-header">
                  <CreditCard size={20} />
                  <h2>Statut de Paie &amp; Rémunération</h2>
                </div>

                <div className="agent-section-grid-double">
                  <div>
                    <label className="agent-field-label">Paiement Effectué (Oui / Non)</label>
                    {isEditing ? (
                      <select
                        value={editForm.statutPaiement}
                        onChange={(e) => {
                          const newValue = e.target.value as 'PAYE' | 'NON_PAYE';
                          setEditForm((prev) => ({
                            ...prev,
                            statutPaiement: newValue,
                          }));
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="NON_PAYE">Non (En attente)</option>
                        <option value="PAYE">Oui (Payé)</option>
                      </select>
                    ) : (
                      <p className="agent-field-value">
                        {agent.statutPaiement === 'PAYE' ? (
                          <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> OUI (Règlement Effectué)
                          </span>
                        ) : (
                          <span style={{ color: '#ea580c', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} /> NON (Par défaut - En Attente de Virement)
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="agent-field-label">Rémunération / Prime</label>
                    <p className="agent-field-value">
                      {agent.prime === 'OUI' ? 'OUI' : 'NON'}
                      {agent.prime === 'OUI' && agent.montantPrime != null ? (
                        <span style={{ display: 'block', marginTop: '6px', color: '#0f172a', fontWeight: 500 }}>
                          Montant de la prime : {agent.montantPrime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div>
                    <label className="agent-field-label">Montant du paiement</label>
                    <p className="agent-field-value">
                      {agent.montantPaiement != null && agent.montantPaiement > 0
                        ? `${agent.montantPaiement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CDF`
                        : 'Aucun montant enregistré'}
                    </p>
                  </div>

                  <div>
                    <label className="agent-field-label">Date du dernier paiement</label>
                    <p className="agent-field-value">{agent.datePaiement ? agent.datePaiement : 'Aucun paiement enregistré'}</p>
                  </div>

                  <div className="agent-section-row-full">
                    <label className="agent-field-label">Action rapide paie</label>
                    <div style={{ marginTop: '4px' }}>
                      <button
                        style={{
                          background: agent.statutPaiement === 'PAYE' ? '#fff7ed' : '#f0fdf4',
                          color: agent.statutPaiement === 'PAYE' ? '#c2410c' : '#15803d',
                          border: `1px solid ${agent.statutPaiement === 'PAYE' ? '#ffedd5' : '#bbf7d0'}`,
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        onClick={() => updatePaymentStatus(agent.statutPaiement === 'PAYE' ? 'NON_PAYE' : 'PAYE')}
                      >
                        {agent.statutPaiement === 'PAYE' ? 'Basculer vers NON PAYÉ' : 'Basculer vers PAYÉ'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: CONTACT & ADRESSE */}
              <div className="agent-section-card">
                <div className="agent-section-card-header">
                  <Phone size={20} />
                  <h2>Contact &amp; Adresse</h2>
                </div>

                <div className="agent-section-grid-double">
                  <div>
                    <label className="agent-field-label">Téléphone principal</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.telephone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, telephone: e.target.value }))}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    ) : (
                      <p className="agent-field-value">{agent.telephone}</p>
                    )}
                  </div>

                  <div>
                    <label className="agent-field-label">Email Pro</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    ) : (
                      <p className="agent-field-value">{agent.email || 'Non renseigné'}</p>
                    )}
                  </div>

                  <div className="agent-section-row-full">
                    <label className="agent-field-label">Adresse de résidence</label>
                    <p className="agent-field-value">
                      {agent.avenue || 'Adresse non renseignée'} {agent.code ? `(Code: ${agent.code})` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: DOCUMENTS ADMINISTRATIFS */}
              <div className="agent-section-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #e8edf5',
                    paddingBottom: '14px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2563eb' }}>
                    <FileText size={20} />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                      Pièces justificatives
                    </h2>
                  </div>

                  <label
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={14} />
                    {uploading ? 'Chargement...' : 'Ajouter document'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      hidden
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(!agent.documents || agent.documents.length === 0) && (
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                      Aucun document attaché à ce dossier.
                    </p>
                  )}

                  {(agent.documents || []).filter((d, i, a) => a.findIndex(x => x.id === d.id) === i).map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} className="text-blue-600" />
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block', color: '#111827' }}>
                            {doc.name}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{doc.size}</span>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                            <strong style={{ color: '#334155' }}>Dossier :</strong>{' '}
                            <span style={{ color: '#2563eb' }}>{getAgentFolderFromUrl(doc.url)}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                            <strong style={{ color: '#334155' }}>Chemin :</strong>{' '}
                            {doc.url ? (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2563eb', textDecoration: 'underline' }}
                              >
                                {doc.url}
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Aucun fichier</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {doc.url ? (
                        <a
                          href={doc.url}
                          download={doc.name}
                          style={{
                            background: '#e2e8f0',
                            padding: '6px',
                            borderRadius: '6px',
                            color: '#334155',
                            display: 'flex',
                          }}
                        >
                          <Download size={16} />
                        </a>
                      ) : (
                        <button
                          disabled
                          style={{
                            background: '#f1f5f9',
                            padding: '6px',
                            borderRadius: '6px',
                            color: '#94a3b8',
                            display: 'flex',
                            border: 'none',
                            cursor: 'not-allowed',
                          }}
                        >
                          <Download size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
