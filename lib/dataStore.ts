export interface Direction {
  id: string;
  nom: string;
  description?: string;
  statut: string;
  createdAt?: string;
}

export interface Service {
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
  statut: string;
  createdAt?: string;
}

export interface Fonction {
  id: string;
  nom: string;
  description?: string;
  statut: string;
  createdAt?: string;
}

export interface Grade {
  id: string;
  nom: string;
  description?: string;
  statut: string;
  createdAt?: string;
}

export interface District {
  id: string;
  nom: string;
}

export interface Ville {
  id: string;
  nom: string;
  districtId: string;
}

export interface Commune {
  id: string;
  nom: string;
  villeId: string;
}

export interface Agent {
  id: string;
  nom: string;
  postNom?: string;
  prenom: string;
  dateNaissance?: string;
  dateEngagement?: string;
  acteEngagement?: string;
  remunerer?: 'OUI' | 'NON';
  sexe?: string;
  nationalite?: string;
  matricule?: string;
  typeCarte?: string;
  numeroCarte?: string;
  expirationCarte?: string;
  lieuDelivrance?: string;
  directionId?: string;
  directionNom?: string;
  serviceId?: string;
  service?: string;
  gradeId?: string;
  gradeNom?: string;
  fonctionId?: string;
  fonctionNom?: string;
  email?: string;
  telephone: string;
  districtId?: string;
  villeId?: string;
  communeId?: string;
  avenue?: string;
  code?: string;
  divisionId?: string;
  divisionNom?: string;
  statut: 'BROUILLON' | 'VERIFICATION' | 'VALIDE' | 'ACTIF' | 'REJETE' | 'APPROUVE';
  statutPresence?: 'ACTIF' | 'INACTIF';
  presenceInactiveAt?: string | null;
  presenceInactiveReason?: string | null;
  presenceReactivatedAt?: string | null;
  presenceReactivatedBy?: string;
  statutPaiement?: 'PAYE' | 'NON_PAYE';
  montantPaiement?: number;
  prime?: 'OUI' | 'NON';
  montantPrime?: number;
  datePaiement?: string;
  documents?: DocumentRecord[];
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  agentId: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// Initial Data
export const initialDirections: Direction[] = [
  { id: 'dir-1', nom: 'Division Générale', description: 'Direction stratégique et exécutive', statut: 'ACTIF', createdAt: '2026-01-10' },
  { id: 'dir-2', nom: 'Division des Ressources Humaines', description: 'Gestion des effectifs et paie', statut: 'ACTIF', createdAt: '2026-01-12' },
  { id: 'dir-3', nom: 'Division Financière', description: 'Comptabilité et budget', statut: 'ACTIF', createdAt: '2026-01-15' },
  { id: 'dir-4', nom: 'Division des Systèmes d Information', description: 'Infrastructures informatiques et logiciels', statut: 'ACTIF', createdAt: '2026-01-20' },
  { id: 'dir-5', nom: 'Division Logistique', description: 'Achats, charroi automobile et maintenance', statut: 'ACTIF', createdAt: '2026-02-01' },
  { id: 'dir-communication', nom: 'Direction de la Communication', description: 'Communication institutionnelle et relations publiques', statut: 'ACTIF', createdAt: '2026-02-10' },
];

export const initialServices: Service[] = [
  { id: 'srv-101', nom: 'Cabinet & Secrétariat Central', directionId: 'dir-1', directionNom: 'Division Générale', codeService: 'DG-CAB', description: 'Gestion du courrier officiel et audience du Secrétaire Général', chefService: 'Chef de Service MWAMBA', statut: 'ACTIF', createdAt: '2026-01-10' },
  { id: 'srv-102', nom: 'Études, Bilan & Planification', directionId: 'dir-1', directionNom: 'Division Générale', codeService: 'DG-ETU', description: 'Études stratégiques de la décentralisation', chefService: 'Chef de Service BANZA', statut: 'ACTIF', createdAt: '2026-01-11' },
  { id: 'srv-201', nom: 'Recrutement, Effectifs & Carrières', directionId: 'dir-2', directionNom: 'Division des Ressources Humaines', codeService: 'DRH-REC', description: 'Enrôlement, immatriculation et gestion des dossiers agents', chefService: 'Chef de Service MBUYI', statut: 'ACTIF', createdAt: '2026-01-12' },
  { id: 'srv-202', nom: 'Paie, Solde & Avantages', directionId: 'dir-2', directionNom: 'Division des Ressources Humaines', codeService: 'DRH-PAI', description: 'Traitement du listing de paie et prélèvements', chefService: 'Chef de Service KASONGO', statut: 'ACTIF', createdAt: '2026-01-13' },
  { id: 'srv-203', nom: 'Formation & Discipline', directionId: 'dir-2', directionNom: 'Division des Ressources Humaines', codeService: 'DRH-FRM', description: 'Renforcement des capacités et suivi de la discipline', chefService: 'Chef de Service ILUNGA', statut: 'ACTIF', createdAt: '2026-01-14' },
  { id: 'srv-301', nom: 'Budget, Engagement & Contrôle', directionId: 'dir-3', directionNom: 'Division Financière', codeService: 'DF-BDG', description: 'Élaboration du budget et contrôle budgétaire', chefService: 'Chef de Service KALALA', statut: 'ACTIF', createdAt: '2026-01-15' },
  { id: 'srv-302', nom: 'Trésorerie & Ordonnancement', directionId: 'dir-3', directionNom: 'Division Financière', codeService: 'DF-TRS', description: 'Ordonnancement des dépenses de l État', chefService: 'Chef de Service LUKUSA', statut: 'ACTIF', createdAt: '2026-01-16' },
  { id: 'srv-401', nom: 'Infrastructures, Réseaux & Sécurité', directionId: 'dir-4', directionNom: 'Division des Systèmes d Information', codeService: 'DSI-INF', description: 'Réseaux informatiques et sécurité des données', chefService: 'Chef de Service KABAMBA', statut: 'ACTIF', createdAt: '2026-01-20' },
  { id: 'srv-402', nom: 'Développement, Bases de Données & SGA', directionId: 'dir-4', directionNom: 'Division des Systèmes d Information', codeService: 'DSI-DEV', description: 'Développement de l application SGA Kna+', chefService: 'Chef de Service NZUZI', statut: 'ACTIF', createdAt: '2026-01-21' },
  { id: 'srv-501', nom: 'Charroi Automobile & Transports', directionId: 'dir-5', directionNom: 'Division Logistique', codeService: 'DL-CHR', description: 'Gestion des véhicules et carburant du personnel', chefService: 'Chef de Service TSHIMANGA', statut: 'ACTIF', createdAt: '2026-02-01' },
  { id: 'srv-502', nom: 'Maintenance & Patrimoine', directionId: 'dir-5', directionNom: 'Division Logistique', codeService: 'DL-MNT', description: 'Entretien du bâtiment du Secrétariat Général', chefService: 'Chef de Service BAKAMBA', statut: 'ACTIF', createdAt: '2026-02-02' },
  { id: 'srv-601', nom: 'Mass-médias', directionId: 'dir-communication', directionNom: 'Direction de la Communication', codeService: 'DC-MED', description: 'Gestion des relations presse, des médias écrits et audiovisuels', chefService: 'Chef de Service M. KALUBA', typeMedia: 'Presse écrite', statut: 'ACTIF', createdAt: '2026-02-11' },
];

export const initialFonctions: Fonction[] = [
  { id: 'fnc-1', nom: 'Directeur de Service', description: 'Gestion d un département complet', statut: 'ACTIF', createdAt: '2026-01-10' },
  { id: 'fnc-2', nom: 'Chef de Division', description: 'Supervision des divisions opérationnelles', statut: 'ACTIF', createdAt: '2026-01-12' },
  { id: 'fnc-3', nom: 'Ingénieur Système', description: 'Maintenance des serveurs et infrastructures', statut: 'ACTIF', createdAt: '2026-01-15' },
  { id: 'fnc-4', nom: 'Analyste Développeur', description: 'Conception d applications et logiciels', statut: 'ACTIF', createdAt: '2026-01-18' },
  { id: 'fnc-5', nom: 'Gestionnaire RH', description: 'Suivi des dossiers agents et carrières', statut: 'ACTIF', createdAt: '2026-01-22' },
  { id: 'fnc-6', nom: 'Comptable Principal', description: 'Suivi des comptes et bilan', statut: 'ACTIF', createdAt: '2026-01-25' },
];

export const initialDistricts: District[] = [
  { id: 'dist-1', nom: 'District de Lukunga' },
  { id: 'dist-2', nom: 'District de Funa' },
  { id: 'dist-3', nom: 'District de Mont-Amba' },
  { id: 'dist-4', nom: 'District de Tshangu' },
];

export const initialVilles: Ville[] = [
  { id: 'vil-1', nom: 'Kinshasa Centre', districtId: 'dist-1' },
  { id: 'vil-2', nom: 'Kinshasa Ouest', districtId: 'dist-1' },
  { id: 'vil-3', nom: 'Kinshasa Sud', districtId: 'dist-2' },
  { id: 'vil-4', nom: 'Kinshasa Est', districtId: 'dist-4' },
];

export const initialCommunes: Commune[] = [
  { id: 'com-1', nom: 'Gombe', villeId: 'vil-1' },
  { id: 'com-2', nom: 'Lingwala', villeId: 'vil-1' },
  { id: 'com-3', nom: 'Kinshasa', villeId: 'vil-2' },
  { id: 'com-4', nom: 'Kalamu', villeId: 'vil-3' },
  { id: 'com-5', nom: 'Ndjili', villeId: 'vil-4' },
  { id: 'com-6', nom: 'Kimbanseke', villeId: 'vil-4' },
];

export const initialAgents: Agent[] = [
  {
    id: 'ag-1001',
    nom: 'KABAMBA',
    postNom: 'MULAMBA',
    prenom: 'Jean-Luc',
    dateNaissance: '1988-04-12',
    sexe: 'M',
    nationalite: 'Congolaise',
    matricule: '100001',
    typeCarte: 'CARTE_IDENTITE',
    numeroCarte: 'ID-9920192',
    expirationCarte: '2030-05-10',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-4',
    directionNom: 'Division des Systèmes d Information',
    fonctionId: 'fnc-1785565745032',
    fonctionNom: '220',
    service: 'Infrastructures, Réseaux & Sécurité',
    email: 'jl.kabamba@kna.cd',
    telephone: '+243812345678',
    districtId: 'dist-1',
    villeId: 'vil-1',
    communeId: 'com-1',
    avenue: 'Avenue de la Justice N° 45',
    code: 'KN-GMB-01',
    statut: 'ACTIF',
    statutPaiement: 'PAYE',
    montantPaiement: 500000,
    datePaiement: '2026-02-15',
    createdAt: '2026-02-10T10:00:00.000Z',
  },
  {
    id: 'ag-1002',
    nom: 'MBUYI',
    postNom: 'TCHILOMBO',
    prenom: 'Marie-Claire',
    dateNaissance: '1992-09-24',
    sexe: 'F',
    nationalite: 'Congolaise',
    matricule: '100002',
    typeCarte: 'PASSEPORT',
    numeroCarte: 'PP-442091',
    expirationCarte: '2029-11-15',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-2',
    directionNom: 'Division des Ressources Humaines',
    fonctionId: 'fnc-1785565753984',
    fonctionNom: '310',
    service: 'Recrutement, Effectifs & Carrières',
    email: 'mc.mbuyi@kna.cd',
    telephone: '+243998765432',
    districtId: 'dist-2',
    villeId: 'vil-3',
    communeId: 'com-4',
    avenue: 'Avenue Victoire N° 112',
    code: 'DRH-002',
    statut: 'VERIFICATION',
    statutPaiement: 'NON_PAYE',
    montantPaiement: 450000,
    createdAt: '2026-02-14T14:30:00.000Z',
  },
  {
    id: 'ag-1003',
    nom: 'LUMUMBA',
    postNom: 'KAPUKU',
    prenom: 'Patrick',
    dateNaissance: '1985-01-17',
    sexe: 'M',
    nationalite: 'Congolaise',
    matricule: '100003',
    typeCarte: 'CARTE_IDENTITE',
    numeroCarte: 'ID-1029384',
    expirationCarte: '2028-08-20',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-3',
    directionNom: 'Division Financière',
    fonctionId: 'fnc-1785565764125',
    fonctionNom: '320',
    service: 'Budget, Engagement & Contrôle',
    email: 'p.lumumba@kna.cd',
    telephone: '+243851112233',
    districtId: 'dist-1',
    villeId: 'vil-1',
    communeId: 'com-2',
    avenue: 'Avenue Huileries N° 88',
    code: 'DF-003',
    statut: 'VALIDE',
    statutPaiement: 'PAYE',
    montantPaiement: 600000,
    datePaiement: '2026-02-20',
    createdAt: '2026-02-18T09:15:00.000Z',
  },
  {
    id: 'ag-1004',
    nom: 'NZUZI',
    postNom: 'MAWETE',
    prenom: 'Grace',
    dateNaissance: '1995-06-30',
    sexe: 'F',
    nationalite: 'Congolaise',
    matricule: '100004',
    typeCarte: 'CARTE_IDENTITE',
    numeroCarte: 'ID-8847391',
    expirationCarte: '2031-01-05',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-4',
    directionNom: 'Division des Systèmes d Information',
    fonctionId: 'fnc-1785565753984',
    fonctionNom: '310',
    service: 'Développement, Bases de Données & SGA',
    email: 'g.nzuzi@kna.cd',
    telephone: '+243904445566',
    districtId: 'dist-4',
    villeId: 'vil-4',
    communeId: 'com-5',
    avenue: 'Avenue Kinshasa N° 12',
    code: 'DSI-004',
    statut: 'BROUILLON',
    statutPaiement: 'NON_PAYE',
    montantPaiement: 480000,
    createdAt: '2026-02-20T16:45:00.000Z',
  },
  {
    id: 'ag-1005',
    nom: 'TSHIMANGA',
    postNom: 'KANKU',
    prenom: 'David',
    dateNaissance: '1990-12-05',
    sexe: 'M',
    nationalite: 'Congolaise',
    matricule: '100005',
    typeCarte: 'PASSEPORT',
    numeroCarte: 'PP-128392',
    expirationCarte: '2027-04-18',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-5',
    directionNom: 'Division Logistique',
    fonctionId: 'fnc-1785565745032',
    fonctionNom: '220',
    service: 'Charroi Automobile & Transports',
    email: 'd.tshimanga@kna.cd',
    telephone: '+243829990011',
    districtId: 'dist-3',
    villeId: 'vil-1',
    communeId: 'com-3',
    avenue: 'Avenue Commerce N° 3',
    code: 'DL-005',
    statut: 'REJETE',
    statutPaiement: 'NON_PAYE',
    montantPaiement: 520000,
    createdAt: '2026-02-21T11:00:00.000Z',
  },
  {
    id: 'ag-1006',
    nom: 'NGOMA',
    postNom: 'KALONJI',
    prenom: 'Alice',
    dateNaissance: '1993-03-19',
    sexe: 'F',
    nationalite: 'Congolaise',
    matricule: '100006',
    typeCarte: 'CARTE_IDENTITE',
    numeroCarte: 'ID-5566778',
    expirationCarte: '2029-09-30',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-1',
    directionNom: 'Division Générale',
    fonctionId: 'fnc-1785565764125',
    fonctionNom: '320',
    service: 'Études, Bilan & Planification',
    email: 'a.ngoma@kna.cd',
    telephone: '+243812223344',
    districtId: 'dist-1',
    villeId: 'vil-2',
    communeId: 'com-3',
    avenue: 'Avenue du Commerce N° 50',
    code: 'DG-006',
    statut: 'VALIDE',
    statutPaiement: 'PAYE',
    montantPaiement: 430000,
    datePaiement: '2026-08-01',
    createdAt: '2026-07-30T09:00:00.000Z',
  },
  {
    id: 'ag-1007',
    nom: 'KALALA',
    postNom: 'LUKAS',
    prenom: 'Emmanuel',
    dateNaissance: '1991-11-05',
    sexe: 'M',
    nationalite: 'Congolaise',
    matricule: 'N.U',
    typeCarte: 'PASSEPORT',
    numeroCarte: 'PP-330011',
    expirationCarte: '2030-03-20',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-3',
    directionNom: 'Division Financière',
    fonctionId: 'fnc-1785565764125',
    fonctionNom: '320',
    service: 'Trésorerie & Ordonnancement',
    email: 'e.kalala@kna.cd',
    telephone: '+243822334455',
    districtId: 'dist-2',
    villeId: 'vil-1',
    communeId: 'com-2',
    avenue: 'Avenue de l Union N° 27',
    code: 'DF-007',
    statut: 'ACTIF',
    statutPaiement: 'PAYE',
    montantPaiement: 410000,
    datePaiement: '2026-08-02',
    createdAt: '2026-08-02T10:30:00.000Z',
  },
  {
    id: 'ag-1008',
    nom: 'ILUNGA',
    postNom: 'MBALA',
    prenom: 'Sophie',
    dateNaissance: '1994-07-21',
    sexe: 'F',
    nationalite: 'Congolaise',
    matricule: 'N.U',
    typeCarte: 'CARTE_IDENTITE',
    numeroCarte: 'ID-9988776',
    expirationCarte: '2031-12-12',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-2',
    directionNom: 'Division des Ressources Humaines',
    fonctionId: 'fnc-1785565753984',
    fonctionNom: '310',
    service: 'Formation & Discipline',
    email: 's.ilunga@kna.cd',
    telephone: '+243811223344',
    districtId: 'dist-3',
    villeId: 'vil-3',
    communeId: 'com-4',
    avenue: 'Avenue des Héros N° 18',
    code: 'DRH-008',
    statut: 'VERIFICATION',
    statutPaiement: 'NON_PAYE',
    montantPaiement: 0,
    createdAt: '2026-08-03T14:20:00.000Z',
  },
  {
    id: 'ag-1009',
    nom: 'BAKAMBA',
    postNom: 'MASUNDA',
    prenom: 'Joseph',
    dateNaissance: '1987-02-08',
    sexe: 'M',
    nationalite: 'Congolaise',
    matricule: 'N.U',
    typeCarte: 'PASSEPORT',
    numeroCarte: 'PP-6677889',
    expirationCarte: '2028-06-30',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-5',
    directionNom: 'Division Logistique',
    fonctionId: 'fnc-1785565745032',
    fonctionNom: '220',
    service: 'Maintenance & Patrimoine',
    email: 'j.bakamba@kna.cd',
    telephone: '+243833221100',
    districtId: 'dist-4',
    villeId: 'vil-4',
    communeId: 'com-6',
    avenue: 'Avenue du Parc N° 7',
    code: 'DL-009',
    statut: 'BROUILLON',
    statutPaiement: 'NON_PAYE',
    montantPaiement: 0,
    createdAt: '2026-08-04T09:45:00.000Z',
  },
  {
    id: 'ag-1010',
    nom: 'KABAMBA',
    postNom: 'MBUYI',
    prenom: 'Clara',
    dateNaissance: '1996-05-14',
    sexe: 'F',
    nationalite: 'Congolaise',
    matricule: 'N.U',
    typeCarte: 'CARTE_IDENTITE',
    numeroCarte: 'ID-1122334',
    expirationCarte: '2029-11-11',
    lieuDelivrance: 'Kinshasa',
    directionId: 'dir-1',
    directionNom: 'Division Générale',
    fonctionId: 'fnc-1785565764125',
    fonctionNom: '320',
    service: 'Cabinet & Secrétariat Central',
    email: 'c.kabamba@kna.cd',
    telephone: '+243812233445',
    districtId: 'dist-1',
    villeId: 'vil-2',
    communeId: 'com-3',
    avenue: 'Avenue du Gouverneur N° 11',
    code: 'DG-010',
    statut: 'ACTIF',
    statutPaiement: 'PAYE',
    montantPaiement: 420000,
    datePaiement: '2026-08-04',
    createdAt: '2026-08-04T11:10:00.000Z',
  },
];

import fs from 'fs';
import path from 'path';

// Global in-memory and disk persistence storage singleton
/* eslint-disable no-var */
declare global {
  var __kna_directions: Direction[] | undefined;
  var __kna_services: Service[] | undefined;
  var __kna_fonctions: Fonction[] | undefined;
  var __kna_agents: Agent[] | undefined;
  var __kna_documents: DocumentRecord[] | undefined;
}

const DB_FILE_PATH = path.join(process.cwd(), '.data', 'db.json');

function ensureDataDir() {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.error('Error creating data directory', e);
  }
}

