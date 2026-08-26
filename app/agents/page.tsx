'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import RdcLogo from '@/components/RdcLogo';
import { getCurrentUser, type AdminUser, filterAgentsByUserScope, buildAuthHeaders, isSuperAdmin } from '@/lib/accessControl';
import {
  Users,
  Plus,
  Search,
  Eye,
  Pencil,
  Check,
  X,
  Trash2,
  RotateCw,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileCheck,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { BACKEND_URL } from '@/lib/backend';
import './agents.css';

type Agent = {
  id: string;
  nom: string;
  postNom?: string;
  prenom: string;
  dateNaissance?: string;
  dateEngagement?: string;
  acteEngagement?: string;
  sexe?: string;
  matricule?: string;
  email?: string;
  telephone: string;
  directionId?: string;
  directionNom?: string;
  divisionId?: string;
  divisionNom?: string;
  fonctionId?: string;
  fonctionNom?: string;
  serviceId?: string;
  service?: string;
  avenue?: string;
  code?: string;
  statut: 'BROUILLON' | 'VERIFICATION' | 'VALIDE' | 'ACTIF' | 'REJETE' | 'APPROUVE';
  statutPresence?: 'ACTIF' | 'INACTIF';
  statutPaiement?: 'PAYE' | 'NON_PAYE';
  montantPaiement?: number;
  datePaiement?: string;
  createdAt: string;
};

type Direction = {
  id: string;
  nom: string;
};

type DivisionInfo = {
  id: string;
  nom: string;
  directionId?: string;
  directionNom?: string;
};

type Stats = {
  total: number;
  verification: number;
  valide: number;
  rejete: number;
  brouillon: number;
  paye?: number;
  nonPaye?: number;
  montantTotalPaye?: number;
  montantTotalNonPaye?: number;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    verification: 0,
    valide: 0,
    rejete: 0,
    brouillon: 0,
  });
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [divisions, setDivisions] = useState<DivisionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('TOUS');
  const [selectedDirection, setSelectedDirection] = useState<string>('TOUS');
  // division = niveau intermédiaire (division / sous-division)
  const [selectedDivision, setSelectedDivision] = useState<string>('TOUS');
  // service / bureau
  const [selectedService, setSelectedService] = useState<string>('TOUS');
  const [selectedGrade, setSelectedGrade] = useState<string>('TOUS');
  const [matriculeFilter, setMatriculeFilter] = useState<string>('TOUS');

  // Modal state for workflow actions
  const [activeModal, setActiveModal] = useState<{
    type: 'APPROVE' | 'REJECT' | 'DELETE' | 'VERIFY';
    agent: Agent;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [, startTransition] = useTransition();

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function loadData() {
    try {
      setLoading(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      let agentsData: any[] = [];
      try {
        const aRes = await fetch(`${origin}/api/agents`, {
          headers: buildAuthHeaders(),
        });
        if (aRes.ok) {
          const parsed = await aRes.json();
          agentsData = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.items)
            ? parsed.items
            : Array.isArray(parsed?.data)
            ? parsed.data
            : [];
        } else {
          console.error('Failed to fetch agents', aRes.status);
        }
      } catch (err) {
        console.error('Error fetching agents', err);
      }

      try {
        const sRes = await fetch(`${origin}/api/agents/stats`, {
          headers: buildAuthHeaders(),
        });
        if (sRes.ok) {
          const statsData = await sRes.json();
          setStats(statsData);
        } else {
          console.error('Failed to fetch agents stats', sRes.status);
        }
      } catch (err) {
        console.error('Error fetching agents stats', err);
      }

      setAgents(agentsData || []);
    } catch (err) {
      console.error('Erreur chargement agents', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDirections() {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${origin}/api/directions`, {
        headers: buildAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDirections(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erreur chargement directions', err);
    }
  }

  async function loadDivisions() {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${origin}/api/divisions`, {
        headers: buildAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDivisions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erreur chargement divisions', err);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (!cancelled) {
          setCurrentUser(user);
          // if user is scoped to a direction (non super-admin), default the direction filter
          if (user && !isSuperAdmin(user)) {
            const userDirectionId = user.directionId ?? 'TOUS';
            if (user.directionId) {
              startTransition(() => setSelectedDirection(userDirectionId));
            }

            if (user.roleId === 'role-chef-division' && (user.divisionId || user.divisionNom)) {
              const userDivisionId = user.divisionId || user.divisionNom || 'TOUS';
              startTransition(() => setSelectedDivision(userDivisionId));
            }

            if (user.roleId === 'role-chef-bureau' && (user.serviceId || user.serviceNom)) {
              const userServiceId = user.serviceId || user.serviceNom || 'TOUS';
              startTransition(() => setSelectedService(userServiceId));
              if (user.divisionId || user.divisionNom) {
                const userDivisionId = user.divisionId || user.divisionNom || 'TOUS';
                startTransition(() => setSelectedDivision(userDivisionId));
              }
            }
          }
        }

        // load directions, divisions and agents after obtaining user
        await loadDirections();
        await loadDivisions();
        await loadData();
      } catch (err) {
        console.error('Erreur initialisation agents page', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const directionQuery = searchParams.get('directionId');
    const serviceQuery = searchParams.get('serviceId');
    const divisionQuery = searchParams.get('division');

    if (directionQuery) {
      startTransition(() => setSelectedDirection(directionQuery));
    }

    if (serviceQuery) {
      startTransition(() => setSelectedService(serviceQuery));
      return;
    }

    if (divisionQuery) {
      startTransition(() => setSelectedDivision(divisionQuery));
    }
  }, [searchParams, startTransition]);

  async function handleConfirmAction() {
    if (!activeModal) return;

    const { type, agent } = activeModal;
    let newStatus: Agent['statut'] = agent.statut;

    if (type === 'APPROVE') newStatus = 'VALIDE';
    if (type === 'REJECT') newStatus = 'REJETE';
    if (type === 'VERIFY') newStatus = 'VERIFICATION';

    try {
      let response: Response;

      if (type === 'DELETE') {
        response = await fetch(`${BACKEND_URL}/agents/${agent.id}`, {
          method: 'DELETE',
          headers: buildAuthHeaders(),
        });
      } else {
        response = await fetch(`${BACKEND_URL}/agents/${agent.id}`, {
          method: 'PUT',
          headers: buildAuthHeaders('application/json'),
          body: JSON.stringify({ statut: newStatus }),
        });
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage = errorBody?.error || errorBody?.message || 'Erreur lors de l’opération';
        console.error('Agent update failed', response.status, errorMessage);
        alert(errorMessage);
        return;
      }

      setActiveModal(null);
      setActionReason('');
      startTransition(() => {
        loadData();
      });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l’opération');
    }
  }

  async function togglePaymentStatus(agent: Agent) {
    const newPaymentStatus = agent.statutPaiement === 'PAYE' ? 'NON_PAYE' : 'PAYE';
    try {
      await fetch(`${BACKEND_URL}/agents/${agent.id}`, {
        method: 'PUT',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({
          statutPaiement: newPaymentStatus,
          datePaiement: newPaymentStatus === 'PAYE' ? new Date().toISOString().split('T')[0] : undefined,
        }),
      });
      loadData();
    } catch (err) {
      console.error('Erreur bascule paiement', err);
    }
  }

  async function togglePresenceStatus(agent: Agent) {
    const newPresenceStatus = agent.statutPresence === 'INACTIF' ? 'ACTIF' : 'INACTIF';
    const presenceReactivationReason = newPresenceStatus === 'ACTIF'
      ? window.prompt('Raison de la réactivation (approbation administrateur) :')?.trim() || ''
      : '';
    if (newPresenceStatus === 'ACTIF' && !presenceReactivationReason) return;
    try {
      const response = await fetch(`${BACKEND_URL}/agents/${agent.id}`, {
        method: 'PUT',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ statutPresence: newPresenceStatus, presenceReactivationReason }),
      });
      if (!response.ok) throw new Error('Impossible de modifier la présence');
      loadData();
    } catch (err) {
      console.error('Erreur bascule présence', err);
      alert('Impossible de modifier le statut de présence.');
    }
  }

  const visibleAgents = useMemo(
    () => (currentUser ? filterAgentsByUserScope(agents, currentUser) : agents),
    [agents, currentUser]
  );

  const uniqueAgents = useMemo(() => {
    const seen = new Set<string>();
    const deduped: Agent[] = [];

    for (const agent of visibleAgents) {
      const normalizedName = `${agent.nom ?? ''}`.trim().toLowerCase();
      const normalizedPostNom = `${agent.postNom ?? ''}`.trim().toLowerCase();
      const normalizedPrenom = `${agent.prenom ?? ''}`.trim().toLowerCase();
      const normalizedMatricule = `${agent.matricule ?? ''}`.trim().toUpperCase();
      const uniqueKey = `${normalizedName}:${normalizedPostNom}:${normalizedPrenom}:${normalizedMatricule}:${agent.email ?? ''}`;

      if (seen.has(uniqueKey)) {
        continue;
      }

      seen.add(uniqueKey);
      deduped.push(agent);
    }

    return deduped;
  }, [visibleAgents]);

  const userDirectionName = useMemo(() => {
    return currentUser?.directionNom || directions.find((dir) => dir.id === currentUser?.directionId)?.nom || '';
  }, [currentUser, directions]);

  const isDivisionScopedUser = Boolean(
    currentUser &&
    currentUser.roleId === 'role-chef-division' &&
    (currentUser.divisionId || currentUser.divisionNom)
  );

  const isServiceScopedUser = Boolean(
    currentUser &&
    currentUser.roleId === 'role-chef-bureau' &&
    (currentUser.serviceId || currentUser.serviceNom)
  );

  const divisionById = useMemo(() => {
    const map = new Map<string, DivisionInfo>();
    divisions.forEach((division) => {
      map.set(division.id, division);
    });
    return map;
  }, [divisions]);

  const resolveAgentDirectionValue = useCallback((agent: Agent) => {
    if (agent.directionId || agent.directionNom) {
      return {
        id: agent.directionId || '',
        nom: agent.directionNom || '',
      };
    }

    const division = agent.divisionId ? divisionById.get(agent.divisionId) : undefined;
    if (division) {
      return {
        id: division.directionId || '',
        nom: division.directionNom || '',
      };
    }

    const matchedDivision = divisions.find((division) => division.nom === agent.divisionNom || division.id === agent.divisionId);
    if (matchedDivision) {
      return {
        id: matchedDivision.directionId || '',
        nom: matchedDivision.directionNom || '',
      };
    }

    return { id: '', nom: '' };
  }, [divisionById, divisions]);

  const directionOptions = useMemo(() => {
    if (currentUser && !isSuperAdmin(currentUser) && currentUser.directionId) {
      const directionName = currentUser.directionNom || directions.find((dir) => dir.id === currentUser.directionId)?.nom || currentUser.directionId;
      return [{ id: currentUser.directionId, nom: directionName }];
    }

    if (Array.isArray(directions) && directions.length > 0) {
      return directions.map((d) => ({ id: d.id, nom: d.nom }));
    }

    const map = new Map<string, { id: string; nom: string }>();

    divisions.forEach((division) => {
      if (!division.directionId && !division.directionNom) return;
      const id = division.directionId || '';
      const nom = division.directionNom || '';
      if (!id && !nom) return;
      const key = id || nom;
      if (!map.has(key)) {
        map.set(key, { id, nom });
      }
    });

    uniqueAgents.forEach((agent) => {
      const resolved = resolveAgentDirectionValue(agent);
      const { id, nom } = resolved;
      if (!id && !nom) return;
      const key = id || nom;
      if (!map.has(key)) {
        map.set(key, { id, nom });
      }
    });

    return Array.from(map.values());
  }, [currentUser, directions, divisions, uniqueAgents, resolveAgentDirectionValue]);

  const directionScopedAgents = useMemo(() => {
    if (!selectedDirection || selectedDirection === 'TOUS') return uniqueAgents;

    return uniqueAgents.filter((agent) => {
      const resolved = resolveAgentDirectionValue(agent);
      const directionMatch = (resolved.id && resolved.id === selectedDirection) || (resolved.nom && resolved.nom === selectedDirection);
      if (directionMatch) return true;

      const agentDivisionId = agent.divisionId || '';
      const matchedDivision = divisions.find((division) => division.id === agentDivisionId || division.nom === agent.divisionNom);
      if (!matchedDivision) return false;

      return (matchedDivision.directionId && matchedDivision.directionId === selectedDirection) ||
        (matchedDivision.directionNom && matchedDivision.directionNom === selectedDirection);
    });
  }, [selectedDirection, uniqueAgents, resolveAgentDirectionValue, divisions]);

  // Division options (niveau intermédiaire)
  const divisionOptions = useMemo(() => {
    let sourceAgents = directionScopedAgents;

    if (currentUser && !isSuperAdmin(currentUser) && isDivisionScopedUser && (currentUser.divisionId || currentUser.divisionNom)) {
      sourceAgents = sourceAgents.filter((agent) => {
        const matchesDivisionId = currentUser.divisionId && (agent.divisionId === currentUser.divisionId);
        const matchesDivisionNom = currentUser.divisionNom && (agent.divisionNom === currentUser.divisionNom);
        return matchesDivisionId || matchesDivisionNom;
      });
    }

    const map = new Map<string, { id: string; nom: string }>();
    sourceAgents.forEach((agent) => {
      const id = agent.divisionId || agent.divisionNom || '';
      const nom = agent.divisionNom || agent.divisionId || '';
      if (!id && !nom) return;
      const key = id || nom;
      if (!map.has(key)) {
        map.set(key, { id, nom });
      }
    });
    return Array.from(map.values());
  }, [directionScopedAgents, currentUser, isDivisionScopedUser]);

  // Service / Bureau options
  const serviceOptions = useMemo(() => {
    let sourceAgents = selectedDivision === 'TOUS'
      ? directionScopedAgents
      : directionScopedAgents.filter((agent) => {
          const agentDivisionId = agent.divisionId || agent.divisionNom || '';
          return agentDivisionId === selectedDivision;
        });

    if (currentUser && !isSuperAdmin(currentUser) && isServiceScopedUser && (currentUser.serviceId || currentUser.serviceNom)) {
      sourceAgents = sourceAgents.filter((agent) => {
        const matchesServiceId = currentUser.serviceId && (agent.serviceId === currentUser.serviceId);
        const matchesServiceNom = currentUser.serviceNom && (agent.service === currentUser.serviceNom);
        return matchesServiceId || matchesServiceNom;
      });
    }

    const map = new Map<string, { id: string; nom: string }>();
    sourceAgents.forEach((agent) => {
      const id = agent.serviceId || agent.service || '';
      const nom = agent.service || agent.serviceId || '';
      if (!id && !nom) return;
      const key = id || nom;
      if (!map.has(key)) {
        map.set(key, { id, nom });
      }
    });
    return Array.from(map.values());
  }, [directionScopedAgents, selectedDivision, currentUser, isServiceScopedUser]);

  const gradeOptions = useMemo(() => {
    const map = new Map<string, { id: string; nom: string }>();
    uniqueAgents.forEach((agent) => {
      const id = agent.fonctionId || agent.fonctionNom || '';
      const nom = agent.fonctionNom || agent.fonctionId || '';
      if (!id && !nom) return;
      const key = id || nom;
      if (!map.has(key)) {
        map.set(key, { id, nom });
      }
    });
    return Array.from(map.values());
  }, [uniqueAgents]);

  const matchesMatriculeFilter = (matricule?: string, filter?: string) => {
    if (!filter || filter === 'TOUS') return true;
    const raw = matricule?.trim() || '';
    const normalized = raw.replace(/[\.\s]/g, '').toUpperCase();
    const isBlank = raw === '';
    const isNU = isBlank || normalized === 'NU';
    const digitsOnly = /^[0-9]+$/.test(raw.replace(/[\.\s-]/g, ''));

    if (filter === 'NU') {
      return isNU;
    }
    if (filter === 'AVEC') {
      return digitsOnly && !isNU;
    }
    return true;
  };

  const filteredAgents = uniqueAgents.filter((agent) => {
    const query = search.toLowerCase();
    const fullName = `${agent.nom} ${agent.postNom || ''} ${agent.prenom}`.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      (agent.matricule && agent.matricule.toLowerCase().includes(query)) ||
      (agent.telephone && agent.telephone.includes(query));

    const matchesStatus =
      filterStatus === 'TOUS' ||
      agent.statut === filterStatus ||
      (filterStatus === 'ACTIF_PRESENCE' && agent.statutPresence !== 'INACTIF') ||
      (filterStatus === 'INACTIF_PRESENCE' && agent.statutPresence === 'INACTIF') ||
      (filterStatus === 'PAYE' && agent.statutPaiement === 'PAYE') ||
      (filterStatus === 'NON_PAYE' && agent.statutPaiement !== 'PAYE');

    const matchesDirection =
      selectedDirection === 'TOUS' ||
      (() => {
        const resolved = resolveAgentDirectionValue(agent);
        const directMatch = (resolved.nom && resolved.nom === selectedDirection) || (resolved.id && resolved.id === selectedDirection);
        if (directMatch) return true;

        const matchedDivision = divisions.find((division) => division.id === (agent.divisionId || '') || division.nom === (agent.divisionNom || ''));
        return Boolean(
          matchedDivision && (
            (matchedDivision.directionId && matchedDivision.directionId === selectedDirection) ||
            (matchedDivision.directionNom && matchedDivision.directionNom === selectedDirection)
          )
        );
      })();

    const matchesDivision =
      selectedDivision === 'TOUS' ||
      (agent.divisionNom && agent.divisionNom === selectedDivision) ||
      (agent.divisionId && agent.divisionId === selectedDivision);

    const matchesService =
      selectedService === 'TOUS' ||
      (agent.service && agent.service === selectedService) ||
      (agent.serviceId && agent.serviceId === selectedService);

    const matchesGrade =
      selectedGrade === 'TOUS' ||
      (agent.fonctionNom && agent.fonctionNom === selectedGrade) ||
      (agent.fonctionId && agent.fonctionId === selectedGrade);

    const matchesMatricule = matchesMatriculeFilter(agent.matricule, matriculeFilter);

    return matchesSearch && matchesStatus && matchesDirection && matchesDivision && matchesService && matchesGrade && matchesMatricule;
  });

  const totalPages = Math.ceil(filteredAgents.length / pageSize) || 1;
  const paginatedAgents = filteredAgents.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (statut: Agent['statut']) => {
    switch (statut) {
      case 'ACTIF':
      case 'VALIDE':
      case 'APPROUVE':
        return <span className="status-badge valide">VALIDE</span>;
      case 'VERIFICATION':
        return <span className="status-badge verification">EN VÉRIFICATION</span>;
      case 'REJETE':
        return <span className="status-badge rejete">REJETÉ</span>;
      case 'BROUILLON':
      default:
        return <span className="status-badge brouillon">BROUILLON</span>;
    }
  };

  const isValidatedStatus = (statut: Agent['statut']) => ['ACTIF', 'VALIDE', 'APPROUVE'].includes(statut);

  const getStatusLabel = (statut: Agent['statut']) => {
    switch (statut) {
      case 'ACTIF':
      case 'VALIDE':
      case 'APPROUVE':
        return 'Validé';
      case 'VERIFICATION':
        return 'Vérification';
      case 'REJETE':
        return 'Rejeté';
      case 'BROUILLON':
      default:
        return 'Brouillon';
    }
  };

  const getValidationAction = (agent: Agent) => {
    if (isValidatedStatus(agent.statut)) {
      return {
        type: 'VERIFY' as const,
        icon: <Clock size={16} />,
        label: 'Revenir en vérification',
        title: 'Retourner l’agent en vérification',
      };
    }

    return {
      type: 'APPROVE' as const,
      icon: <Check size={16} />,
      label: 'Valider',
      title: "Valider l'agent",
    };
  };

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          {/* RDC PUBLIC ADMINISTRATION HEADER BANNER */}
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px 28px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              marginBottom: '20px',
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
                  RÉPERTOIRE NATIONAL DES AGENTS
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Secrétariat Général à la Décentralisation • RDC
                </p>
              </div>
            </div>
          </div>

          {/* PAGE HEADER */}
          <div className="page-header">
            <div>
              <h1>
                {currentUser
                  ? `Gestion des Agents${userDirectionName ? ` - ${userDirectionName}` : ''}`
                  : 'Gestion des Agents'}
              </h1>
              <p>
                {currentUser
                  ? userDirectionName
                    ? `Répertoire des effectifs de ${userDirectionName}`
                    : 'Répertoire des effectifs'
                  : 'Répertoire des effectifs et grades'}
              </p>
            </div>

            <Link href="/agents/create" className="primary-button">
              <Plus size={18} />
              Nouveau Agent
            </Link>
          </div>

          {/* STATISTIQUES */}
          <div className="agent-stat-grid">
              <div className="agent-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#2563eb' }}>
                <Users size={26} />
              </div>
              <div>
                <span>Total Effectif</span>
                <strong>{loading ? '...' : filteredAgents.length}</strong>
              </div>
            </div>

            <div className="agent-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#16a34a' }}>
                <CheckCircle size={26} />
              </div>
              <div>
                <span>Payés (Oui)</span>
                <strong>{loading ? '...' : filteredAgents.filter((agent) => agent.statutPaiement === 'PAYE').length}</strong>
              </div>
            </div>

            <div className="agent-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ea580c' }}>
                <Clock size={26} />
              </div>
              <div>
                <span>Non Payés (Non)</span>
                <strong>{loading ? '...' : filteredAgents.filter((agent) => agent.statutPaiement !== 'PAYE').length}</strong>
              </div>
            </div>

            <div className="agent-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#0284c7' }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <span>Dossiers Validés</span>
                <strong>{loading ? '...' : filteredAgents.filter((agent) => agent.statut === 'VALIDE' || agent.statut === 'ACTIF').length}</strong>
              </div>
            </div>

            <div className="agent-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#16a34a' }}>
                <CheckCircle size={26} />
              </div>
              <div>
                <span>Présents</span>
                <strong>{loading ? '...' : filteredAgents.filter((agent) => agent.statutPresence !== 'INACTIF').length}</strong>
              </div>
            </div>

            <div className="agent-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#64748b' }}>
                <XCircle size={26} />
              </div>
              <div>
                <span>Ne viennent plus</span>
                <strong>{loading ? '...' : filteredAgents.filter((agent) => agent.statutPresence === 'INACTIF').length}</strong>
              </div>
            </div>
          </div>

          {/* AGENTS PANEL */}
          <div className="agents-panel">
            {/* TOOLBAR */}
            <div className="agents-toolbar">
              <div className="search-container">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, matricule, tel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-container">
                <div className="filter-column">
                  <span className="filter-label">Direction</span>
                  <select
                    value={selectedDirection}
                    onChange={(e) => {
                      setSelectedDirection(e.target.value);
                      setSelectedDivision('TOUS');
                      setSelectedService('TOUS');
                      setPage(1);
                    }}
                    style={{ marginRight: 12, padding: '6px 10px', borderRadius: 6 }}
                  >
                    <option value="TOUS">Toutes les directions</option>
                    {directionOptions.map((direction) => (
                      <option key={`${direction.id}:${direction.nom}`} value={direction.id || direction.nom}>{direction.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-column">
                  <span className="filter-label">Division</span>
                  <select
                    value={selectedDivision}
                    onChange={(e) => {
                      setSelectedDivision(e.target.value);
                      setSelectedService('TOUS');
                      setPage(1);
                    }}
                    style={{ marginRight: 12, padding: '6px 10px', borderRadius: 6 }}
                  >
                    <option value="TOUS">Toutes les divisions</option>
                    {divisionOptions.map((division) => (
                      <option key={`${division.id}:${division.nom}`} value={division.id || division.nom}>{division.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-column">
                  <span className="filter-label">Bureau / Service</span>
                  <select
                    value={selectedService}
                    onChange={(e) => {
                      setSelectedService(e.target.value);
                      setPage(1);
                    }}
                    style={{ marginRight: 12, padding: '6px 10px', borderRadius: 6 }}
                  >
                    <option value="TOUS">Tous les bureaux</option>
                    {serviceOptions.map((service) => (
                      <option key={`${service.id}:${service.nom}`} value={service.id || service.nom}>{service.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-column">
                  <span className="filter-label">Grade</span>
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value);
                      setPage(1);
                    }}
                    style={{ marginRight: 12, padding: '6px 10px', borderRadius: 6 }}
                  >
                    <option value="TOUS">Tous les grades</option>
                    {gradeOptions.map((grade) => (
                      <option key={`${grade.id}:${grade.nom}`} value={grade.id || grade.nom}>{grade.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-column">
                  <span className="filter-label">Matricule</span>
                  <select
                    value={matriculeFilter}
                    onChange={(e) => {
                      setMatriculeFilter(e.target.value);
                      setPage(1);
                    }}
                    style={{ marginRight: 12, padding: '6px 10px', borderRadius: 6 }}
                  >
                    <option value="TOUS">Tous les matricules</option>
                    <option value="NU">Matricule N.U (sans matricule)</option>
                    <option value="AVEC">Avec matricule</option>
                  </select>
                </div>

                {[
                  { key: 'TOUS', label: 'Tous' },
                  { key: 'PAYE', label: 'Paiement: Oui' },
                  { key: 'NON_PAYE', label: 'Paiement: Non (Par défaut)' },
                  { key: 'ACTIF_PRESENCE', label: 'Présents' },
                  { key: 'INACTIF_PRESENCE', label: 'Ne viennent plus' },
                  { key: 'VALIDE', label: 'Validés' },
                  { key: 'VERIFICATION', label: 'Vérification' },
                  { key: 'REJETE', label: 'Rejetés' },
                ].map((st) => (
                  <button
                    key={st.key}
                    className={filterStatus === st.key ? 'filter-active' : ''}
                    onClick={() => {
                      setFilterStatus(st.key);
                      setPage(1);
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <button className="refresh-button" onClick={loadData}>
                <RotateCw size={16} />
                Actualiser
              </button>
            </div>

            <div className="agents-grid-wrapper">
              {loading && (
                <div className="agents-empty">
                  Chargement des agents en cours...
                </div>
              )}

              {!loading && paginatedAgents.length === 0 && (
                <div className="agents-empty">
                  Aucun agent ne correspond aux critères.
                </div>
              )}

              {!loading && (
                <div className="agents-grid">
                  {paginatedAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`agent-card ${agent.statut === 'VALIDE' || agent.statut === 'ACTIF' || agent.statut === 'APPROUVE'
                        ? 'validated'
                        : agent.statut === 'REJETE'
                        ? 'rejected'
                        : agent.statut === 'VERIFICATION'
                        ? 'verification'
                        : 'draft'
                      }`}
                    >
                      <div className="agent-card-top">
                        <div className="agent-card-avatar">
                          {agent.nom ? agent.nom.charAt(0) : 'A'}{agent.prenom ? agent.prenom.charAt(0) : ''}
                        </div>
                        <div className="agent-card-title-group">
                          <strong>{agent.nom || 'Agent'} {agent.prenom || ''}</strong>
                          <span className="agent-card-subtitle">{agent.service || agent.directionNom || 'Service non précisé'}</span>
                        </div>
                        <div className="agent-card-icon">
                          {agent.statut === 'VALIDE' || agent.statut === 'ACTIF' || agent.statut === 'APPROUVE' ? (
                            <CheckCircle size={18} />
                          ) : agent.statut === 'VERIFICATION' ? (
                            <Clock size={18} />
                          ) : agent.statut === 'REJETE' ? (
                            <XCircle size={18} />
                          ) : (
                            <ShieldCheck size={18} />
                          )}
                        </div>
                      </div>

                      <div className="agent-card-badges">
                        <span className="agent-card-chip">{agent.matricule || 'N.U'}</span>
                        <span className="agent-card-chip">{agent.fonctionNom || 'Fonction...'}</span>
                      </div>

                      <div className="agent-card-footer">
                        <span className="agent-phone">{agent.telephone || 'Tel non renseigné'}</span>
                        {getStatusBadge(agent.statut)}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <span className={`status-badge ${agent.statutPresence === 'INACTIF' ? 'rejete' : 'valide'}`}>
                          {agent.statutPresence === 'INACTIF' ? 'NE VIENT PLUS' : 'PRÉSENT'}
                        </span>
                      </div>
                      <div className="agent-card-actions-row">
                        <Link href={`/agents/${agent.id}`} className="action-btn view" title="Voir le dossier">
                          <Eye size={16} />
                          <span>Voir</span>
                        </Link>
                        <Link href={`/agents/${agent.id}?edit=1`} className="action-btn success" title="Modifier l’agent">
                          <Pencil size={16} />
                          <span>Modifier</span>
                        </Link>
                        <button
                          type="button"
                          className={`action-btn ${agent.statutPresence === 'INACTIF' ? 'success' : 'warning'}`}
                          title={agent.statutPresence === 'INACTIF' ? 'Marquer comme présent' : 'Marquer comme ne venant plus'}
                          onClick={() => togglePresenceStatus(agent)}
                        >
                          {agent.statutPresence === 'INACTIF' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          <span>{agent.statutPresence === 'INACTIF' ? 'Présent' : 'Absent'}</span>
                        </button>
                        <button
                          type="button"
                          className={`action-btn ${agent.statutPaiement === 'PAYE' ? 'warning' : 'success'}`}
                          title={agent.statutPaiement === 'PAYE' ? 'Marquer comme NON PAYÉ' : 'Marquer comme PAYÉ'}
                          onClick={() => togglePaymentStatus(agent)}
                        >
                          <CreditCard size={16} />
                          <span>{agent.statutPaiement === 'PAYE' ? 'Non payé' : 'Payé'}</span>
                        </button>
                        {(() => {
                          const action = getValidationAction(agent);
                          return (
                            <button
                              type="button"
                              className={`action-btn ${isValidatedStatus(agent.statut) ? 'warning' : 'success'}`}
                              title={action.title}
                              onClick={() => setActiveModal({ type: action.type, agent })}
                            >
                              {action.icon}
                              <span>{action.label}</span>
                            </button>
                          );
                        })()}
                        <button
                          type="button"
                          className="action-btn danger"
                          title="Rejeter l'agent"
                          onClick={() => setActiveModal({ type: 'REJECT', agent })}
                        >
                          <X size={16} />
                          <span>Rejeter</span>
                        </button>
                        <button
                          type="button"
                          className="action-btn danger"
                          title="Supprimer l'agent"
                          onClick={() => setActiveModal({ type: 'DELETE', agent })}
                        >
                          <Trash2 size={16} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PAGINATION */}
            <div className="pagination">
              <span>
                Affichage de {paginatedAgents.length} sur {filteredAgents.length} agents
              </span>

              <div className="pagination-buttons">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  Page {page} sur {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* MODAL WORKFLOW CONFIRMATION */}
          {activeModal && (
            <div className="modal-overlay">
              <div className="premium-modal">
                <h2>
                  {activeModal.type === 'APPROVE' && 'Approbation de l’agent'}
                  {activeModal.type === 'VERIFY' && 'Mise en vérification'}
                  {activeModal.type === 'REJECT' && 'Rejet du dossier agent'}
                  {activeModal.type === 'DELETE' && 'Suppression de l’agent'}
                </h2>

                <div className="action-preview">
                  Agent: {activeModal.agent.nom || 'Agent'} {activeModal.agent.prenom || ''} (
                  {activeModal.agent.matricule || 'N.U'})
                </div>

                {activeModal.type !== 'DELETE' ? (
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Observations / Motif du changement de statut:
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Saisissez une note explicative pour l'historique du workflow..."
                    />
                  </div>
                ) : (
                  <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: 600 }}>
                    Êtes-vous sûr de vouloir supprimer définitivement cet agent ? Cette action est irréversible.
                  </p>
                )}

                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setActiveModal(null)}>
                    Annuler
                  </button>
                  <button className="confirm-btn" onClick={handleConfirmAction}>
                    Confirmer l&apos;action
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
