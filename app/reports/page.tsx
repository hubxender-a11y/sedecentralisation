'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import StatCard from '@/components/StatCard';
import RdcLogo from '@/components/RdcLogo';
import {
  Users,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  BadgeCheck,
  XCircle,
  BarChart3,
  PieChart,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  AlertTriangle,
  Award,
  Layers,
  ArrowUpDown,
  ListFilter,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { BACKEND_URL } from '@/lib/backend';
import { getCurrentUser, filterAgentsByUserScope, buildAuthHeaders, type AdminUser } from '@/lib/accessControl';

type Direction = {
  id: string;
  nom: string;
};

type Service = {
  id: string;
  nom: string;
  directionId?: string;
  divisionId?: string;
  divisionNom?: string;
};

type Division = {
  id: string;
  nom: string;
  directionId?: string;
  directionNom?: string;
};

type Fonction = {
  id: string;
  nom: string;
};

type Agent = {
  id: string;
  nom: string;
  postNom?: string;
  prenom: string;
  sexe?: string;
  matricule?: string;
  dateNaissance?: string;
  directionId?: string;
  directionNom?: string;
  serviceId?: string;
  service?: string;
  fonctionId?: string;
  fonctionNom?: string;
  divisionId?: string;
  divisionNom?: string;
  statut: string;
  statutPaiement?: 'PAYE' | 'NON_PAYE';
  montantPaiement?: number;
  datePaiement?: string;
  telephone?: string;
  email?: string;
  dateEnrolement?: string;
  createdAt?: string;
};

type ReportTab = 'FICHIER' | 'DIRECTIONS' | 'GRADES' | 'PARITE' | 'AUDIT';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('FICHIER');

  const [directions, setDirections] = useState<Direction[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // CATEGORY FILTERS STATE
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('TOUS');
  const [serviceFilter, setServiceFilter] = useState('TOUS');
  const [statutDossierFilter, setStatutDossierFilter] = useState('TOUS');
  const [sexeFilter, setSexeFilter] = useState('TOUS');

  // SORTING & PAGINATION FOR DIRECTORY TABLE
  const [sortField, setSortField] = useState<'nom' | 'matricule' | 'directionNom' | 'statut'>('nom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // EXPANDED DIRECTIONS IN MATRIX
  const [expandedDirIds, setExpandedDirIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        const [dirRes, divRes, srvRes, fncRes, agRes, user] = await Promise.all([
          fetch(`${BACKEND_URL}/directions`, { headers: buildAuthHeaders() }),
          fetch(`${BACKEND_URL}/divisions`, { headers: buildAuthHeaders() }),
          fetch(`${BACKEND_URL}/services`, { headers: buildAuthHeaders() }),
          fetch(`${BACKEND_URL}/fonctions`, { headers: buildAuthHeaders() }),
          fetch(`${BACKEND_URL}/agents?page=1&pageSize=10000`, { headers: buildAuthHeaders() }),
          getCurrentUser(),
        ]);

        const dirData = await dirRes.json();
        const divData = await divRes.json();
        const srvData = await srvRes.json();
        const fncData = await fncRes.json();
        const agData = await agRes.json();

        if (!cancelled) {
          setCurrentUser(user);
          setDirections(Array.isArray(dirData) ? dirData : []);
          setDivisions(Array.isArray(divData) ? divData : []);
          setServices(Array.isArray(srvData) ? srvData : []);
          setFonctions(Array.isArray(fncData) ? fncData : []);
          setAgents(Array.isArray(agData) ? agData : Array.isArray(agData?.items) ? agData.items : Array.isArray(agData?.data) ? agData.data : []);
          setDirectionFilter((prev) => {
            if (user?.directionId && prev === 'TOUS') {
              return user.directionId;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Erreur chargement données rapports:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // FILTER LOGIC
  const visibleAgents = useMemo(() => {
    return filterAgentsByUserScope<Agent>(agents, currentUser);
  }, [agents, currentUser]);

  const resolveAgentDirection = useCallback((agent: Agent) => {
    if (agent.directionId) return agent.directionId;
    const matchingDivision = divisions.find(
      (division) => division.id === agent.divisionId || division.nom === agent.divisionNom
    );
    if (matchingDivision?.directionId) return matchingDivision.directionId;

    const matchingService = services.find(
      (service) => service.id === agent.serviceId || service.nom === agent.service
    );
    if (matchingService?.directionId) return matchingService.directionId;

    return agent.directionId || null;
  }, [divisions, services]);

  const filteredAgents = useMemo(() => {
    return visibleAgents.filter((ag) => {
      const query = search.trim().toLowerCase();
      const matchesKeyword =
        !query ||
        `${ag.nom} ${ag.postNom || ''} ${ag.prenom} ${ag.matricule || ''} ${ag.fonctionNom || ''} ${ag.directionNom || ''}`
          .toLowerCase()
          .includes(query);

      const resolvedDirectionId = resolveAgentDirection(ag);
      const matchesDirection =
        directionFilter === 'TOUS' ||
        resolvedDirectionId === directionFilter ||
        ag.directionId === directionFilter ||
        ag.directionNom === directionFilter;

      const matchesService =
        serviceFilter === 'TOUS' ||
        ag.serviceId === serviceFilter ||
        ag.service === serviceFilter ||
        services.find((service) => service.id === ag.serviceId)?.nom === serviceFilter;

      const matchesStatut =
        statutDossierFilter === 'TOUS' ||
        ag.statut.toUpperCase() === statutDossierFilter.toUpperCase();

      const matchesSexe =
        sexeFilter === 'TOUS' ||
        (ag.sexe && ag.sexe.toUpperCase() === sexeFilter.toUpperCase());

      return (
        matchesKeyword &&
        matchesDirection &&
        matchesService &&
        matchesStatut &&
        matchesSexe
      );
    });
  }, [visibleAgents, services, resolveAgentDirection, search, directionFilter, serviceFilter, statutDossierFilter, sexeFilter]);

  // SORTED AGENTS
  const sortedAgents = useMemo(() => {
    return [...filteredAgents].sort((a, b) => {
      let valA = (a[sortField] || '').toLowerCase();
      let valB = (b[sortField] || '').toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAgents, sortField, sortOrder]);

  // PAGINATED AGENTS
  const totalPages = Math.ceil(sortedAgents.length / pageSize) || 1;
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAgents.slice(start, start + pageSize);
  }, [sortedAgents, currentPage, pageSize]);

  // METRICS COMPUTATION
  const totalFiltered = filteredAgents.length;
  const totalAgents = agents.length;
  const validesCount = filteredAgents.filter((a) => a.statut === 'VALIDE' || a.statut === 'ACTIF').length;
  const verificationCount = filteredAgents.filter((a) => a.statut === 'VERIFICATION' || a.statut === 'EN_ATTENTE').length;
  const brouillonCount = filteredAgents.filter((a) => a.statut === 'BROUILLON' || a.statut === 'INCOMPLET').length;
  const rejetaisCount = filteredAgents.filter((a) => a.statut === 'REJETE').length;

  const hommesCount = filteredAgents.filter((a) => (a.sexe || 'M').toUpperCase() === 'M').length;
  const femmesCount = filteredAgents.filter((a) => (a.sexe || 'M').toUpperCase() === 'F').length;
  const payesCount = filteredAgents.filter((a) => a.statutPaiement === 'PAYE').length;
  const nonPayesCount = filteredAgents.filter((a) => a.statutPaiement !== 'PAYE').length;

  const percentValide = totalFiltered > 0 ? Math.round((validesCount / totalFiltered) * 100) : 0;
  const percentHommes = totalFiltered > 0 ? Math.round((hommesCount / totalFiltered) * 100) : 0;
  const percentFemmes = totalFiltered > 0 ? Math.round((femmesCount / totalFiltered) * 100) : 0;

  // QUALITY AUDIT METRICS
  const missingMatriculeCount = filteredAgents.filter((a) => !a.matricule || a.matricule.trim() === '' || a.matricule === 'N/A').length;
  const unassignedDirCount = filteredAgents.filter((a) => !a.directionId && !a.directionNom).length;
  const missingGradeCount = filteredAgents.filter((a) => !a.fonctionId && !a.fonctionNom).length;
  const missingServiceCount = filteredAgents.filter((a) => !a.serviceId && !a.service).length;
  const missingContactCount = filteredAgents.filter((a) => !a.telephone || a.telephone.trim() === '').length;
  const incompleteProfileCount = missingGradeCount + missingServiceCount + missingContactCount + unassignedDirCount;
  const completeProfileCount = totalFiltered - incompleteProfileCount;
  const completenessPercent = totalFiltered > 0 ? Math.round(((totalFiltered - incompleteProfileCount) / totalFiltered) * 100) : 100;
  const payeRate = totalFiltered > 0 ? Math.round((payesCount / totalFiltered) * 100) : 0;
  const nonPayesRate = totalFiltered > 0 ? Math.round((nonPayesCount / totalFiltered) * 100) : 0;

  const activeFiltersCount =
    (search ? 1 : 0) +
    (directionFilter !== 'TOUS' ? 1 : 0) +
    (serviceFilter !== 'TOUS' ? 1 : 0) +
    (statutDossierFilter !== 'TOUS' ? 1 : 0) +
    (sexeFilter !== 'TOUS' ? 1 : 0);

  const getActiveFilterSummary = () => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`Mot-clé: "${search.trim()}"`);
    if (directionFilter !== 'TOUS') {
      const dirObj = directions.find((d) => d.id === directionFilter);
      parts.push(`Division: ${dirObj ? dirObj.nom : directionFilter}`);
    }
    if (serviceFilter !== 'TOUS') {
      parts.push(`Service: ${serviceFilter}`);
    }
    if (statutDossierFilter !== 'TOUS') {
      parts.push(`Statut: ${statutDossierFilter}`);
    }
    if (sexeFilter !== 'TOUS') {
      parts.push(`Genre: ${sexeFilter === 'M' ? 'Masculin (M)' : 'Féminin (F)'}`);
    }
    return parts;
  };

  const resetAllFilters = () => {
    setSearch('');
    setDirectionFilter(currentUser?.directionId && currentUser.roleId !== 'role-super-admin' ? currentUser.directionId : 'TOUS');
    setServiceFilter('TOUS');
    setStatutDossierFilter('TOUS');
    setSexeFilter('TOUS');
    setCurrentPage(1);
  };

  const toggleSort = (field: 'nom' | 'matricule' | 'directionNom' | 'statut') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleDirectionExpand = (dirId: string) => {
    setExpandedDirIds((prev) =>
      prev.includes(dirId) ? prev.filter((id) => id !== dirId) : [...prev, dirId]
    );
  };

  // EXPORT EXCEL (.CSV UTF-8 BOM)
  const handleExportExcel = () => {
    const today = new Date().toISOString().split('T')[0];
    const filterSuffix = activeFiltersCount > 0 ? '_filtre' : '_global';
    const filename = `Rapport_RH_SG_Decentralisation_${today}${filterSuffix}.csv`;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO\n';
    csvContent += 'MINISTÈRE DE L\'INTÉRIEUR, SÉCURITÉ, DÉCENTRALISATION ET AFFAIRES COUTUMIÈRES\n';
    csvContent += 'SECRÉTARIAT GÉNÉRAL À LA DÉCENTRALISATION — DIVISION DES RESSOURCES HUMAINES\n';
    csvContent += `${currentDirectionLabel}\n`;
    csvContent += 'RAPPORT GENERAL D\'ANALYSE DES EFFECTIFS ET DU FICHIER RH\n';
    csvContent += `Date d'extraction : ${new Date().toLocaleString('fr-FR')}\n`;

    const filterSummary = getActiveFilterSummary();
    if (filterSummary.length > 0) {
      csvContent += `FILTRES APPLIQUÉS : ${filterSummary.join(' | ')}\n`;
    } else {
      csvContent += 'FILTRES : AUCUN (Vue Globale Exhaustive)\n';
    }
    csvContent += `EFFECTIF EXTRAIT : ${filteredAgents.length} agent(s) sur un total de ${agents.length}\n\n`;

    const headers = [
      'n°',
      'Nom, post nom et prénom',
      'date de naissance',
      'date d\'engagement',
      'acte d\'engagement',
      'sexe',
      'matricule',
      'grande',
      'fonction',
      'salaire',
      'montant salaire',
      'prime',
      'montant prime',
      'recensement',
      'observation',
      'directionId',
      'directionNom',
      'fonctionId',
      'fonctionNom',
      'statut',
      'statutPaiement',
      'montantPaiement',
      'datePaiement',
      'createdAt',
      'updatedAt',
      'divisionId',
      'divisionNom',
    ];

    csvContent += headers.map((header) => `"${header}"`).join(';') + '\n';

    filteredAgents.forEach((ag, idx) => {
      const nomComplet = `${ag.nom} ${ag.postNom || ''} ${ag.prenom}`.trim();
      const dateEngagement = ag.createdAt ? ag.createdAt.split('T')[0] : '';
      const montantSalaire = typeof ag.montantPaiement === 'number' && ag.montantPaiement > 0 ? ag.montantPaiement.toLocaleString('fr-FR') : '';
      const row = [
        idx + 1,
        nomComplet,
        ag.dateNaissance || '',
        dateEngagement,
        '',
        ag.sexe || '',
        ag.matricule || '',
        ag.fonctionNom || '',
        '',
        montantSalaire,
        '',
        '',
        '',
        ag.statut || '',
        ag.directionId || '',
        ag.directionNom || '',
        ag.fonctionId || '',
        ag.fonctionNom || '',
        ag.statut || '',
        ag.statutPaiement || '',
        ag.montantPaiement ?? '',
        ag.datePaiement || '',
        ag.createdAt || '',
        '',
        ag.divisionId || '',
        ag.divisionNom || '',
      ];

      csvContent += row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';') + '\n';
    });

    // Summary block at the bottom
    csvContent += '\n';
    csvContent += `RÉCAPITULATIF STATISTIQUE;Total Inclus: ${filteredAgents.length};Validés: ${validesCount} (${percentValide}%);En vérification: ${verificationCount};Brouillons: ${brouillonCount};Hommes: ${hommesCount} (${percentHommes}%);Femmes: ${femmesCount} (${percentFemmes}%);Payés: ${payesCount} (${payeRate}%);Non payés: ${nonPayesCount} (${nonPayesRate}%);Sans matricule: ${missingMatriculeCount};Sans division: ${unassignedDirCount};Grades manquants: ${missingGradeCount};Services manquants: ${missingServiceCount};Profil incomplet: ${incompleteProfileCount};Complétude: ${completenessPercent}%\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const handleExportPDF = async () => {
    try {
      setPdfNotice(null);
      const response = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ filters: {
          directionId: directionFilter !== 'TOUS' ? directionFilter : '',
          service: serviceFilter !== 'TOUS' ? serviceFilter : '',
          statut: statutDossierFilter !== 'TOUS' ? statutDossierFilter : '',
          sexe: sexeFilter !== 'TOUS' ? sexeFilter : '',
          search: search.trim(),
        } }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Erreur lors de la génération du PDF.');
      }

      const blob = await response.blob();
      const filename = `Rapport_RH_SG_Decentralisation_${new Date().toISOString().split('T')[0]}_global.pdf`;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setPdfNotice('Le rapport PDF a été généré et téléchargé avec succès.');
    } catch (error) {
      console.error('PDF export failed', error);
      setPdfNotice('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  const handlePrintPage = () => {
    try {
      window.print();
    } catch (err) {
      console.error('Erreur window.print:', err);
      handleExportPDF();
    }
  };

  const handlePrint = () => {
    handlePrintPage();
  };

  const visibleDirections = currentUser && !['role-super-admin', 'role-admin'].includes(currentUser.roleId) && currentUser.directionId
    ? directions.filter((dir) => dir.id === currentUser.directionId)
    : directions;

  const visibleServices = useMemo(() => {
    const scopedByDirection = !currentUser?.directionId
      ? services
      : services.filter((srv) => {
          if (srv.directionId && currentUser.directionId && srv.directionId === currentUser.directionId) {
            return true;
          }

          if (srv.divisionId && currentUser.divisionId && srv.divisionId === currentUser.divisionId) {
            return true;
          }

          if (srv.divisionNom && currentUser.divisionNom && srv.divisionNom === currentUser.divisionNom) {
            return true;
          }

          if (!currentUser.roleId || ['role-super-admin', 'role-admin'].includes(currentUser.roleId)) {
            return true;
          }

          return false;
        });

    if (currentUser?.roleId === 'role-chef-bureau' && currentUser.serviceId) {
      return scopedByDirection.filter((srv) => srv.id === currentUser.serviceId || srv.nom === currentUser.serviceNom);
    }

    if (currentUser?.roleId === 'role-chef-division' && currentUser.divisionId) {
      return scopedByDirection.filter((srv) => {
        if (srv.divisionId && currentUser.divisionId && srv.divisionId === currentUser.divisionId) return true;
        if (srv.divisionNom && currentUser.divisionNom && srv.divisionNom === currentUser.divisionNom) return true;
        return false;
      });
    }

    return scopedByDirection;
  }, [services, currentUser]);

  const availableServices = directionFilter === 'TOUS'
    ? visibleServices
    : visibleServices.filter((s) => {
        if (s.directionId === directionFilter) return true;
        if (!s.divisionId) return false;
        return divisions.some((division) => division.id === s.divisionId && division.directionId === directionFilter);
      });

  const currentDirectionName = directionFilter !== 'TOUS'
    ? directions.find((d) => d.id === directionFilter)?.nom || directionFilter
    : currentUser?.directionNom || 'Toutes les directions';

  const currentDirectionLabel = currentDirectionName === 'Toutes les directions'
    ? 'Périmètre global : toutes les directions'
    : `Direction : ${currentDirectionName}`;

  // BREAKDOWN BY DIRECTION COMPUTATION
  const directionBreakdown = useMemo(() => {
    return directions.map((dir) => {
      const dirAgents = filteredAgents.filter((a) => {
        const resolvedDirectionId = resolveAgentDirection(a);
        return resolvedDirectionId === dir.id || a.directionId === dir.id || a.directionNom === dir.nom;
      });
      const val = dirAgents.filter((a) => a.statut === 'VALIDE' || a.statut === 'ACTIF').length;
      const ver = dirAgents.filter((a) => a.statut === 'VERIFICATION' || a.statut === 'EN_ATTENTE').length;
      const h = dirAgents.filter((a) => (a.sexe || 'M').toUpperCase() === 'M').length;
      const f = dirAgents.filter((a) => (a.sexe || 'M').toUpperCase() === 'F').length;

      const dirServices = services.filter((s) => s.directionId === dir.id || (s.divisionId && divisions.some((division) => division.id === s.divisionId && division.directionId === dir.id)));

      return {
        direction: dir,
        total: dirAgents.length,
        valides: val,
        verification: ver,
        hommes: h,
        femmes: f,
        rate: dirAgents.length > 0 ? Math.round((val / dirAgents.length) * 100) : 0,
        services: dirServices.map((srv) => {
          const srvAgents = dirAgents.filter((a) => a.serviceId === srv.id || a.service === srv.nom);
          return {
            service: srv,
            count: srvAgents.length,
          };
        }),
      };
    });
  }, [directions, services, divisions, filteredAgents, resolveAgentDirection]);

  // BREAKDOWN BY FONCTION / GRADE COMPUTATION
  const fonctionBreakdown = useMemo(() => {
    return fonctions.map((fnc) => {
      const fncAgents = filteredAgents.filter((a) => a.fonctionId === fnc.id || a.fonctionNom === fnc.nom);
      const val = fncAgents.filter((a) => a.statut === 'VALIDE' || a.statut === 'ACTIF').length;
      const h = fncAgents.filter((a) => (a.sexe || 'M').toUpperCase() === 'M').length;
      const f = fncAgents.filter((a) => (a.sexe || 'M').toUpperCase() === 'F').length;

      return {
        fonction: fnc,
        total: fncAgents.length,
        valides: val,
        hommes: h,
        femmes: f,
        percentShare: totalFiltered > 0 ? Math.round((fncAgents.length / totalFiltered) * 100) : 0,
        validationRate: fncAgents.length > 0 ? Math.round((val / fncAgents.length) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [fonctions, filteredAgents, totalFiltered]);

  return (
    <div className="office-layout" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          <div className="direction-container">

            {/* OFFICIAL SOBRE ADMINISTRATIVE HEADER BANNER */}
            <div
              style={{
                background: '#0f172a',
                borderRadius: '16px',
                padding: '28px 32px',
                border: '1px solid #1e293b',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                marginBottom: '24px',
                position: 'relative',
                color: 'white',
              }}
            >
              {/* TOP DISCRET FLAG ACCENT */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  display: 'flex',
                  borderTopLeftRadius: '16px',
                  borderTopRightRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ flex: 3, backgroundColor: '#0284c7' }} />
                <div style={{ flex: 1, backgroundColor: '#eab308' }} />
                <div style={{ flex: 1, backgroundColor: '#dc2626' }} />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '20px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '20px',
                }}
              >
                {/* BRANDING */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div
                    style={{
                      background: 'white',
                      padding: '8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RdcLogo size="lg" variant="seal" />
                  </div>

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#f8fafc',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
                    </h2>
                    <h3 style={{ margin: '3px 0 0 0', fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
                      MINISTÈRE DE L&apos;INTÉRIEUR, SÉCURITÉ, DÉCENTRALISATION ET AFFAIRES COUTUMIÈRES
                    </h3>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                      SECRÉTARIAT GÉNÉRAL À LA DÉCENTRALISATION — DIVISION DES RESSOURCES HUMAINES
                    </h4>
                  </div>
                </div>

                {/* OFFICIAL REF */}
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: 'white',
                    }}
                  >
                    <div style={{ color: '#f8fafc', fontWeight: 700 }}>
                      Réf: RDC/SGD/DRH/2026/RAP-STAT
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Kinshasa, le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* TITLE & EXPORT BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                    {currentUser?.directionNom
                      ? `${currentUser.directionNom} — Rapport RH`
                      : 'RAPPORT ET ANALYSE DÉTAILLÉE DU FICHIER RH'}
                  </h1>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    {currentUser?.directionNom
                      ? `Indicateurs et performances de ${currentUser.directionNom}`
                      : 'Indicateurs clés de la fonction publique, état de validation des dossiers et audit analytique'}
                  </p>
                </div>

                {/* ACTIONS */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="no-print">
                  {/* Export Excel button hidden per configuration */}

                  {/* PDF export button hidden per configuration */}

                  <button
                    onClick={handlePrint}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#334155',
                      color: 'white',
                      border: '1px solid #475569',
                      padding: '9px 16px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                    title="Imprimer le rapport ou sauvegarder en PDF"
                  >
                    <Printer size={16} />
                    Imprimer / PDF
                  </button>
                </div>
              </div>

              {/* PDF TOAST NOTIFICATION */}
              {pdfNotice && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '10px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <CheckCircle2 size={16} />
                  {pdfNotice}
                </div>
              )}

              {/* SCOPE STATUS */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontWeight: 800,
                      backgroundColor: activeFiltersCount > 0 ? '#0284c7' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      fontSize: '11px',
                    }}
                  >
                    {activeFiltersCount > 0 ? `Filtres Actifs (${activeFiltersCount})` : 'Périmètre Global'}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>
                    {activeFiltersCount > 0
                      ? getActiveFilterSummary().join(' • ')
                      : 'Affichage exhaustif de l\'ensemble de l\'effectif répertorié.'}
                  </span>
                </div>

                <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                  Effectif inclus : <span style={{ color: '#38bdf8' }}>{filteredAgents.length}</span> / {totalAgents} agents
                </div>
              </div>
            </div>

            {/* PRINT SUMMARY BANNER (Visibly attached to printed output) */}
            <div
              className="print-summary-banner"
              style={{
                display: 'none',
                marginBottom: '20px',
                padding: '14px 18px',
                border: '2px solid #0f172a',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', color: '#0f172a', marginBottom: '4px' }}>
                EXTRAIT RH IMPRIMÉ SELON CRITÈRES DE FILTRAGE
              </div>
              <div style={{ fontSize: '12px', color: '#334155' }}>
                <strong>Critères appliqués ({activeFiltersCount}) :</strong>{' '}
                {activeFiltersCount > 0 ? getActiveFilterSummary().join(' | ') : 'Tous les enregistrements (Vue globale)'}
              </div>
              <div style={{ fontSize: '12px', color: '#334155', marginTop: '3px' }}>
                <strong>Effectif filtré à l&apos;impression :</strong> {filteredAgents.length} agent(s) sélectionné(s) sur un total de {totalAgents}
              </div>
            </div>

            {/* EXECUTIVE SUMMARY PANEL */}
            <section
              style={{
                marginBottom: '24px',
                padding: '20px 22px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: 'white',
                border: '1px solid #334155',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ maxWidth: '720px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#e2e8f0' }}>
                    <BadgeCheck size={14} /> Résumé exécutif RH
                  </div>
                  <h3 style={{ margin: '10px 0 6px', fontSize: '18px', fontWeight: 800 }}>
                    Vue de synthèse du fichier RH et des dossiers en cours de traitement
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1' }}>
                    Le périmètre actuellement analysé couvre {filteredAgents.length} agent(s) sur {totalAgents}, avec un taux de validation de {percentValide}% et un taux de paiement de {payeRate}%. {missingMatriculeCount} agent(s) n&apos;ont pas de matricule officiel, et {incompleteProfileCount} profil(s) sont incomplets.
                    Ces anomalies concentrent la priorité sur la normalisation des matricules, la clôture des paiements non effectués, et la validation des dossiers en attente.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: '132px', padding: '10px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#cbd5e1' }}>Validation</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>{percentValide}%</div>
                  </div>
                  <div style={{ minWidth: '132px', padding: '10px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#cbd5e1' }}>Paiements</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>{nonPayesCount} en attente</div>
                  </div>
                  <div style={{ minWidth: '132px', padding: '10px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#cbd5e1' }}>Profil incomplet</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>{incompleteProfileCount}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* KPI STAT CARDS (SOBER MONOCHROME / NEUTRAL ACCENTS) */}
            <section className="stats" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <StatCard
                title={activeFiltersCount > 0 ? 'Effectif Filtré' : 'Total Effectif Répertorié'}
                value={`${filteredAgents.length}`}
                icon={Users}
                color="#0f172a"
              />
              <StatCard
                title="Dossiers Validés & Certifiés"
                value={`${validesCount} (${percentValide}%)`}
                icon={CheckCircle2}
                color="#16a34a"
              />
              <StatCard
                title="En Traitement / Contrôle"
                value={`${verificationCount + brouillonCount}`}
                icon={Clock}
                color="#d97706"
              />
              <StatCard
                title="Répartition Genre"
                value={`${percentHommes}% M / ${percentFemmes}% F`}
                icon={PieChart}
                color="#475569"
              />
              <StatCard
                title="Paiement RH"
                value={`${payesCount} payés / ${nonPayesCount} attente`}
                icon={CreditCard}
                color="#0f766e"
              />
              <StatCard
                title="Taux de paiement"
                value={`${payeRate}%`}
                icon={CreditCard}
                color="#0f9a8e"
              />
              <StatCard
                title="Complétude Profil"
                value={`${completenessPercent}% (${incompleteProfileCount} incomplet(s))`}
                icon={BadgeCheck}
                color="#2563eb"
              />
            </section>

            {/* INTERACTIVE NAVIGATION TABS */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '2px solid #e2e8f0',
                marginBottom: '24px',
                overflowX: 'auto',
                paddingBottom: '2px',
              }}
            >
              <button
                onClick={() => setActiveTab('FICHIER')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'FICHIER' ? '3px solid #0f172a' : '3px solid transparent',
                  background: 'none',
                  fontWeight: activeTab === 'FICHIER' ? 800 : 600,
                  color: activeTab === 'FICHIER' ? '#0f172a' : '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Users size={16} /> Fichier RH &amp; Repertoire
              </button>

              <button
                onClick={() => setActiveTab('DIRECTIONS')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'DIRECTIONS' ? '3px solid #0f172a' : '3px solid transparent',
                  background: 'none',
                  fontWeight: activeTab === 'DIRECTIONS' ? 800 : 600,
                  color: activeTab === 'DIRECTIONS' ? '#0f172a' : '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Building2 size={16} /> Ventilation par Division ({directions.length})
              </button>

              <button
                onClick={() => setActiveTab('GRADES')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'GRADES' ? '3px solid #0f172a' : '3px solid transparent',
                  background: 'none',
                  fontWeight: activeTab === 'GRADES' ? 800 : 600,
                  color: activeTab === 'GRADES' ? '#0f172a' : '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Briefcase size={16} /> Pyramide des Grades
              </button>

              <button
                onClick={() => setActiveTab('PARITE')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'PARITE' ? '3px solid #0f172a' : '3px solid transparent',
                  background: 'none',
                  fontWeight: activeTab === 'PARITE' ? 800 : 600,
                  color: activeTab === 'PARITE' ? '#0f172a' : '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <PieChart size={16} /> Analyse Genre &amp; Parité
              </button>

              <button
                onClick={() => setActiveTab('AUDIT')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'AUDIT' ? '3px solid #0f172a' : '3px solid transparent',
                  background: 'none',
                  fontWeight: activeTab === 'AUDIT' ? 800 : 600,
                  color: activeTab === 'AUDIT' ? '#0f172a' : '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <ShieldCheck size={16} /> Audit &amp; Conformité
              </button>
            </div>

            {/* MULTI-CRITERIA FILTERS PANEL (SHARED) */}
            <div
              className="no-print"
              style={{
                background: 'white',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListFilter size={16} color="#0f172a" />
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    Filtres Multicritères
                  </strong>
                  {activeFiltersCount > 0 && (
                    <span
                      style={{
                        backgroundColor: '#0f172a',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {activeFiltersCount} filtre(s)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'white',
                      background: '#0f172a',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
                      transition: 'all 0.2s',
                    }}
                    title="Télécharger le rapport PDF officiel selon les filtres actifs"
                  >
                    <FileText size={14} />
                    Imprimer / PDF ({filteredAgents.length})
                  </button>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetAllFilters}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#dc2626',
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={13} /> Réinitialiser
                    </button>
                  )}
                </div>
              </div>

              {/* QUICK PRESETS */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
                  Presets :
                </span>
                <button
                  onClick={resetAllFilters}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    background: activeFiltersCount === 0 ? '#0f172a' : 'white',
                    color: activeFiltersCount === 0 ? 'white' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Tous ({totalAgents})
                </button>
                <button
                  onClick={() => setStatutDossierFilter('VALIDE')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #e2e8f0',
                    background: statutDossierFilter === 'VALIDE' ? '#16a34a' : 'white',
                    color: statutDossierFilter === 'VALIDE' ? 'white' : '#15803d',
                    cursor: 'pointer',
                  }}
                >
                  Validés ({validesCount})
                </button>
                <button
                  onClick={() => setStatutDossierFilter('VERIFICATION')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #e2e8f0',
                    background: statutDossierFilter === 'VERIFICATION' ? '#d97706' : 'white',
                    color: statutDossierFilter === 'VERIFICATION' ? 'white' : '#b45309',
                    cursor: 'pointer',
                  }}
                >
                  En vérification ({verificationCount})
                </button>
                <button
                  onClick={() => setSexeFilter('F')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #e2e8f0',
                    background: sexeFilter === 'F' ? '#475569' : 'white',
                    color: sexeFilter === 'F' ? 'white' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Femmes ({femmesCount})
                </button>
                <button
                  onClick={() => setSexeFilter('M')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #e2e8f0',
                    background: sexeFilter === 'M' ? '#0f172a' : 'white',
                    color: sexeFilter === 'M' ? 'white' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Hommes ({hommesCount})
                </button>
              </div>

              {/* FILTER INPUTS GRID */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* 1. KEYWORD SEARCH */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Recherche Nom / Matricule / Grade
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={14}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                    />
                    <input
                      type="text"
                      placeholder="Tapez pour filtrer..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px 7px 30px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                {/* 2. DIRECTION */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Division Métier
                  </label>
                  <select
                    value={directionFilter}
                    onChange={(e) => {
                      setDirectionFilter(e.target.value);
                      setServiceFilter('TOUS');
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'white',
                    }}
                    disabled={Boolean(currentUser?.directionId)}
                  >
                    {currentUser?.directionId ? (
                      visibleDirections.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nom}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="TOUS">Toutes les Divisions ({visibleDirections.length})</option>
                        {visibleDirections.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nom}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {currentUser?.directionId && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#475569' }}>
                      Filtré sur votre direction : {visibleDirections[0]?.nom || currentUser.directionId}
                    </div>
                  )}
                </div>

                {/* 3. SERVICE */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Service / Division
                  </label>
                  <select
                    value={serviceFilter}
                    onChange={(e) => {
                      setServiceFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="TOUS">Tous les Services ({availableServices.length})</option>
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.nom}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. STATUT DOSSIER */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Statut du Dossier RH
                  </label>
                  <select
                    value={statutDossierFilter}
                    onChange={(e) => {
                      setStatutDossierFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="TOUS">Tous les Statuts</option>
                    <option value="VALIDE">VALIDE &amp; CERTIFIÉ</option>
                    <option value="ACTIF">ACTIF (En service)</option>
                    <option value="VERIFICATION">EN VÉRIFICATION</option>
                    <option value="BROUILLON">BROUILLON / INCOMPLET</option>
                    <option value="REJETE">REJETÉ</option>
                  </select>
                </div>

                {/* 5. GENRE */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Genre / Sexe
                  </label>
                  <select
                    value={sexeFilter}
                    onChange={(e) => {
                      setSexeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="TOUS">Tous les Genres</option>
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: FICHIER RH & REPERTOIRE TABLE */}
            {activeTab === 'FICHIER' && (
              <div
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: '#f8fafc',
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      Répertoire Général des Agents ({sortedAgents.length})
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      Fichier récapitulatif certifié du Secrétariat Général
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Lignes par page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Chargement des agents en cours...
                  </div>
                ) : paginatedAgents.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Aucun agent ne correspond aux critères de recherche.
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px', width: '50px' }}>N°</th>
                            <th
                              style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => toggleSort('matricule')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Matricule <ArrowUpDown size={12} />
                              </div>
                            </th>
                            <th
                              style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => toggleSort('nom')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Nom &amp; Prénom <ArrowUpDown size={12} />
                              </div>
                            </th>
                            <th style={{ padding: '12px 16px', width: '60px' }}>Sexe</th>
                            <th
                              style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => toggleSort('directionNom')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Division <ArrowUpDown size={12} />
                              </div>
                            </th>
                            <th style={{ padding: '12px 16px' }}>Service / Division</th>
                            <th style={{ padding: '12px 16px' }}>Grade</th>
                            <th
                              style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => toggleSort('statut')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Statut RH <ArrowUpDown size={12} />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAgents.map((ag, index) => {
                            const globalIndex = (currentPage - 1) * pageSize + index + 1;
                            const isValide = ag.statut === 'VALIDE' || ag.statut === 'ACTIF';
                            const isVerif = ag.statut === 'VERIFICATION' || ag.statut === 'EN_ATTENTE';
                            const isRejete = ag.statut === 'REJETE';

                            return (
                              <tr
                                key={ag.id}
                                style={{
                                  borderBottom: '1px solid #f1f5f9',
                                  backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                                }}
                              >
                                <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{globalIndex}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                                  {ag.matricule || 'N/A'}
                                </td>
                                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                                  {ag.nom} {ag.postNom || ''} {ag.prenom}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>
                                  {ag.sexe || 'M'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#334155' }}>
                                  {ag.directionNom || 'Non affecté'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#334155' }}>
                                  {ag.service || 'Général'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#334155' }}>
                                  {ag.fonctionNom || 'Non spécifié'}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      backgroundColor: isValide
                                        ? '#dcfce7'
                                        : isVerif
                                        ? '#fef3c7'
                                        : isRejete
                                        ? '#fee2e2'
                                        : '#f1f5f9',
                                      color: isValide
                                        ? '#15803d'
                                        : isVerif
                                        ? '#b45309'
                                        : isRejete
                                        ? '#b91c1c'
                                        : '#475569',
                                    }}
                                  >
                                    {ag.statut}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION BAR */}
                    <div
                      style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#64748b',
                        background: '#f8fafc',
                      }}
                    >
                      <div>
                        Affichage de {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, sortedAgents.length)} sur {sortedAgents.length} agents
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: currentPage === 1 ? '#f1f5f9' : 'white',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            color: '#334155',
                          }}
                        >
                          Précédent
                        </button>
                        <span style={{ padding: '4px 8px', fontWeight: 700, color: '#0f172a' }}>
                          Page {currentPage} sur {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: currentPage === totalPages ? '#f1f5f9' : 'white',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            color: '#334155',
                          }}
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: VENTILATION PAR DIVISION */}
            {activeTab === 'DIRECTIONS' && (
              <div
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Matrice de Répartition par Division &amp; Service
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Analyse comparative des effectifs et taux de conformité par structure administrative
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px' }}>Division Métier</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Agents</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Validés</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>En vérification</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Hommes / Femmes</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Taux de Conformité</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', width: '80px' }}>Services</th>
                      </tr>
                    </thead>
                    <tbody>
                      {directionBreakdown.map((row) => {
                        const isExpanded = expandedDirIds.includes(row.direction.id);

                        return (
                          <React.Fragment key={row.direction.id}>
                            <tr
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isExpanded ? '#f8fafc' : 'white',
                              }}
                            >
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                                {row.direction.nom}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                                {row.total}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                                {row.valides}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#b45309', fontWeight: 600 }}>
                                {row.verification}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>
                                {row.hommes} M / {row.femmes} F
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                  <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${row.rate}%`,
                                        height: '100%',
                                        background: '#16a34a',
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                                    {row.rate}%
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <button
                                  onClick={() => toggleDirectionExpand(row.direction.id)}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    color: '#0f172a',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                  }}
                                >
                                  {row.services.length} {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </td>
                            </tr>

                            {/* EXPANDED SERVICES ROW */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <div style={{ padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <strong style={{ fontSize: '12px', color: '#475569', display: 'block', marginBottom: '8px' }}>
                                      Services rattachés à la {row.direction.nom} :
                                    </strong>
                                    {row.services.length === 0 ? (
                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Aucun service spécifique rattaché dans la base.</span>
                                    ) : (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                                        {row.services.map((srv) => (
                                          <div
                                            key={srv.service.id}
                                            style={{
                                              padding: '6px 10px',
                                              background: '#f1f5f9',
                                              borderRadius: '6px',
                                              fontSize: '12px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span style={{ color: '#334155', fontWeight: 600 }}>{srv.service.nom}</span>
                                            <strong style={{ color: '#0f172a' }}>{srv.count} agent(s)</strong>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: PYRAMIDE DES GRADES & FONCTIONS */}
            {activeTab === 'GRADES' && (
              <div
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Répartition par Grade Administratif
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Proportion des agents par catégorie de fonction, taux de validation et répartition homme/femme
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px' }}>Intitulé du Poste / Grade</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Nombre d&apos;Agents</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Proportion Total</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Validés</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Hommes / Femmes</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Taux de Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fonctionBreakdown.map((fRow, idx) => (
                        <tr
                          key={fRow.fonction.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                            {fRow.fonction.nom}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                            {fRow.total}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                            {fRow.percentShare}%
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                            {fRow.valides}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>
                            {fRow.hommes} M / {fRow.femmes} F
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: fRow.validationRate >= 50 ? '#dcfce7' : '#fef3c7',
                                color: fRow.validationRate >= 50 ? '#15803d' : '#b45309',
                              }}
                            >
                              {fRow.validationRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: ANALYSE PARITÉ & GENRE */}
            {activeTab === 'PARITE' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* OVERALL GENRE DISTRIBUTION CARD */}
                <div
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Indice Global de Parité
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>Hommes ({hommesCount})</span>
                        <strong>{percentHommes}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentHommes}%`, height: '100%', background: '#0f172a' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>Femmes ({femmesCount})</span>
                        <strong>{percentFemmes}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentFemmes}%`, height: '100%', background: '#475569' }} />
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Objectif National Parité :</strong>
                      Le Secrétariat Général vise une représentation féminine minimale de 30% dans tous les services centraux et provinciaux.
                    </div>
                  </div>
                </div>

                {/* PARITY PER DIVISION */}
                <div
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Représentation Féminine par Division
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {directionBreakdown.map((row) => {
                      const femaleRate = row.total > 0 ? Math.round((row.femmes / row.total) * 100) : 0;

                      return (
                        <div key={row.direction.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{row.direction.nom}</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.femmes} F sur {row.total} ({femaleRate}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${femaleRate}%`, height: '100%', background: '#475569' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: AUDIT & CONFORMITÉ */}
            {activeTab === 'AUDIT' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* AUDIT PRINT & EXPORT ACTION BAR */}
                <div
                  className="no-print"
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                      Rapport Synthétique d&apos;Audit &amp; de Conformité RH
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Éditez ou imprimez l&apos;analyse de conformité pour la hiérarchie et le contrôle du personnel
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleExportPDF}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0284c7',
                        color: 'white',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <FileText size={14} /> Télécharger PDF
                    </button>
                    <button
                      onClick={handlePrintPage}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0f172a',
                        color: 'white',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Printer size={14} /> Imprimer cette page
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <ShieldCheck size={20} color="#16a34a" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      Indice de Conformité Fichier RH
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Taux Global de Validation</span>
                      <strong style={{ display: 'block', fontSize: '22px', color: '#16a34a', marginTop: '2px' }}>
                        {percentValide}%
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Dossiers entièrement contrôlés et validés</span>
                    </div>

                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Agents sans Matricule Officiel</span>
                      <strong style={{ display: 'block', fontSize: '22px', color: missingMatriculeCount > 0 ? '#b45309' : '#16a34a', marginTop: '2px' }}>
                        {missingMatriculeCount}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Nécessitent l&apos;attribution d&apos;un numéro de série</span>
                    </div>

                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Agents non affectés à une Division</span>
                      <strong style={{ display: 'block', fontSize: '22px', color: unassignedDirCount > 0 ? '#b45309' : '#16a34a', marginTop: '2px' }}>
                        {unassignedDirCount}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>À régulariser par la Division du Personnel</span>
                    </div>

                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Taux de Paiement</span>
                      <strong style={{ display: 'block', fontSize: '22px', color: '#16a34a', marginTop: '2px' }}>
                        {payeRate}%
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Proportion des dossiers payés sur l&apos;ensemble du périmètre filtré</span>
                    </div>

                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Grades et services manquants</span>
                      <strong style={{ display: 'block', fontSize: '22px', color: missingGradeCount + missingServiceCount > 0 ? '#b45309' : '#16a34a', marginTop: '2px' }}>
                        {missingGradeCount + missingServiceCount}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Grades non renseignés : {missingGradeCount} • Services non renseignés : {missingServiceCount}</span>
                    </div>

                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Dossiers en attente de paiement</span>
                      <strong style={{ display: 'block', fontSize: '22px', color: nonPayesCount > 0 ? '#b45309' : '#16a34a', marginTop: '2px' }}>
                        {nonPayesCount}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Paiements déjà effectués : {payesCount}</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <AlertTriangle size={20} color="#b45309" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      Actions Correctives Recommandées
                    </h3>
                  </div>

                  <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Award size={18} color="#0f172a" />
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>Top 3 actions RH</strong>
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '18px', color: '#334155', fontSize: '12px', lineHeight: 1.75 }}>
                      <li>Finaliser les pièces justificatives des {verificationCount} dossiers en attente.</li>
                      <li>Attribuer un matricule officiel aux {missingMatriculeCount} agents sans matricule.</li>
                      <li>Traiter en priorité les {nonPayesCount} paiements non réglés.</li>
                    </ol>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                    <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                      <strong style={{ color: '#b45309', display: 'block', marginBottom: '2px' }}>Vérification des Dossiers en Attente ({verificationCount})</strong>
                      Finaliser les pièces justificatives manquantes pour valider l&apos;affectation officielle.
                    </div>

                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Normalisation des Matricules ({missingMatriculeCount})</strong>
                      Saisir les numéros de matricule de la Fonction Publique pour l&apos;ensemble des agents répertoriés.
                    </div>

                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Mise à Jour Trimestrielle des Effectifs</strong>
                      Transmettre l&apos;état nominatif certifié à la Division Générale du Budget et du Contrôle de la Paie.
                    </div>

                    <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                      <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: '2px' }}>Conclusion Principale</strong>
                      Prioriser la régularisation des matricules et le traitement des paiements non réglés pour réduire les risques de rejet administratif.
                    </div>
                  </div>
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
