import type { PortalPermission } from '@/lib/accessControl';

export type PortalRoleDefinition = {
  id: string;
  name: string;
  description: string;
  permissions: PortalPermission[];
};

export const DEFAULT_PORTAL_ROLES: PortalRoleDefinition[] = [
  {
    id: 'role-super-admin',
    name: 'Super administrateur',
    description: 'Accès global et gestion complète du portail',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services', 'directions', 'functions', 'settings'],
  },
  {
    id: 'role-admin',
    name: 'Administrateur',
    description: 'Accès total au portail',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services', 'directions', 'functions', 'settings'],
  },
  {
    id: 'role-secretariat-general',
    name: 'Secrétaire générale',
    description: 'Vue globale des rapports par direction et supervision',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services', 'directions', 'functions', 'settings'],
  },
  {
    id: 'role-chef-direction',
    name: 'Chef de direction',
    description: 'Rapports de sa direction et suivi des divisions',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services'],
  },
  {
    id: 'role-chef-division',
    name: 'Chef de division',
    description: 'Rapports de ses bureaux et suivi des agents',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services'],
  },
  {
    id: 'role-chef-bureau',
    name: 'Chef de bureau',
    description: 'Gestion des agents de son bureau',
    permissions: ['dashboard', 'agents', 'documents', 'reports'],
  },
  {
    id: 'role-rh',
    name: 'RH',
    description: 'Gestion des agents et documents',
    permissions: ['dashboard', 'agents', 'documents', 'reports', 'services'],
  },
  {
    id: 'role-viewer',
    name: 'Lecteur',
    description: 'Consultation limitée',
    permissions: ['dashboard', 'reports'],
  },
];
