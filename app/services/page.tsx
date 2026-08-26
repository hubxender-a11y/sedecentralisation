'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Trash2,
  Users,
  Network,
  Building2,
  CheckCircle,
  XCircle,
  X,
  Pencil
} from 'lucide-react';

import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import RdcLogo from '@/components/RdcLogo';
import { BACKEND_URL } from '@/lib/backend';
import { getCurrentUser, filterByUserDirection, type AdminUser } from '@/lib/accessControl';
import '../directions/directions.css';
import '../agents/agents.css';

type Direction = {
  id: string;
  nom: string;
};

type Division = {
  id: string;
  nom: string;
  directionId?: string;
  directionNom?: string;
  description?: string;
  statut?: string;
  createdAt?: string;
};

type Service = {
  id: string;
  nom: string;
  directionId: string;
  directionNom?: string;
  divisionId?: string;
  divisionNom?: string;
  codeService?: string;
  description?: string;
  chefService?: string;
  typeMedia?: string;
  statut?: string;
  createdAt?: string;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form states
  const [nom, setNom] = useState('');
  const [directionId, setDirectionId] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState('Presse écrite');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [, startTransition] = useTransition();

  async function loadData() {
    try {
      setLoading(true);
      const [resServices, resDirections, resDivisions] = await Promise.all([
        fetch(`${BACKEND_URL}/services`),
        fetch(`${BACKEND_URL}/directions`),
        fetch(`${BACKEND_URL}/divisions`),
      ]);

      const dataServices = await resServices.json();
      const dataDirections = await resDirections.json();
      const dataDivisions = await resDivisions.json();

      const servList = Array.isArray(dataServices) ? dataServices : dataServices.data ?? [];
      const dirList = Array.isArray(dataDirections) ? dataDirections : dataDirections.data ?? [];
      const divList = Array.isArray(dataDivisions) ? dataDivisions : dataDivisions.data ?? [];

      const divisionServices: Service[] = (divList as Division[]).map((division) => ({
        id: division.id,
        nom: division.nom,
        directionId: division.directionId || '',
        directionNom: division.directionNom || '',
        divisionId: division.id,
        divisionNom: division.nom,
        codeService: '',
        description: division.description || '',
        chefService: '',
        statut: division.statut || 'ACTIF',
        createdAt: division.createdAt,
      }));

      setServices([...servList, ...divisionServices]);
      setDirections(dirList as Direction[]);
      setDivisions(divList as Division[]);
      const directionParam = searchParams.get('directionId');
      const hasDirectionParam = directionParam && (dirList as Direction[]).some((d) => d.id === directionParam);
      if (hasDirectionParam) {
        setDirectionFilter(directionParam);
        setDirectionId(directionParam);
      } else if (currentUser?.directionId) {
        setDirectionFilter(currentUser.directionId);
        setDirectionId(currentUser.directionId);
      } else if (dirList.length > 0 && !directionId) {
        setDirectionId((dirList as Direction[])[0].id);
      }
      if (currentUser?.directionId && !(dirList as Direction[]).some((d) => d.id === currentUser.directionId)) {
        setDirectionId('');
      }
    } catch (err) {
      console.error(err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    getCurrentUser().then((user) => {
      setCurrentUser(user);
      if (user?.directionId) {
        setDirectionFilter(user.directionId);
        setDirectionId(user.directionId);
      }
    });
  }, []);

  function resetForm() {
    setNom('');
    setDescription('');
    setMediaType('Presse écrite');
    setEditId(null);
    setOpenModal(false);
    setError('');
  }

  function editService(item: Service) {
    if (currentUser?.directionId && item.directionId !== currentUser.directionId) {
      setError('Vous ne pouvez modifier qu’un bureau de votre direction.');
      return;
    }
    setEditId(item.id);
    setNom(item.nom);
    setDirectionId(item.directionId);
    setDescription(item.description || '');
    setMediaType(item.typeMedia || 'Presse écrite');
    setOpenModal(true);
  }

  async function saveService() {
    if (!nom.trim()) {
      setError('Le nom du bureau est obligatoire');
      return;
    }
    // direction id where the service belongs
    const serviceDirectionId = (currentUser?.directionId ?? directionId) || directions[0]?.id;
    if (!serviceDirectionId) {
      setError('Aucune direction disponible pour rattacher ce bureau.');
      return;
    }
    if (currentUser?.directionId && serviceDirectionId !== currentUser.directionId) {
      setError('Vous ne pouvez rattacher ce bureau qu’à votre propre direction.');
      return;
    }

    // division selection (may be empty)
    const serviceDivisionId = selectedDivisionId || undefined;

    try {
      setError('');
      const selectedDir = directions.find((d) => d.id === serviceDirectionId) || directions[0] || null;
      const selectedDiv = divisions.find((dd) => dd.id === serviceDivisionId) || null;

      const payload = {
        nom,
        directionId: serviceDirectionId,
        divisionId: serviceDivisionId,
        directionNom: selectedDir ? selectedDir.nom : currentUser?.directionNom || '',
        divisionNom: selectedDiv ? selectedDiv.nom : selectedDir ? selectedDir.nom : currentUser?.directionNom || '',
        description,
        typeMedia: mediaType,
        statut: 'ACTIF',
      };

      const url = editId
        ? `${BACKEND_URL}/services/${editId}`
        : `${BACKEND_URL}/services`;

      const response = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage = errorBody?.error || 'Erreur d\'enregistrement du bureau';
        throw new Error(errorMessage);
      }

      setSuccess(
        editId ? 'Bureau modifié avec succès' : 'Bureau créé avec succès'
      );

      resetForm();
      startTransition(() => {
        loadData();
      });

      setTimeout(() => setSuccess(''), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'enregistrement';
      setError(msg);
    }
  }

  async function deleteService(id: string) {
    if (!confirm('Voulez-vous vraiment supprimer ce bureau ?')) return;

    try {
      await fetch(`${BACKEND_URL}/services/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const visibleDirections = useMemo(
    () => (currentUser?.directionId ? directions.filter((d) => d.id === currentUser.directionId) : directions),
    [directions, currentUser]
  );

  const visibleDivisions = useMemo(() => {
    // If a direction filter is explicitly selected, use it
    if (directionFilter && directionFilter !== 'ALL') {
      return divisions.filter((d) => d.directionId === directionFilter);
    }

    // If the current user is scoped to a direction, respect that scope
    if (currentUser?.directionId) {
      return divisions.filter((d) => d.directionId === currentUser.directionId);
    }

    // Otherwise show all divisions
    return divisions;
  }, [divisions, currentUser, directionFilter]);

  const visibleServices = useMemo(
    () => (currentUser ? filterByUserDirection(services, currentUser) : services),
    [services, currentUser]
  );

  const servicesByDivision = useMemo(() => {
    // Build a mapping from division id -> count of services (bureaux)
    // If a service lacks divisionId, attempt to resolve via divisionNom
    const acc: Record<string, number> = {};
    for (const service of visibleServices) {
      let divId = service.divisionId;
      if (!divId && service.divisionNom) {
        const found = divisions.find(
          (d) => d.nom === service.divisionNom && (!service.directionId || d.directionId === service.directionId)
        );
        if (found) divId = found.id;
      }
      if (!divId) continue;
      acc[divId] = (acc[divId] || 0) + 1;
    }
    return acc;
  }, [visibleServices, divisions]);

  const filteredDivisions = visibleDivisions.filter((d) => {
    const matchesSearch =
      d.nom.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase())) ||
      (d.directionNom && d.directionNom.toLowerCase().includes(search.toLowerCase()));
    const matchesDir = directionFilter === 'ALL' || d.directionId === directionFilter;
    return matchesSearch && matchesDir;
  });

  const filteredServices = visibleServices.filter((s) => {
    const matchesSearch =
      s.nom.toLowerCase().includes(search.toLowerCase()) ||
      (s.codeService && s.codeService.toLowerCase().includes(search.toLowerCase())) ||
      (s.chefService && s.chefService.toLowerCase().includes(search.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
    const matchesDir = directionFilter === 'ALL' || s.directionId === directionFilter;
    const matchesDivision = !selectedDivisionId || s.divisionId === selectedDivisionId;
    return matchesSearch && matchesDir && matchesDivision;
  });

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="direction-container">
            {/* RDC PUBLIC ADMINISTRATION HEADER BANNER */}
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
                    ORGANIGRAMME &amp; DIVISIONS RH
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    République Démocratique du Congo • Administration Publique
                  </p>
                </div>
              </div>
            </div>

            <div className="direction-header">
              <div>
                <h1>{currentUser?.directionNom ? `${currentUser.directionNom} — Bureaux` : 'Bureaux & Divisions Administratives'}</h1>
                <p>
                  {currentUser?.directionNom
                    ? `Découpage opérationnel des bureaux de ${currentUser.directionNom}`
                    : 'Découpage opérationnel des bureaux gérant les dossiers agents de l’État'}
                </p>
              </div>

              <button className="add-btn" onClick={() => setOpenModal(true)}>
                <Plus size={20} />
                Nouveau Bureau
              </button>
            </div>

            {/* KPI CARDS */}
            <div className="agent-stat-grid" style={{ marginBottom: '24px' }}>
              <div className="agent-stat-card">
                <div className="stat-icon blue">
                  <Network />
                </div>
                <div>
                  <span>Bureaux / Divisions</span>
                  <strong>{services.length}</strong>
                </div>
              </div>

              <div className="agent-stat-card">
                <div className="stat-icon green">
                  <Building2 />
                </div>
                <div>
                  <span>Divisions rattachées</span>
                  <strong>{divisions.length}</strong>
                </div>
              </div>

              <div className="agent-stat-card">
                <div className="stat-icon purple">
                  <CheckCircle />
                </div>
                <div>
                  <span>Bureaux opérationnels</span>
                  <strong>{services.filter((s) => s.statut === 'ACTIF').length}</strong>
                </div>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="direction-toolbar" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div className="search-container" style={{ flex: 1 }}>
                <Search size={19} />
                <input
                  placeholder="Rechercher par nom, code ou responsable..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div style={{ minWidth: '220px' }}>
                <select
                  value={directionFilter}
                  onChange={(e) => {
                    setDirectionFilter(e.target.value);
                    setSelectedDivisionId('');
                  }}
                  disabled={Boolean(currentUser?.directionId)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: 'white',
                    color: '#0f172a',
                  }}
                >
                  <option value="ALL">Toutes les divisions ({visibleDirections.length})</option>
                  {visibleDirections.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <section style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Divisions</h2>
                  <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '13px' }}>
                    {filteredDivisions.length} division{filteredDivisions.length > 1 ? 's' : ''} affichée{filteredDivisions.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="direction-grid">
                {loading && (
                  <div className="agents-empty">
                    Chargement des divisions...
                  </div>
                )}

                {!loading && filteredDivisions.length === 0 && (
                  <div className="agents-empty">
                    Aucune division trouvée pour cette recherche
                  </div>
                )}

                {filteredDivisions.map((division) => {
                  const isSelected = selectedDivisionId === division.id;
                  return (
                    <div
                      key={division.id}
                      className={`agent-card service-card division${isSelected ? ' selected' : ''}`}
                      style={isSelected ? { borderColor: '#2563eb', boxShadow: '0 0 0 1px rgba(37,99,235,0.2), 0 14px 36px rgba(15,23,42,0.12)' } : undefined}
                      onClick={() => setSelectedDivisionId(isSelected ? '' : division.id)}
                    >
                      <div className="agent-card-top">
                        <div className="agent-card-avatar">D</div>
                        <div className="agent-card-title-group">
                          <span className="agent-card-subtitle">{division.directionNom || 'Direction inconnue'}</span>
                          <strong>{division.nom}</strong>
                        </div>
                        <div className="agent-card-icon">
                          <Network size={20} />
                        </div>
                      </div>

                      <div className="agent-card-badges">
                        <span className="agent-card-chip">Division</span>
                        <span className="agent-card-chip">Bureaux : {servicesByDivision[division.id] || 0}</span>
                      </div>

                      <div className="agent-card-footer">
                        <span>{division.description || 'Aucune description disponible'}</span>
                        <span className={division.statut === 'ACTIF' ? 'status active' : 'status inactive'}>
                          {division.statut === 'ACTIF' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {division.statut}
                        </span>
                      </div>

                      <div className="agent-card-actions-row">
                        <button className="action-btn secondary" disabled>
                          Division
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Bureaux</h2>
                  <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '13px' }}>
                    {filteredServices.length} bureau{filteredServices.length > 1 ? 'x' : ''} affiché{filteredServices.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="direction-grid">
                {loading && (
                  <div className="agents-empty">
                    Chargement des bureaux...
                  </div>
                )}

                {!loading && filteredServices.length === 0 && (
                  <div className="agents-empty">
                    Aucun bureau trouvé pour cette recherche
                  </div>
                )}

                {filteredServices.map((srv) => {
                  const actionAllowed = !currentUser?.directionId || srv.directionId === currentUser.directionId;
                  return (
                    <div key={srv.id} className="agent-card service-card bureau">
                      <div className="agent-card-top">
                        <div className="agent-card-avatar">B</div>
                        <div className="agent-card-title-group">
                          <span className="agent-card-subtitle">{srv.directionNom || 'Direction inconnue'}</span>
                          <strong>{srv.nom}</strong>
                        </div>
                        <div className="agent-card-icon">
                          <Network size={20} />
                        </div>
                      </div>

                      <div className="agent-card-badges">
                        <span className="agent-card-chip">{srv.divisionNom || 'Division non assignée'}</span>
                        <span className="agent-card-chip">{srv.codeService || 'Code inconnu'}</span>
                      </div>

                      <div className="agent-card-footer">
                        <span>{srv.description || 'Description du bureau non renseignée'}</span>
                        <span className={srv.statut === 'ACTIF' ? 'status active' : 'status inactive'}>
                          {srv.statut === 'ACTIF' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {srv.statut || 'ACTIF'}
                        </span>
                      </div>

                      <div className="agent-card-actions-row">
                        <Link href={`/agents?serviceId=${encodeURIComponent(srv.id)}`} className="action-btn view">
                          <Users size={16} />
                          Voir agents
                        </Link>
                        <button className="action-btn secondary" onClick={() => editService(srv)} disabled={!actionAllowed}>
                          <Pencil size={16} />
                          Modifier
                        </button>
                        <button className="action-btn danger" onClick={() => deleteService(srv.id)} disabled={!actionAllowed}>
                          <Trash2 size={16} />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {success && <div className="alert success">{success}</div>}
            {error && <div className="alert error">{error}</div>}

            {/* MODAL */}
            {openModal && (
              <div className="modal-overlay">
                <div className="premium-modal" style={{ maxWidth: '560px' }}>
                  <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '22px', color: '#242424' }}>
                        {editId ? 'Modifier le Bureau' : 'Nouveau Bureau'}
                      </h2>
                      <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '13px' }}>Administration Publique • RDC Décentralisation</p>
                    </div>

                    <button onClick={resetForm} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      <X />
                    </button>
                  </div>

                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                        Nom du bureau *
                      </label>
                      <input
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        placeholder="Ex: Recrutement, Effectifs & Carrières"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                        Description du bureau
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Attributions et missions du bureau"
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={resetForm}>
                      Annuler
                    </button>

                    <button className="confirm-btn" onClick={saveService}>
                      Enregistrer bureau
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