function loadFromDisk(): {
  directions?: Direction[];
  services?: Service[];
  fonctions?: Fonction[];
  agents?: Agent[];
  documents?: DocumentRecord[];
} {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.error('Error reading db.json from disk', e);
  }
  return {};
}

function saveToDisk() {
  try {
    ensureDataDir();
    const data = {
      directions: globalThis.__kna_directions,
      services: globalThis.__kna_services,
      fonctions: globalThis.__kna_fonctions,
      agents: globalThis.__kna_agents,
      documents: globalThis.__kna_documents,
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving db.json to disk', e);
  }
}

const diskData = loadFromDisk();

function normalizeDiskAgent(agent: Partial<Agent>): Agent {
  return {
    id: typeof agent.id === 'string' ? agent.id : `ag-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nom:
      typeof agent.nom === 'string' && agent.nom.trim()
        ? agent.nom
        : typeof agent.postNom === 'string' && agent.postNom.trim()
        ? agent.postNom
        : typeof agent.prenom === 'string' && agent.prenom.trim()
        ? agent.prenom
        : 'Agent',
    postNom: typeof agent.postNom === 'string' ? agent.postNom : '',
    prenom: typeof agent.prenom === 'string' ? agent.prenom : '',
    dateNaissance: typeof agent.dateNaissance === 'string' ? agent.dateNaissance : undefined,
    sexe: typeof agent.sexe === 'string' ? agent.sexe : undefined,
    nationalite: typeof agent.nationalite === 'string' ? agent.nationalite : undefined,
    matricule: typeof agent.matricule === 'string' ? agent.matricule : undefined,
    typeCarte: typeof agent.typeCarte === 'string' ? agent.typeCarte : undefined,
    numeroCarte: typeof agent.numeroCarte === 'string' ? agent.numeroCarte : undefined,
    expirationCarte: typeof agent.expirationCarte === 'string' ? agent.expirationCarte : undefined,
    lieuDelivrance: typeof agent.lieuDelivrance === 'string' ? agent.lieuDelivrance : undefined,
    directionId: typeof agent.directionId === 'string' ? agent.directionId : undefined,
    directionNom: typeof agent.directionNom === 'string' ? agent.directionNom : undefined,
    serviceId: typeof agent.serviceId === 'string' ? agent.serviceId : undefined,
    service: typeof agent.service === 'string' ? agent.service : undefined,
    fonctionId: typeof agent.fonctionId === 'string' ? agent.fonctionId : undefined,
    fonctionNom: typeof agent.fonctionNom === 'string' ? agent.fonctionNom : undefined,
    email: typeof agent.email === 'string' ? agent.email : undefined,
    telephone: typeof agent.telephone === 'string' ? agent.telephone : '',
    districtId: typeof agent.districtId === 'string' ? agent.districtId : undefined,
    villeId: typeof agent.villeId === 'string' ? agent.villeId : undefined,
    communeId: typeof agent.communeId === 'string' ? agent.communeId : undefined,
    avenue: typeof agent.avenue === 'string' ? agent.avenue : undefined,
    code: typeof agent.code === 'string' ? agent.code : undefined,
    statut: typeof agent.statut === 'string' ? agent.statut : 'BROUILLON',
    statutPaiement: typeof agent.statutPaiement === 'string' ? agent.statutPaiement : 'NON_PAYE',
    montantPaiement: typeof agent.montantPaiement === 'number' ? agent.montantPaiement : Number(agent.montantPaiement) || 0,
    datePaiement: typeof agent.datePaiement === 'string' ? agent.datePaiement : undefined,
    createdAt: typeof agent.createdAt === 'string' && agent.createdAt ? agent.createdAt : new Date().toISOString(),
  };
}

function normalizeDiskDocument(doc: Partial<DocumentRecord>, defaultAgentId?: string): DocumentRecord {
  return {
    id: typeof doc.id === 'string' && doc.id ? doc.id : `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    agentId: typeof doc.agentId === 'string' && doc.agentId ? doc.agentId : defaultAgentId || 'unknown',
    name: typeof doc.name === 'string' && doc.name ? doc.name : 'document',
    size: typeof doc.size === 'string' && doc.size ? doc.size : '0 KB',
    type: typeof doc.type === 'string' && doc.type ? doc.type : 'application/octet-stream',
    url: typeof doc.url === 'string' && doc.url ? doc.url : '#',
    uploadedAt: typeof doc.uploadedAt === 'string' && doc.uploadedAt ? doc.uploadedAt : new Date().toISOString(),
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

if (!globalThis.__kna_directions) {
  globalThis.__kna_directions = diskData.directions || [...initialDirections];
}
if (!globalThis.__kna_services) {
  globalThis.__kna_services = diskData.services || [...initialServices];
}
if (!globalThis.__kna_fonctions) {
  globalThis.__kna_fonctions = diskData.fonctions || [...initialFonctions];
}
if (!globalThis.__kna_agents) {
  const agentsFromDisk = (diskData.agents ? diskData.agents : initialAgents).map((a) => {
    const ag = normalizeDiskAgent(a as Partial<Agent>);
    // normalize and dedupe nested documents if present
    if ((a as any).documents && Array.isArray((a as any).documents)) {
      const docs: DocumentRecord[] = (a as any).documents.map((d: Partial<DocumentRecord>) => normalizeDiskDocument(d, ag.id));
      // dedupe by id preserving order
      ag.documents = Array.from(new Map(docs.map((d: DocumentRecord) => [d.id, d])).values());
    }
    return ag;
  });
  globalThis.__kna_agents = dedupeById(agentsFromDisk);
}
if (!globalThis.__kna_documents) {
  if (diskData.documents && Array.isArray(diskData.documents)) {
    const docs = diskData.documents.map((d) => normalizeDiskDocument(d as Partial<DocumentRecord>));
    globalThis.__kna_documents = dedupeById(docs);
  } else {
    globalThis.__kna_documents = [
    {
      id: 'doc-1',
      agentId: 'ag-101',
      name: 'Piece_Identite_Kabamba.pdf',
      size: '1.45 MB',
      type: 'application/pdf',
      url: '#',
      uploadedAt: '2026-02-10T10:05:00.000Z',
    },
    {
      id: 'doc-2',
      agentId: 'ag-101',
      name: 'Diplome_Master_Info.pdf',
      size: '2.10 MB',
      type: 'application/pdf',
      url: '#',
      uploadedAt: '2026-02-10T10:06:00.000Z',
    },
  ];
  }
}

export const dbStore = {
  get directions() {
    return globalThis.__kna_directions!;
  },
  set directions(val: Direction[]) {
    globalThis.__kna_directions = val;
    saveToDisk();
  },
  get services() {
    return globalThis.__kna_services!;
  },
  set services(val: Service[]) {
    globalThis.__kna_services = val;
    saveToDisk();
  },
  get fonctions() {
    return globalThis.__kna_fonctions!;
  },
  set fonctions(val: Fonction[]) {
    globalThis.__kna_fonctions = val;
    saveToDisk();
  },
  get agents() {
    return globalThis.__kna_agents!;
  },
  set agents(val: Agent[]) {
    globalThis.__kna_agents = val;
    saveToDisk();
  },
  get documents() {
    return globalThis.__kna_documents!;
  },
  set documents(val: DocumentRecord[]) {
    globalThis.__kna_documents = val;
    saveToDisk();
  },
  save: saveToDisk,
  districts: initialDistricts,
  villes: initialVilles,
  communes: initialCommunes,
};

