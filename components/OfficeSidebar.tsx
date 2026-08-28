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
} from 'lucide-react';
import RdcLogo from '@/components/RdcLogo';
import { canAccessPath, getCurrentUser, isSuperAdmin, type AdminUser, type PortalPermission } from '@/lib/accessControl';

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
      label: 'Gestion Agents',
      icon: Users,
      permission: 'agents' as PortalPermission,
      items: [
        { label: 'Liste Agent', href: '/agents', icon: Users, permission: 'agents' as PortalPermission },
        { label: 'Pointage quotidien', href: '/presence', icon: Clock, permission: 'agents' as PortalPermission },
        { label: 'Journal des présences', href: '/presence/journal', icon: FileText, permission: 'agents' as PortalPermission },
        { label: 'Nouveau Agent', href: '/agents/create', icon: UserPlus, permission: 'agents' as PortalPermission },
        { label: 'Importer agents (XLS/CSV)', href: '/agents/import', icon: FileText, permission: 'agents' as PortalPermission },
        { label: 'Grades', href: '/grade-stats', icon: ShieldCheck, permission: 'functions' as PortalPermission },
        { label: 'Fonctions', href: '/fonctions', icon: Briefcase, permission: 'functions' as PortalPermission },
      ],
    },
    {
      label: 'Direction',
      icon: Network,
      permission: 'directions' as PortalPermission,
      items: [
        { label: 'Créer', href: '/directions?tab=create', icon: Plus, permission: 'directions' as PortalPermission },
        { label: 'Liste', href: '/directions?tab=list', icon: Building2, permission: 'directions' as PortalPermission },
      ],
    },
    {
      label: 'Utilisateurs',
      icon: ShieldCheck,
      permission: 'settings' as PortalPermission,
      items: [
        { label: 'Liste Utilisateurs', href: '/users', icon: Users, permission: 'settings' as PortalPermission },
        { label: 'Créer un utilisateur', href: '/users/create', icon: UserPlus, permission: 'settings' as PortalPermission },
        { label: 'Journal d audit', href: '/audit', icon: ClipboardList, permission: 'settings' as PortalPermission },
      ],
    },
    { label: 'Workflows', href: '/workflows', icon: GitPullRequest, permission: 'settings' as PortalPermission },
    { label: 'Documents', href: '/documents', icon: FileText, permission: 'documents' as PortalPermission },
    { label: 'Rapports RH', href: '/reports', icon: BarChart3, permission: 'reports' as PortalPermission },
    { label: 'Paramètres', href: '/settings', icon: Settings, permission: 'settings' as PortalPermission },
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

  return (
    <aside className={`office-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <button type="button" className="mobile-sidebar-overlay" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />
      <button type="button" className="mobile-sidebar-close" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)}>
        <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
      </button>
      <div style={{ padding: '18px 20px 0 20px' }}>
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
