'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  DoorOpen,
  Users,
  CheckCircle,
  X
} from 'lucide-react';
import Link from 'next/link';

import { useRouter } from 'next/navigation';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import RdcLogo from '@/components/RdcLogo';
import { BACKEND_URL } from '@/lib/backend';
import { buildAuthHeaders, getCurrentUser, isSuperAdmin } from '@/lib/accessControl';
import '@/app/directions/directions.css';
import '@/app/agents/agents.css';

type Direction = {
  id: string;
  nom: string;
  description?: string;
  statut?: string;
  createdAt?: string;
};

type Division = {
  id: string;
  nom: string;
  directionId?: string | null;
  directionNom?: string | null;
  description?: string | null;
  statut?: string;
  createdAt?: string;
};

type Service = {
  id: string;
  nom: string;
  directionId: string;
  divisionId?: string;
  divisionNom?: string;
  codeService?: string;
  chefService?: string;
  description?: string;
  statut?: string;
};

type Bureau = {
  nom: string;
  code: string;
  chef: string;
  description: string;
  divisionId?: string;
  divisionNom?: string;
};

export default function DivisionManager() {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [currentUser, setCurrentUser] = useState<{ directionId?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [directionChief, setDirectionChief] = useState('');
  const [divisionInput, setDivisionInput] = useState('');
  const [divisionNames, setDivisionNames] = useState<string[]>([]);
  const [bureauEntries, setBureauEntries] = useState<Bureau[]>([]);
  const [bureauName, setBureauName] = useState('');
  const [bureauCode, setBureauCode] = useState('');
  const [bureauChief, setBureauChief] = useState('');
  const [bureauDescription, setBureauDescription] = useState('');
  const [bureauDivisionName, setBureauDivisionName] = useState('');
  const [wizardStep, setWizardStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadDirections() {
    try {
      setLoading(true);
      const [resDir, resDiv, resSrv] = await Promise.all([
        fetch('/api/directions'),
        fetch('/api/divisions'),
        fetch('/api/services'),
      ]);
      const dataDir = await resDir.json();
      const dataDiv = await resDiv.json();
      const dataSrv = await resSrv.json();

      setDirections(Array.isArray(dataDir) ? dataDir : dataDir.data ?? []);
      setDivisions(Array.isArray(dataDiv) ? dataDiv : dataDiv.data ?? []);
      setServices(Array.isArray(dataSrv) ? dataSrv : dataSrv.data ?? []);
    } catch (err) {
      console.error(err);
      setDirections([]);
      setDivisions([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDirections();

    let mounted = true;
    getCurrentUser().then((user) => {
      if (mounted) {
        setCurrentUser(user);
        if (user && !isSuperAdmin(user)) {
          router.replace('/');
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  function resetForm() {
    setNom('');
    setDescription('');
    setEditId(null);
    setOpenModal(false);
  }

  function resetWizard() {
    setNom('');
    setDescription('');
    setDirectionChief('');
    setDivisionInput('');
    setDivisionNames([]);
    setBureauEntries([]);
    setBureauName('');
    setBureauCode('');
    setBureauChief('');
    setBureauDescription('');
    setBureauDivisionName(divisionNames[0] ?? '');
    setWizardStep(1);
    setError('');
    setSuccess('');
  }

  function editDirection(item: Direction) {
    setEditId(item.id);
    setNom(item.nom);
    setDescription(item.description || '');
    setOpenModal(true);
  }

  function openCreateWizard() {
    resetWizard();
    setWizardStep(1);
    setError('');
    setSuccess('');
    setShowCreateWizard(true);
  }

  function addDivisionName() {
    const value = divisionInput.trim();
    if (!value) {
      setError('Le nom de la division est requis');
      return;
    }
    if (divisionNames.includes(value)) {
      setError('Cette division a déjà été ajoutée');
      return;
    }
    setDivisionNames([...divisionNames, value]);
    setDivisionInput('');
    setError('');
  }

  function removeDivisionName(index: number) {
    setDivisionNames((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addBureauEntry() {
    const name = bureauName.trim();
    if (!name) {
      setError('Le nom du bureau est requis');
      return;
    }
    if (bureauEntries.some((bureau) => bureau.nom.toLowerCase() === name.toLowerCase())) {
      setError('Ce bureau a déjà été ajouté');
      return;
    }

    const divisionNameForBureau = bureauDivisionName.trim() || divisionNames[0] || '';
    if (!divisionNameForBureau) {
      setError('Veuillez d’abord créer au moins une division avant d’ajouter un bureau.');
      return;
    }

    setBureauEntries((prev) => [
      ...prev,
      {
        nom: name,
        code: bureauCode.trim() || `BRC-${Math.floor(Math.random() * 900 + 100)}`,
        chef: bureauChief.trim(),
        description: bureauDescription.trim(),
        divisionNom: divisionNameForBureau,
      },
    ]);

    setBureauName('');
    setBureauCode('');
    setBureauChief('');
    setBureauDescription('');
    setBureauDivisionName(divisionNameForBureau);
    setError('');
  }

  function removeBureauEntry(index: number) {
    setBureauEntries((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function saveDirection() {
    if (!nom.trim()) {
      setError('Le nom de la direction est obligatoire');
      return;
    }

    if (!editId && currentUser?.directionId) {
      setError('Vous ne pouvez pas créer de nouvelles divisions. Seul le super-admin peut le faire.');
      return;
    }

    try {
      setError('');
      const payload = {
        nom,
        description,
        statut: 'ACTIF',
      };

      const url = editId
        ? `${BACKEND_URL}/directions/${editId}`
        : `${BACKEND_URL}/directions`;

      const response = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erreur enregistrement');
      }

      setSuccess(
        editId
          ? 'Direction modifiée avec succès'
          : 'Direction créée avec succès'
      );

      resetForm();
      loadDirections();

      setTimeout(() => {
        setSuccess('');
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur enregistrement';
      setError(msg);
    }
  }

  async function submitCreateWizard() {
    if (!nom.trim()) {
      setError('Le nom de la direction est obligatoire');
      return;
    }

    if (!directionChief.trim()) {
      setError('Le nom du directeur de direction est requis');
      return;
    }

    if (divisionNames.length === 0) {
      setError('Veuillez ajouter au moins une division');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const directionPayload = {
        nom,
        description: `${description.trim()}\nDirecteur : ${directionChief}`,
        statut: 'ACTIF',
      };

      const directionRes = await fetch('/api/directions', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify(directionPayload),
      });

      if (!directionRes.ok) {
        throw new Error('Impossible de créer la direction');
      }

      const createdDirection = await directionRes.json();
      const createdDirectionId = createdDirection.id;

      const divisionPromises = divisionNames.map((divisionNom) =>
        fetch('/api/divisions', {
          method: 'POST',
          headers: buildAuthHeaders('application/json'),
          body: JSON.stringify({
            nom: divisionNom,
            directionId: createdDirectionId,
            directionNom: nom,
            description: 'Division rattachée',
            statut: 'ACTIF',
          }),
        })
      );

      const divisionResponses = await Promise.all(divisionPromises);
      const divisionPayloads: Array<{
        id?: string;
        nom?: string;
        directionId?: string;
        directionNom?: string;
        description?: string;
        statut?: string;
      }> = [];
      for (const response of divisionResponses) {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const detail = payload?.error || payload?.message || 'Erreur inconnue';
          throw new Error(`Impossible de créer une division: ${detail}`);
        }
        divisionPayloads.push(payload);
      }

      const createdDivisions = divisionPayloads;
      const divisionIdByName = new Map<string, string>();
      for (const created of createdDivisions) {
        const divisionName = created?.nom;
        const divisionId = created?.id;
        if (divisionName && divisionId) {
          divisionIdByName.set(String(divisionName), String(divisionId));
        }
      }

      const bureauPromises = bureauEntries.map((bureau) => {
        const divisionId = bureau.divisionNom ? divisionIdByName.get(bureau.divisionNom) : undefined;
        return fetch('/api/services', {
          method: 'POST',
          headers: buildAuthHeaders('application/json'),
          body: JSON.stringify({
            nom: bureau.nom,
            directionId: createdDirectionId,
            directionNom: nom,
            divisionId,
            divisionNom: bureau.divisionNom || divisionNames[0] || nom,
            codeService: bureau.code,
            chefService: bureau.chef,
            description: bureau.description,
            statut: 'ACTIF',
          }),
        });
      });

      const bureauResponses = await Promise.all(bureauPromises);
      for (const response of bureauResponses) {
        if (!response.ok) {
          throw new Error('Impossible de créer un bureau');
        }
      }

      setSuccess('Direction créée avec succès. Divisions et bureau enregistrés.');
      resetWizard();
      setShowCreateWizard(false);
      loadDirections();

      setTimeout(() => setSuccess(''), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur pendant la création';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function deleteDirection(id: string) {
    if (currentUser?.directionId) {
      setError('Vous ne pouvez pas supprimer une division. Seul le super-admin peut le faire.');
      return;
    }

    const confirmDelete = confirm('Supprimer cette direction ?');
    if (!confirmDelete) return;

    try {
      await fetch(`/api/directions/${id}`, {
        method: 'DELETE',
      });
      loadDirections();
    } catch (err) {
      console.error(err);
    }
  }

  const filteredDirections = directions
    .filter((item) => item.nom.toLowerCase().includes(search.toLowerCase()))
    .filter((item) => !currentUser?.directionId || item.id === currentUser.directionId);

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="direction-container">
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px 28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <RdcLogo size="lg" variant="full" />

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      textTransform: 'uppercase',
                    }}
                  >
                    STRUCTURES DÉRAGÉES • RDC
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Secrétariat Général à la Décentralisation
                  </p>
                </div>
              </div>
            </div>

            <div className="direction-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gestion des directions</span>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>Liste des directions</h2>
              </div>
              <button
                className="primary-button"
                onClick={openCreateWizard}
                disabled={Boolean(currentUser?.directionId)}
              >
                <Plus size={18} />
                Nouvelle direction
              </button>
            </div>

            {showCreateWizard && (
              <div className="agents-panel direction-wizard">
                <div className="agent-card-header">
                  <div className="agent-card-header-left">
                    <div className="agent-card-avatar">D</div>
                    <div className="agent-card-header-meta">
                      <h2 className="agent-card-title">Créer une direction</h2>
                      <p className="agent-card-subtitle">Ajoutez la direction, ses divisions et ses bureaux en un seul flux.</p>
                    </div>
                  </div>
                  <button type="button" className="secondary-btn" onClick={() => setShowCreateWizard(false)} style={{ marginLeft: 'auto' }}>
                    Fermer
                  </button>
                </div>

                <div className="wizard-stepper">
                  <div className={wizardStep === 1 ? 'wizard-step active' : wizardStep > 1 ? 'wizard-step completed' : 'wizard-step'}>
                    <span>1</span>
                    <div>
                      <strong>Direction</strong>
                      <p>Nom, description et directeur</p>
                    </div>
                  </div>
                  <div className={wizardStep === 2 ? 'wizard-step active' : wizardStep > 2 ? 'wizard-step completed' : 'wizard-step'}>
                    <span>2</span>
                    <div>
                      <strong>Divisions</strong>
                      <p>Renseignez les structures rattachées</p>
                    </div>
                  </div>
                  <div className={wizardStep === 3 ? 'wizard-step active' : 'wizard-step'}>
                    <span>3</span>
                    <div>
                      <strong>Bureau</strong>
                      <p>Détails du bureau principal</p>
                    </div>
                  </div>
                </div>
                <div className="wizard-progress">
                  <div className="wizard-progress-meta">
                    <span>Étape {wizardStep} sur 3</span>
                    <strong>{wizardStep === 1 ? 'Direction' : wizardStep === 2 ? 'Divisions' : 'Bureau'}</strong>
                  </div>
                  <div className="wizard-progress-bar">
                    <div className={`wizard-progress-fill step-${wizardStep}`} />
                  </div>
                </div>

                <div className="wizard-card">
                  {error && <div className="alert error">{error}</div>}
                  {success && <div className="alert success">{success}</div>}

                  <div className="wizard-panel" key={wizardStep}>
                    {wizardStep === 1 && (
                      <div className="wizard-form">
                        <div className="form-row">
                          <label>Intitulé de la direction</label>
                          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Direction des Finances" />
                        </div>
                        <div className="form-row">
                          <label>Description</label>
                          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mission, périmètre et objectifs" />
                        </div>
                        <div className="form-row">
                          <label>Directeur de la direction</label>
                          <input value={directionChief} onChange={(e) => setDirectionChief(e.target.value)} placeholder="Nom du directeur" />
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="wizard-form">
                        <div className="form-row">
                          <label>Nom de la division</label>
                          <div className="division-add-row">
                            <input value={divisionInput} onChange={(e) => setDivisionInput(e.target.value)} placeholder="Ex: Division Paie" />
                            <button type="button" className="secondary-btn" onClick={addDivisionName}>Ajouter</button>
                          </div>
                        </div>
                        <div className="division-list">
                          {divisionNames.length === 0 ? (
                            <p>Aucune division ajoutée pour le moment.</p>
                          ) : (
                            divisionNames.map((division, index) => (
                              <div key={division + index} className="division-chip">
                                <span>{division}</span>
                                <button type="button" onClick={() => removeDivisionName(index)}>
                                  <X size={14} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="wizard-form">
                        <div className="form-row">
                          <label>Division associée</label>
                          <select value={bureauDivisionName} onChange={(e) => setBureauDivisionName(e.target.value)}>
                            <option value="">Sélectionner une division</option>
                            {divisionNames.map((division) => (
                              <option key={division} value={division}>{division}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-row">
                          <label>Nom du bureau</label>
                          <input value={bureauName} onChange={(e) => setBureauName(e.target.value)} placeholder="Ex: Bureau de Coordination" />
                        </div>
                        <div className="form-row">
                          <label>Code du bureau</label>
                          <input value={bureauCode} onChange={(e) => setBureauCode(e.target.value)} placeholder="Ex: BRC-104" />
                        </div>
                        <div className="form-row">
                          <label>Chef du bureau</label>
                          <input value={bureauChief} onChange={(e) => setBureauChief(e.target.value)} placeholder="Nom du chef de bureau" />
                        </div>
                        <div className="form-row">
                          <label>Description du bureau</label>
                          <textarea value={bureauDescription} onChange={(e) => setBureauDescription(e.target.value)} placeholder="Rôle, activité ou périmètre" />
                        </div>
                        <div className="form-row">
                          <button type="button" className="secondary-btn" onClick={addBureauEntry}>
                            <Plus size={16} />
                            Ajouter un bureau
                          </button>
                        </div>
                        <div className="division-list">
                          {bureauEntries.length === 0 ? (
                            <p>Aucun bureau ajouté pour le moment.</p>
                          ) : (
                            bureauEntries.map((bureau, index) => (
                              <div key={`${bureau.nom}-${index}`} className="division-chip" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{bureau.nom}</span>
                                  <button type="button" onClick={() => removeBureauEntry(index)}>
                                    <X size={14} />
                                  </button>
                                </div>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                  {bureau.divisionNom || 'Division non affectée'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {wizardStep === 3 && (
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '18px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
                        display: 'grid',
                        gap: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a' }}>Résumé final</h4>
                          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Vérifiez la structure avant de valider la création.</p>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#2563eb',
                            backgroundColor: '#dbeafe',
                            padding: '6px 10px',
                            borderRadius: '999px',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          Prêt à valider
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            Direction
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{nom || 'Intitulé non renseigné'}</div>
                          {description ? <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{description}</div> : null}
                          {directionChief ? <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Directeur : {directionChief}</div> : null}
                        </div>

                        <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                            Divisions ({divisionNames.length})
                          </div>
                          {divisionNames.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {divisionNames.map((division, index) => (
                                <span key={`${division}-${index}`} style={{ fontSize: '13px', color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '6px 10px', borderRadius: '999px', border: '1px solid #bfdbfe' }}>
                                  {division}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Aucune division ajoutée.</div>
                          )}
                        </div>

                        <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                            Bureaux ({bureauEntries.length})
                          </div>
                          {bureauEntries.length > 0 ? (
                            <div style={{ display: 'grid', gap: '8px' }}>
                              {bureauEntries.map((bureau, index) => (
                                <div key={`${bureau.nom}-${index}`} style={{ fontSize: '13px', color: '#334155', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <strong>{bureau.nom}</strong>
                                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                                    {bureau.divisionNom || 'Division non affectée'}{bureau.code ? ` • ${bureau.code}` : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Aucun bureau ajouté.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="wizard-actions">
                    {wizardStep > 1 ? (
                      <button type="button" className="secondary-btn" onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}>
                        Retour
                      </button>
                    ) : null}
                    {wizardStep < 3 ? (
                      <button type="button" className="primary-btn" onClick={() => setWizardStep((prev) => Math.min(3, prev + 1))}>
                        Suivant
                      </button>
                    ) : (
                      <button type="button" className="primary-btn" onClick={submitCreateWizard} disabled={loading}>
                        {loading ? 'Création en cours…' : 'Créer la direction'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="agent-stat-grid">
                  <div className="agent-stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#2563eb' }}>
                      <Building2 size={26} />
                    </div>
                    <div>
                      <span>Directions Centrales</span>
                      <strong>{directions.length}</strong>
                    </div>
                  </div>

                  <div className="agent-stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#16a34a' }}>
                      <CheckCircle size={26} />
                    </div>
                    <div>
                      <span>Actives</span>
                      <strong>{directions.filter((d) => d.statut === 'ACTIF' || !d.statut).length}</strong>
                    </div>
                  </div>

                  <div className="agent-stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#7c3aed' }}>
                      <Users size={26} />
                    </div>
                    <div>
                      <span>Métiers RH</span>
                      <strong>GPEC &amp; Postes</strong>
                    </div>
                  </div>
                </div>

                <div className="direction-toolbar">
              <div className="search-box">
                <Search size={19} />
                <input
                  placeholder="Rechercher une direction..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="direction-grid">
              {loading && (
                <div className="direction-empty">
                  Chargement...
                </div>
              )}

              {!loading && filteredDirections.length === 0 && (
                <div className="direction-empty">
                  Aucune direction trouvée.
                </div>
              )}

              {!loading && filteredDirections.map((direction) => {
                const attachedDivisions = divisions.filter((div) => div.directionId === direction.id);
                const attachedBureaux = services.filter((srv) => srv.directionId === direction.id && !!srv.chefService);
                return (
                  <div key={direction.id} className="direction-card-item">
                    <div className="direction-card-top">
                      <div className="direction-card-icon">
                        <Building2 size={22} />
                      </div>
                      <div>
                        <div className="direction-badge">
                          <span>Direction</span>
                        </div>
                        <h3>{direction.nom}</h3>
                        <p>{direction.description || 'Description non renseignée'}</p>
                      </div>
                    </div>

                    <div className="direction-card-stats">
                      <div>
                        <span>{attachedDivisions.length}</span>
                        <small>Divisions</small>
                      </div>
                      <div>
                        <span>{attachedBureaux.length}</span>
                        <small>Bureaux</small>
                      </div>
                      <div>
                        <span>{direction.statut || 'ACTIF'}</span>
                        <small>Statut</small>
                      </div>
                    </div>

                    <div className="direction-card-actions">
                      <Link href={`/services?directionId=${encodeURIComponent(direction.id)}`} className="primary-button small">
                        <DoorOpen size={16} />
                        Voir les divisions
                      </Link>
                      <div className="card-button-group">
                        <button className="icon-btn" onClick={() => editDirection(direction)}>
                          <Edit size={16} />
                        </button>
                        <button className="icon-btn danger" onClick={() => deleteDirection(direction.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {openModal && (
            <div className="modal-backdrop">
              <div className="modal-card">
                <div className="modal-header">
                  <h2>{editId ? 'Modifier une direction' : 'Nouvelle direction'}</h2>
                  <button className="close-btn" onClick={resetForm}>
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-body">
                  {error && <div className="alert error">{error}</div>}
                  {success && <div className="alert success">{success}</div>}

                  <div className="form-row">
                    <label>Intitulé de la direction</label>
                    <input value={nom} onChange={(e) => setNom(e.target.value)} />
                  </div>

                  <div className="form-row">
                    <label>Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="secondary-btn" onClick={resetForm}>
                    Annuler
                  </button>
                  <button className="primary-btn" onClick={saveDirection}>
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
