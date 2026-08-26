const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const XLSX = require('xlsx');

const filePath = path.join(process.cwd(), 'LISTE DES AGENTS GENERALE2.xlsx');
const url = 'http://localhost:3001/api/agents/import';
const userId = 'user-moisekana';

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return [fullName, ''];
  }
  const prenom = parts.pop();
  const nom = parts.join(' ');
  return [nom, prenom];
}

function normalizeRows(rows) {
  const normalized = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;
    const fullName = String(row[1] || '').trim();
    if (!fullName) continue;
    const [nom, prenom] = splitName(fullName);
    normalized.push({
      nom,
      prenom,
      sexe: String(row[5] || '').trim() || undefined,
      matricule: String(row[6] || '').trim() || undefined,
      directionNom: String(row[9] || '').trim() || undefined,
    });
  }
  return normalized;
}

(async () => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
  const agents = normalizeRows(rows);
  console.log('Parsed', agents.length, 'agents. Sample:', agents.slice(0, 5));
  if (agents.length === 0) {
    console.error('No agents found');
    process.exit(1);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-current-user-id': userId,
    },
    body: JSON.stringify({ agents }),
  });
  const data = await res.json();
  console.log('Status:', res.status, 'Response:', data);
})();