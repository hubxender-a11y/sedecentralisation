'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Network,
  Briefcase,
  GitPullRequest,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
  HelpCircle,
  ShieldCheck,
  Clock,
  ChevronDown,
  Plus,
  Archive,
  CalendarDays,
  FileArchive,
  FileInput,
  FileOutput,
  FolderOpen,
  Landmark,
  MapPin,
  MessageSquare,
  RefreshCw,
  ScanLine,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { canAccessPath, clearCurrentUser, getCurrentUser, isSuperAdmin, type AdminUser, type PortalPermission } from '@/lib/accessControl';

type Direction = {
  id: string;
  nom: string;
};

type Service = {
  id: string;
  nom: string;
  directionId: string;
};

type MenuItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  permission: PortalPermission;
  items?: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
    permission: PortalPermission;
  }>;
};

export default function OfficeSidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const user = await getCurrentUser();
      if (!cancelled) {
        setCurrentUser(user);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const toggle = () => setMobileOpen((open) => !open);
    window.addEventListener('toggle-office-sidebar', toggle);
    return () => window.removeEventListener('toggle-office-sidebar', toggle);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);


  const allMenuItems: MenuItem[] = [
    { label: 'Tableau de bord', href: '/', icon: LayoutDashboard, permission: 'dashboard' as PortalPermission },
    {
      label: 'Gestion des agents',
      icon: Users,
      permission: 'agents' as PortalPermission,
      items: [
        { label: 'Liste des agents', href: '/agents', icon: Users, permission: 'agents' as PortalPermission },
        { label: 'Nouvel agent', href: '/agents/create', icon: UserPlus, permission: 'agents' as PortalPermission },
        { label: 'Dossiers numériques', href: '/documents', icon: FileText, permission: 'documents' as PortalPermission },
        { label: 'Agents archivés', href: '/agents?status=archive', icon: Archive, permission: 'agents' as PortalPermission },
        { label: 'Importer des agents (Excel/CSV)', href: '/agents/import', icon: FileInput, permission: 'agents' as PortalPermission },
      ],
    },
    {
      label: 'Organisation administrative',
      icon: Building2,
      permission: 'directions' as PortalPermission,
      items: [
        { label: 'Directions', href: '/directions?tab=list', icon: Building2, permission: 'directions' as PortalPermission },
        { label: 'Divisions', href: '/divisions', icon: Network, permission: 'directions' as PortalPermission },
        { label: 'Bureaux', href: '/services?view=bureaux', icon: Briefcase, permission: 'services' as PortalPermission },
        { label: 'Services', href: '/services', icon: Briefcase, permission: 'services' as PortalPermission },
        { label: 'Organigramme', href: '/directions?tab=organigramme', icon: Network, permission: 'directions' as PortalPermission },
      ],
    },
    {
      label: 'Organisation territoriale',
      icon: Network,
      permission: 'settings' as PortalPermission,
      items: [
        { label: 'Provinces', href: '/provinces', icon: Landmark, permission: 'settings' as PortalPermission },
        { label: 'Villes', href: '/villes', icon: MapPin, permission: 'settings' as PortalPermission },
        { label: 'Communes', href: '/communes', icon: MapPin, permission: 'settings' as PortalPermission },
        { label: 'Territoires', href: '/villes?view=territoires', icon: MapPin, permission: 'settings' as PortalPermission },
        { label: 'Secteurs', href: '/communes?view=secteurs', icon: MapPin, permission: 'settings' as PortalPermission },
        { label: 'Chefferies', href: '/communes?view=chefferies', icon: MapPin, permission: 'settings' as PortalPermission },
        { label: 'Groupements', href: '/communes?view=groupements', icon: MapPin, permission: 'settings' as PortalPermission },
        { label: 'Villages', href: '/communes?view=villages', icon: MapPin, permission: 'settings' as PortalPermission },
      ],
    },
    {
      label: 'Gestion administrative',
      icon: RefreshCw,
      permission: 'settings' as PortalPermission,
      items: [
        { label: 'Affectations', href: '/workflows?view=affectations', icon: GitPullRequest, permission: 'settings' as PortalPermission },
        { label: 'Mutations', href: '/workflows?view=mutations', icon: RefreshCw, permission: 'settings' as PortalPermission },
        { label: 'Promotions', href: '/workflows?view=promotions', icon: Plus, permission: 'settings' as PortalPermission },
        { label: 'Transferts', href: '/workflows?view=transferts', icon: FileOutput, permission: 'settings' as PortalPermission },
        { label: 'Changements de fonction', href: '/workflows?view=fonctions', icon: Briefcase, permission: 'settings' as PortalPermission },
        { label: 'Mises à disposition', href: '/workflows?view=mises-a-disposition', icon: FileInput, permission: 'settings' as PortalPermission },
        { label: 'Réintégrations', href: '/workflows?view=reintegrations', icon: RefreshCw, permission: 'settings' as PortalPermission },
        { label: 'Historique des mouvements', href: '/workflows?view=historique', icon: ClipboardList, permission: 'settings' as PortalPermission },
      ],
    },
    {
      label: 'Grades et fonctions',
      icon: ShieldCheck,
      permission: 'functions' as PortalPermission,
      items: [
        { label: 'Grades', href: '/grade-stats', icon: ShieldCheck, permission: 'functions' as PortalPermission },
        { label: 'Fonctions', href: '/fonctions', icon: Briefcase, permission: 'functions' as PortalPermission },
        { label: 'Catégories', href: '/grade-stats?view=categories', icon: ClipboardList, permission: 'functions' as PortalPermission },
      ],
    },
    {
      label: 'Documents et archives',
      icon: FileArchive,
      permission: 'documents' as PortalPermission,
      items: [
        { label: 'Documents administratifs', href: '/documents', icon: FileText, permission: 'documents' as PortalPermission },
        { label: 'Dossiers des agents', href: '/agents', icon: FolderOpen, permission: 'agents' as PortalPermission },
        { label: 'Scanner matériel', href: '/documents?view=scanner-materiel', icon: ScanLine, permission: 'documents' as PortalPermission },
        { label: 'Scanner caméra', href: '/documents?view=scanner-camera', icon: ScanLine, permission: 'documents' as PortalPermission },
        { label: 'Importer un document', href: '/documents?view=import', icon: FileInput, permission: 'documents' as PortalPermission },
        { label: 'Documents à classer', href: '/documents?view=a-classer', icon: FolderOpen, permission: 'documents' as PortalPermission },
        { label: 'Archives', href: '/documents?view=archives', icon: Archive, permission: 'documents' as PortalPermission },
      ],
    },
    {
      label: 'Présences et temps',
      icon: Clock,
      permission: 'agents' as PortalPermission,
      items: [
        { label: 'Pointage quotidien', href: '/presence', icon: Clock, permission: 'agents' as PortalPermission },
        { label: 'Journal des présences', href: '/presence/journal', icon: FileText, permission: 'agents' as PortalPermission },
        { label: 'Retards', href: '/presence/journal?view=retards', icon: Clock, permission: 'agents' as PortalPermission },
        { label: 'Absences', href: '/presence/journal?view=absences', icon: CalendarDays, permission: 'agents' as PortalPermission },
        { label: 'Statistiques de présence', href: '/reports?view=presence', icon: BarChart3, permission: 'reports' as PortalPermission },
      ],
    },
    {
      label: 'Congés et absences',
      icon: CalendarDays,
      permission: 'agents' as PortalPermission,
      items: [
        { label: 'Demandes de congé', href: '/workflows?view=conges-demandes', icon: CalendarDays, permission: 'agents' as PortalPermission },
        { label: 'Congés en cours', href: '/workflows?view=conges-en-cours', icon: CalendarDays, permission: 'agents' as PortalPermission },
        { label: 'Historique', href: '/workflows?view=conges-historique', icon: ClipboardList, permission: 'agents' as PortalPermission },
        { label: 'Missions', href: '/workflows?view=missions', icon: Briefcase, permission: 'agents' as PortalPermission },
        { label: 'Autorisations', href: '/workflows?view=autorisations', icon: FileText, permission: 'agents' as PortalPermission },
      ],
    },
    {
      label: 'Courriers',
      icon: MessageSquare,
      permission: 'documents' as PortalPermission,
      items: [
        { label: 'Courriers entrants', href: '/documents?view=courriers-entrants', icon: FileInput, permission: 'documents' as PortalPermission },
        { label: 'Courriers sortants', href: '/documents?view=courriers-sortants', icon: FileOutput, permission: 'documents' as PortalPermission },
        { label: 'Courriers internes', href: '/documents?view=courriers-internes', icon: MessageSquare, permission: 'documents' as PortalPermission },
        { label: 'Courriers à traiter', href: '/workflows?view=courriers-a-traiter', icon: ClipboardList, permission: 'documents' as PortalPermission },
        { label: 'Archives', href: '/documents?view=archives-courriers', icon: Archive, permission: 'documents' as PortalPermission },
      ],
    },
    {
      label: 'Circuit administratif / workflow',
      icon: GitPullRequest,
      permission: 'settings' as PortalPermission,
      items: [
        { label: 'Mes dossiers', href: '/workflows?view=mes-dossiers', icon: FolderOpen, permission: 'settings' as PortalPermission },
        { label: 'Dossiers reçus', href: '/workflows?view=dossiers-recus', icon: FileInput, permission: 'settings' as PortalPermission },
        { label: 'Dossiers à traiter', href: '/workflows?view=dossiers-a-traiter', icon: GitPullRequest, permission: 'settings' as PortalPermission },
        { label: 'Dossiers transmis', href: '/workflows?view=dossiers-transmis', icon: FileOutput, permission: 'settings' as PortalPermission },
        { label: 'Dossiers retournés', href: '/workflows?view=dossiers-retournes', icon: RefreshCw, permission: 'settings' as PortalPermission },
        { label: 'Dossiers validés', href: '/workflows?view=dossiers-valides', icon: ShieldCheck, permission: 'settings' as PortalPermission },
        { label: 'Historique du circuit', href: '/workflows?view=historique', icon: ClipboardList, permission: 'settings' as PortalPermission },
      ],
    },
    { label: 'Notifications', href: '/chat', icon: ClipboardList, permission: 'settings' as PortalPermission },
    {
      label: 'Rapports et statistiques',
      icon: BarChart3,
      permission: 'reports' as PortalPermission,
      items: [
        { label: 'Vue générale', href: '/reports', icon: BarChart3, permission: 'reports' as PortalPermission },
        { label: 'Rapport des agents', href: '/reports?view=agents', icon: Users, permission: 'reports' as PortalPermission },
        { label: 'Rapport par direction', href: '/reports?view=directions', icon: Building2, permission: 'reports' as PortalPermission },
        { label: 'Rapport par division', href: '/reports?view=divisions', icon: Network, permission: 'reports' as PortalPermission },
        { label: 'Rapport par province', href: '/reports?view=provinces', icon: MapPin, permission: 'reports' as PortalPermission },
        { label: 'Rapport des affectations', href: '/reports?view=affectations', icon: GitPullRequest, permission: 'reports' as PortalPermission },
        { label: 'Rapport des mouvements', href: '/reports?view=mouvements', icon: RefreshCw, permission: 'reports' as PortalPermission },
        { label: 'Rapport des présences', href: '/reports?view=presence', icon: Clock, permission: 'reports' as PortalPermission },
        { label: 'Export PDF / Excel / CSV', href: '/reports?view=export', icon: FileOutput, permission: 'reports' as PortalPermission },
      ],
    },
    {
      label: 'Administration',
      icon: ShieldCheck,
      permission: 'settings' as PortalPermission,
      items: [
        { label: 'Utilisateurs', href: '/users', icon: Users, permission: 'settings' as PortalPermission },
        { label: 'Rôles', href: '/settings?tab=roles', icon: ShieldCheck, permission: 'settings' as PortalPermission },
        { label: 'Permissions', href: '/settings?tab=permissions', icon: ShieldCheck, permission: 'settings' as PortalPermission },
        { label: 'Journal d\'audit', href: '/audit', icon: ClipboardList, permission: 'settings' as PortalPermission },
        { label: 'Paramètres système', href: '/settings', icon: Settings, permission: 'settings' as PortalPermission },
        { label: 'Sauvegarde', href: '/settings?tab=backup', icon: Archive, permission: 'settings' as PortalPermission },
      ],
    },
  ];

  const menuItems = useMemo<MenuItem[]>(() => {
    if (!currentUser) return [];

    return allMenuItems
      .map((item) => {
        if (item.items && item.items.length > 0) {
          const accessibleSubItems = item.items.filter((sub) =>
            canAccessPath(sub.href, currentUser) && (sub.href !== '/audit' || isSuperAdmin(currentUser))
          );
          if (accessibleSubItems.length === 0) {
            return null;
          }
          return { ...item, items: accessibleSubItems };
        }

        if (!item.href) return null;
        return canAccessPath(item.href, currentUser) ? item : null;
      })
      .filter((item): item is MenuItem => item !== null);
  }, [allMenuItems, currentUser]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/login', { method: 'DELETE', credentials: 'same-origin' });
    } finally {
      clearCurrentUser();
      window.location.assign('/login');
    }
  }

  return (
    <aside className={`office-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <button type="button" className="mobile-sidebar-overlay" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />
      <button type="button" className="mobile-sidebar-close" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)}>
        <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
      </button>
      <div style={{ padding: '18px 20px 0 20px' }}>
        <div style={{
          marginBottom: '18px',
          padding: '12px 14px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(127,29,29,0.12), rgba(127,29,29,0.03))',
          border: '1px solid rgba(127,29,29,0.12)',
          fontWeight: 800,
          color: '#7f1d1d',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: 13,
        }}>
          🏛 SIGAD
        </div>

        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '18px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ef4444, #991b1b)', color: 'white', fontWeight: 800, fontSize: 16 }}>
              {String(currentUser.fullName || '')
                .split(' ')
                .map((s) => s[0] || '')
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>

            <div>
              <div style={{ fontWeight: 800, color: '#7f1d1d' }}>{currentUser.fullName}</div>
              {currentUser.directionNom && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>Direction : {currentUser.directionNom}</div>
              )}
            </div>
          </div>
        ) : null}

        <nav>
          {menuItems
            .filter((item) => {
              const targetPath = item.href ?? item.items?.[0]?.href;
              return typeof targetPath === 'string' ? canAccessPath(targetPath, currentUser) : false;
            })
            .map((item) => {
              const Icon = item.icon;
              const hasSubItems = Array.isArray(item.items) && item.items.length > 0;
              const activePath = pathname.split('?')[0];
              const isGroupActive = hasSubItems
                ? item.items!.some((sub) => activePath.startsWith(sub.href.split('?')[0]))
                : item.href === '/'
                ? activePath === '/'
                : item.href
                ? activePath.startsWith(item.href.split('?')[0])
                : false;

              if (hasSubItems) {
                const isOpen = Boolean(openGroups[item.label]) || isGroupActive;

                return (
                  <div key={item.label} className="sidebar-group">
                    <button
                      type="button"
                      className={`sidebar-group-button ${isOpen ? 'active open' : ''}`}
                      onClick={() => setOpenGroups((prev) => ({
                        ...prev,
                        [item.label]: !prev[item.label],
                      }))}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
                        <Icon size={19} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        style={{
                          transition: 'transform 0.2s ease',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div className="sidebar-submenu sidebar-submenu-open">
                        {item.items!.filter((sub) => canAccessPath(sub.href, currentUser)).map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = pathname.startsWith(sub.href.split('?')[0]);
                          return (
                            <Link key={`${sub.href}-${sub.label}`} href={sub.href} className={`sidebar-subitem ${isSubActive ? 'active' : ''}`}>
                              <SubIcon size={16} />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = item.href === '/'
                ? pathname === '/'
                : item.href
                ? pathname.startsWith(item.href)
                : false;

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={isActive ? 'active' : ''}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>
      </div>

      <div className="sidebar-footer">
        {currentUser ? (
          <div className="sidebar-account">
            <div className="sidebar-account-heading">
              <UserCircle size={20} />
              <div>
                <strong>{currentUser.fullName}</strong>
                <span>{currentUser.email}</span>
              </div>
            </div>
            <div className="sidebar-account-actions">
              <Link href="/change-password" className="sidebar-account-action">
                <Settings size={16} />
                <span>Mon profil</span>
              </Link>
              <button type="button" className="sidebar-account-action" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        ) : null}
        <button type="button" className="help-footer-btn" onClick={() => setShowHelpModal(true)}>
          <HelpCircle size={22} style={{ color: '#dc2626' }} />
          <div style={{ textAlign: 'left' }}>
            <strong>Besoin d&apos;aide ?</strong>
            <p style={{ margin: 0 }}>Support technique Kna+</p>
          </div>
        </button>
      </div>

      {showHelpModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>Besoin d'aide ? — Présentation</h2>
              <button className="close-btn" onClick={() => setShowHelpModal(false)}>
                <ChevronDown size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                Kna+ SGA est l'application de gestion des agents et des services. Elle permet de gérer les dossiers
                agents, les documents, les services et les directions, ainsi que les accès au portail administratif.
              </p>

              <h3 style={{ marginTop: 12 }}>Développeur principal</h3>
              <p style={{ fontWeight: 700, marginBottom: 0 }}>Kana Maka Moise</p>

              <div style={{ marginTop: 14 }}>
                <strong>Contact</strong>
                <p style={{ margin: '6px 0 0 0' }}>
                  Pour le support technique, contactez : <a href="mailto:hubxender@gmail.com">hubxender@gmail.com</a>
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowHelpModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
