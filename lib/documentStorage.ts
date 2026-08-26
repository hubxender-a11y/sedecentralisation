import fs from 'fs';
import path from 'path';

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'public', 'uploads');
const UPLOAD_BASE_URL = '/uploads';

function sanitizeFolderName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .toLowerCase() || 'unknown';
}

export function normalizeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function getAgentFolderName(agentId: string, agentFullName?: string) {
  const safeAgentName = sanitizeFolderName(agentFullName || '');
  return safeAgentName ? `${safeAgentName}-${agentId}` : agentId;
}

export function ensureUploadRoot() {
  if (!fs.existsSync(UPLOAD_BASE_DIR)) {
    fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
  }
  return UPLOAD_BASE_DIR;
}

export function ensureAgentUploadDir(directionName: string, agentId: string, agentFullName?: string) {
  const safeDirection = sanitizeFolderName(directionName || 'unknown');
  const agentFolder = getAgentFolderName(agentId, agentFullName);
  const agentDir = path.join(ensureUploadRoot(), safeDirection, agentFolder);
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }
  return {
    directory: agentDir,
    safeDirection,
    uploadUrlBase: path.posix.join(UPLOAD_BASE_URL, safeDirection, agentFolder),
  };
}

export function getAgentDocumentUrl(directionName: string, agentId: string, filename: string, agentFullName?: string) {
  const safeDirection = sanitizeFolderName(directionName || 'unknown');
  const agentFolder = getAgentFolderName(agentId, agentFullName);
  const safeFilename = normalizeFileName(filename);
  return path.posix.join(UPLOAD_BASE_URL, safeDirection, agentFolder, safeFilename);
}
