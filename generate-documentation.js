const fs = require('fs');
const { jsPDF } = require('jspdf');

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 40;
const lineHeight = 16;
let cursorY = margin;
let currentPage = 1;
const tocEntries = [];

function addTitle(text) {
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin, cursorY);
  cursorY += 34;
}

function addHeading(text) {
  newPageIfNeeded(36);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin, cursorY);
  tocEntries.push({ title: text, page: currentPage });
  cursorY += 24;
}

function addParagraph(text) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.text(lines, margin, cursorY);
  cursorY += lines.length * lineHeight + 10;
}

function addBulletList(items) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  items.forEach((item) => {
    const lines = doc.splitTextToSize(item, pageWidth - margin * 2 - 16);
    lines.forEach((line, index) => {
      const prefix = index === 0 ? '• ' : '  ';
      doc.text(prefix + line, margin, cursorY);
      cursorY += lineHeight;
    });
  });
  cursorY += 8;
}

function newPage() {
  doc.addPage();
  currentPage += 1;
  cursorY = margin;
}

function newPageIfNeeded(additionalHeight = 0) {
  if (cursorY + additionalHeight > pageHeight - margin) {
    newPage();
  }
}

function addFooter() {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const text = `Page ${page} / ${pageCount}`;
    doc.text(text, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }
}

