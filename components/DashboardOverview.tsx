'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileArchive,
  FileText,
  GitPullRequest,
  Landmark,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  UserPlus,
} from 'lucide-react';

type DashboardStats = {
  total: number;
  verification: number;
  valide: number;
  rejete: number;
  brouillon: number;
  percentActifs?: number;
};

type DirectionStat = {
  name: string;
  total: number;
  verification: number;
  valide: number;
};

type PresenceWidget = {
  total: number;
  pointed: number;
  message: string;
  open: boolean;
};

type Agent = {
  id?: string;
  nom?: string;
  prenom?: string;
  fullName?: string;
  Nom_postnom_prenom?: string;
  matricule?: string;
  Matricule?: string;
  directionNom?: string;
  direction_nom?: string;
  statut?: string;
  createdAt?: string;
  created_at?: string;
};

type DashboardOverviewProps = {
  currentUser: { fullName: string; directionNom?: string } | null;
  stats: DashboardStats;
  directionStats: DirectionStat[];
  agents: Agent[];
  presence: PresenceWidget;
  loading: boolean;
};

const modules = [
  { label: 'Agents', detail: 'Dossiers et importation', href: '/agents', icon: Users, tone: 'red' },
  { label: 'Organisation', detail: 'Directions et services', href: '/directions?tab=list', icon: Building2, tone: 'blue' },
  { label: 'Territoire', detail: 'Provinces, villes, communes', href: '/provinces', icon: MapPin, tone: 'green' },
  { label: 'Workflow', detail: 'Dossiers à traiter', href: '/workflows', icon: GitPullRequest, tone: 'amber' },
  { label: 'Documents', detail: 'Archives administratives', href: '/documents', icon: FileArchive, tone: 'violet' },
  { label: 'Rapports', detail: 'Statistiques et exports', href: '/reports', icon: BarChart3, tone: 'slate' },
];

function displayAgentName(agent: Agent) {
  return agent.Nom_postnom_prenom || agent.fullName || [agent.nom, agent.prenom].filter(Boolean).join(' ') || 'Agent sans nom';
}