function addTOC() {
  doc.setPage(1);
  cursorY = margin;
  addTitle('Table des matières');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  tocEntries.forEach((entry) => {
    const text = `${entry.title}`;
    const pageText = `${entry.page}`;
    doc.text(text, margin, cursorY);
    doc.text(pageText, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += lineHeight;
    if (cursorY > pageHeight - margin - lineHeight) {
      newPage();
      cursorY = margin;
    }
  });
}

// Reserve the first page for the table of contents.
addTitle('Documentation du logiciel - Kna+');
addParagraph('Cette documentation présente le logiciel de gestion des agents de l\'État, ses fonctionnalités principales, son architecture, son installation, et les flux de travail clefs pour la démonstration et la présentation.');

doc.addPage();
currentPage += 1;
cursorY = margin;

addHeading('1. Présentation générale');
addParagraph('Le projet est une application web de gestion de dossiers agent, construite avec Next.js 15 et React 19. Il permet de créer des agents, gérer des documents, suivre le statut des dossiers, et afficher des notifications de vérification.');

addHeading('2. Architecture technique');
addParagraph('L\'architecture repose sur Next.js App Router avec des pages React côté client et des routes API côté serveur. La logique métier est séparée entre les pages de l\'interface, les APIs de gestion des données, les services métier et les helpers de stockage. L\'accès aux données est géré par Prisma sur PostgreSQL Supabase, tandis que les documents sont stockés dans des buckets Supabase privés.');
addBulletList([
  'Frontend: Next.js App Router, composants React avec `use client` pour les interactions.',
  'Backend: routes API dans app/api pour les agents, documents, notifications et recherche.',
  'Base de données: PostgreSQL Supabase avec accès typé via Prisma.',
  'Stockage de fichiers: Supabase Storage privé avec contrôle d’accès côté serveur.',
  'Documentation PDF: génération locale avec jsPDF et Node.js.',
]);

addHeading('3. Installation et exécution');
addParagraph('Ce projet fonctionne dans un environnement Node.js moderne sur Windows ou Linux. La configuration minimale inclut Node.js 20+ et npm. Le démarrage local se fait via npm run dev, et les variables d\'environnement principales sont configurées dans .env.local.');
addBulletList([
  'Installer les dépendances: npm install',
  'Créer le fichier .env.local et ajouter les variables nécessaires (par exemple DATABASE_URL, GEMINI_API_KEY).',
  'Lancer le serveur: npm run dev',
  'Accéder à l\'application: http://localhost:3000',
  'Recharger le projet après modification des fichiers source.',
]);

addHeading('4. Structure des pages principales');
addBulletList([
  'app/agents/page.tsx: vue principale de la liste des agents, filtres d\'état, actions de validation et paiement.',
  'app/agents/create/page.tsx: formulaire de création d\'un nouvel agent avec division et informations personnelles.',
  'app/agents/[id]/page.tsx: détail d\'un dossier agent, upload de documents, statut et actions contextuelles.',
  'app/documents/page.tsx: gestion documentaire centralisée avec recherche par agent et division.',
  'app/api/documents/upload/route.ts: API de réception multipart/form-data pour enregistrer les fichiers.',
]);

newPageIfNeeded(120);
addHeading('5. Workflow des agents');
addParagraph('Lorsqu\'un agent est créé, le dossier est automatiquement placé en statut VERIFICATION. Le workflow autorise ensuite la validation ou le rejet du dossier par l\'administrateur. Les actions disponibles dans l\'interface changent en fonction du statut pour éviter les incohérences.');
addBulletList([
  'Création: statut initial VERIFICATION.',
  'Validation: statut VALIDE, badge vert et visibilité de paiement possible.',
  'Rejet: statut REJETE, actions limitées pour empêcher la validation.',
  'Paiement: état PAYE / NON_PAYE séparé du statut de dossier.',
]);

addHeading('6. Notifications');
addParagraph('Les notifications métiers ciblent les dossiers en vérification. Cette stratégie améliore le suivi du processus de contrôle de conformité et met en avant les dossiers qui nécessitent une action administrative.');
addBulletList([
  'Filtre de notification: statut VERIFICATION uniquement.',
  'Interface: badge et lien direct vers le dossier agent.',
  'Alerte métier: priorisation des dossiers non encore traités.',
]);

addHeading('7. Stockage des documents');
addParagraph('Les documents sont déposés dans public/uploads selon une arborescence division/agent. Le dossier agent est construit à partir du nom complet et de l\'identifiant pour garantir lisibilité et unicité, puis le fichier est renommé avec timestamp.');
addBulletList([
  'Répertoire agent: `safeAgentName-agentId` généré par lib/documentStorage.ts.',
  'Exemple: public/uploads/Division_Generale/mary-claire-mbuyi-ag-123456/',
  'Normalisation: suppression des caractères spéciaux et espaces convertis en tirets.',
  'Téléchargement: URLs accessibles via /uploads/... sur le serveur Next.js.',
]);

newPageIfNeeded(120);
addHeading('8. Détails fonctionnels');
addBulletList([
  'Recherche d\'agents par nom, matricule et téléphone.',
  'Filtres par division, statut de dossier et paiement.',
  'Affichage de cartes agents et du gestionnaire documentaire.',
  'Ouverture et téléchargement sécurisés des fichiers uploadés.',
  'Badges de statut explicites: VALIDÉ, EN VÉRIFICATION, REJETÉ.',
]);

addHeading('9. Points techniques spécifiques');
addBulletList([
  'Nom du dossier agent = nom complet + identifiant unique.',
  'Statut d\'agent par défaut = VERIFICATION à la création.',
  'Notifications basées sur le statut VERIFICATION plutôt que le paiement.',
  'Gestion des liens de fichiers uniquement si l\'URL est valide.',
  'UI conditionnelle sur la page de détail agent selon le statut du dossier.',
]);

addHeading('10. Présentation à montrer');
addBulletList([
  'Démonstration de la création d\'agent et du statut initial VERIFICATION.',
  'Upload d\'un document et validation de l\'ouverture depuis le gestionnaire documentaire.',
  'Affichage des badges VALIDÉ / EN VÉRIFICATION / REJETÉ dans l\'interface.',
  'Navigation vers les notifications de vérification.',
  'Consultation de l\'arborescence public/uploads pour vérifier le stockage.',
]);

newPageIfNeeded(40);
addHeading('11. Fichiers et composants clés');
addBulletList([
  'lib/documentStorage.ts: création des dossiers direction/agent, normalisation des noms, génération d\'URL de document.',
  'lib/dbService.ts: abstraction de l\'accès aux données et fallback mémoire.',
  'app/api/agents/route.ts: création, lecture et mise à jour des agents avec statut par défaut VERIFICATION.',
  'app/api/documents/upload/route.ts: réception des fichiers multipart et stockage physique.',
  'app/api/agents/notifications/route.ts: notifications filtrées sur les dossiers en VERIFICATION.',
  'app/documents/page.tsx: interface de gestion documentaire centrale, recherche et liens de téléchargement.',
  'app/agents/[id]/page.tsx: détail du dossier agent, affichage des documents et actions métier.',
]);

addHeading('12. Flux de données techniques');
addBulletList([
  'Création d\'agent: formulaire -> API /api/agents -> base de données -> statut VERIFICATION.',
  'Upload document: formulaire de fichier -> API /api/documents/upload -> stockage public/uploads -> URL publique.',
  'Notifications: requête API /api/agents/notifications -> filtre sur statut VERIFICATION -> affichage.',
  'Affichage documents: lecture des fichiers stockés et génération d\'URL via utils de storage.',
]);

addHeading('13. Recommandations et évolutions');
addBulletList([
  'Ajouter un stockage cloud (Azure Blob / S3) pour la production.',
  'Mettre en place une authentification et une autorisation plus fine.',
  'Ajouter des tests automatisés pour les APIs et le service de stockage de documents.',
  'Générer des miniatures ou des aperçus pour les documents uploadés.',
]);

addFooter();
addTOC();

const baseFilename = 'Documentation_Logiciel_Kna.pdf';
let filename = baseFilename;
let fileIndex = 1;

while (fs.existsSync(filename)) {
  try {
    fs.unlinkSync(filename);
    break;
  } catch (error) {
    filename = `Documentation_Logiciel_Kna_${fileIndex}.pdf`;
    fileIndex += 1;
    if (fileIndex > 10) {
      throw new Error('Impossible de trouver un nom de fichier PDF libre après 10 tentatives. Fermez le PDF existant et réessayez.');
    }
  }
}

doc.save(filename);
console.log(`PDF généré : ${filename}`);