function formatDate(value?: string) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export default function DashboardOverview({ currentUser, stats, directionStats, agents, presence, loading }: DashboardOverviewProps) {
  const recentAgents = [...agents].slice(-5).reverse();
  const workflowTotal = stats.verification + stats.brouillon;
  const progress = stats.total > 0 ? Math.round((stats.valide / stats.total) * 100) : 0;

  return (
    <main className="office-content sigad-dashboard">
      <section className="sigad-hero">
        <div>
          <span className="sigad-eyebrow"><Landmark size={15} /> SIGAD · PILOTAGE ADMINISTRATIF</span>
          <h1>Bonjour, {currentUser?.fullName || 'Utilisateur'}</h1>
          <p>{currentUser?.directionNom ? `Vue opérationnelle de ${currentUser.directionNom}.` : 'Votre centre de pilotage de la décentralisation.'}</p>
        </div>
        <div className="sigad-hero-actions">
          <Link href="/agents/create" className="sigad-primary-action"><Plus size={16} /> Nouvel agent</Link>
          <Link href="/reports" className="sigad-secondary-action"><BarChart3 size={16} /> Voir les rapports</Link>
        </div>
      </section>

      <section className="sigad-kpi-grid" aria-label="Indicateurs principaux">
        <article className="sigad-kpi sigad-kpi-main"><span className="sigad-kpi-icon"><Users size={20} /></span><div><span>Total agents</span><strong>{loading ? '...' : stats.total}</strong><small>Base administrative</small></div></article>
        <article className="sigad-kpi"><span className="sigad-kpi-icon"><Clock3 size={20} /></span><div><span>À vérifier</span><strong>{loading ? '...' : stats.verification}</strong><small>Dossiers en attente</small></div></article>
        <article className="sigad-kpi"><span className="sigad-kpi-icon"><CheckCircle2 size={20} /></span><div><span>Agents validés</span><strong>{loading ? '...' : stats.valide}</strong><small>{progress}% de la base</small></div></article>
        <article className="sigad-kpi"><span className="sigad-kpi-icon"><RefreshCw size={20} /></span><div><span>En mouvement</span><strong>{loading ? '...' : workflowTotal}</strong><small>Brouillons et vérifications</small></div></article>
      </section>

      <section className="sigad-command-grid">
        <article className="sigad-presence-card">
          <div className="sigad-card-heading"><div><span className="sigad-card-label"><CalendarDays size={14} /> PRÉSENCES AUJOURD'HUI</span><h2>Pointage quotidien</h2></div><span className={`sigad-status ${presence.open ? 'is-open' : 'is-closed'}`}><i />{presence.open ? 'Ouvert' : 'Fermé'}</span></div>
          <p>{presence.message || 'Suivez les signatures et les absences de la journée.'}</p>
          <div className="sigad-presence-numbers"><div><strong>{loading ? '...' : presence.pointed}</strong><span>Présents</span></div><div><strong>{loading ? '...' : Math.max(0, presence.total - presence.pointed)}</strong><span>En attente</span></div><div><strong>{loading ? '...' : presence.total}</strong><span>Agents attendus</span></div></div>
          <Link href="/presence" className="sigad-inline-action">Ouvrir le pointage <ArrowRight size={15} /></Link>
        </article>

        <article className="sigad-workflow-card">
          <div className="sigad-card-heading"><div><span className="sigad-card-label"><GitPullRequest size={14} /> CIRCUIT ADMINISTRATIF</span><h2>File de traitement</h2></div><Link href="/workflows" className="sigad-icon-link" aria-label="Ouvrir le workflow"><ArrowRight size={18} /></Link></div>
          <div className="sigad-workflow-total"><strong>{loading ? '...' : workflowTotal}</strong><span>dossiers actifs</span></div>
          <div className="sigad-progress"><span style={{ width: `${Math.min(100, progress)}%` }} /></div>
          <div className="sigad-workflow-legend"><span><i className="dot-amber" /> {stats.verification} vérification</span><span><i className="dot-blue" /> {stats.brouillon} brouillon</span></div>
        </article>
      </section>

      <section className="sigad-section-heading"><div><span className="sigad-card-label">ACCÈS RAPIDES</span><h2>Modules SIGAD</h2></div><Link href="/settings" className="sigad-muted-link">Configurer les accès <ArrowRight size={14} /></Link></section>
      <section className="sigad-module-grid">
        {modules.map((module) => { const Icon = module.icon; return <Link key={module.label} href={module.href} className={`sigad-module sigad-module-${module.tone}`}><span className="sigad-module-icon"><Icon size={21} /></span><span><strong>{module.label}</strong><small>{module.detail}</small></span><ArrowRight size={16} /></Link>; })}
      </section>

      <section className="sigad-lower-grid">
        <article className="sigad-panel"><div className="sigad-panel-heading"><div><span className="sigad-card-label"><Network size={14} /> STRUCTURE ADMINISTRATIVE</span><h2>Agents par direction</h2></div><Link href="/reports?view=directions" className="sigad-muted-link">Détail <ArrowRight size={14} /></Link></div>{directionStats.length ? <div className="sigad-direction-list">{directionStats.slice(0, 5).map((direction) => <div className="sigad-direction-row" key={direction.name}><div className="sigad-direction-name"><span>{direction.name.slice(0, 1).toUpperCase()}</span><strong>{direction.name}</strong></div><div className="sigad-direction-bar"><i style={{ width: `${stats.total ? Math.max(5, (direction.total / stats.total) * 100) : 0}%` }} /></div><strong className="sigad-direction-total">{direction.total}</strong></div>)}</div> : <div className="sigad-empty-state">Aucune direction enregistrée.</div>}</article>

        <article className="sigad-panel"><div className="sigad-panel-heading"><div><span className="sigad-card-label"><FileText size={14} /> ACTIVITÉ RÉCENTE</span><h2>Derniers agents</h2></div><Link href="/agents" className="sigad-muted-link">Tout voir <ArrowRight size={14} /></Link></div>{recentAgents.length ? <div className="sigad-recent-list">{recentAgents.map((agent, index) => <Link href={agent.id ? `/agents/${agent.id}` : '/agents'} className="sigad-recent-row" key={agent.id || `${displayAgentName(agent)}-${index}`}><span className="sigad-recent-avatar">{displayAgentName(agent).slice(0, 1).toUpperCase()}</span><span><strong>{displayAgentName(agent)}</strong><small>{agent.Matricule || agent.matricule || 'Sans matricule'} · {formatDate(agent.createdAt || agent.created_at)}</small></span><span className={`sigad-agent-status status-${String(agent.statut || '').toLowerCase()}`}>{agent.statut || 'Nouveau'}</span></Link>)}</div> : <div className="sigad-empty-state">Aucune activité récente.</div>}</article>
      </section>

      <section className="sigad-footer-strip"><span><ShieldCheck size={17} /> Administration sécurisée</span><span><UserPlus size={17} /> Gestion des habilitations</span><span><CalendarDays size={17} /> Données mises à jour en temps réel</span></section>
    </main>
  );
}
