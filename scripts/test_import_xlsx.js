const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SAMPLE_PATH = path.join(process.cwd(), 'sample_import.xlsx');
const API_URL = 'http://localhost:3001/api/admin/state';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForServer(url, retries = 30, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch (e) {
      // ignore
    }
    await sleep(delay);
  }
  return false;
}

function makeSampleWorkbook() {
  const data = [
    ['fullName', 'email', 'roleId', 'directionId', 'password'],
    ['Jean Dupont', 'jean.dupont@example.com', 'role-viewer', 'dir-communication', 'changeme'],
    ['Marie Curie', 'marie.curie@example.com', 'role-viewer', 'dir-communication', 'changeme'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, SAMPLE_PATH);
}

function parseXlsx(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return json.map((r) => ({
    fullName: r.fullName || r.full_name || r.nom || r.name || '',
    email: (r.email || r.Email || r.mail || '').toLowerCase(),
    roleId: r.roleId || r.role || 'role-viewer',
    directionId: r.directionId || r.direction || '',
    password: r.password || r.motdepasse || 'changeme',
  })).filter((r) => r.email && r.fullName);
}

(async function main(){
  console.log('Generating sample XLSX at', SAMPLE_PATH);
  makeSampleWorkbook();

  console.log('Waiting for server...');
  const ready = await waitForServer(API_URL.replace('/api/admin/state','/api/admin/state'));
  if (!ready) {
    console.error('Server did not become ready in time');
    process.exit(1);
  }

  console.log('Parsing sample XLSX...');
  const rows = parseXlsx(SAMPLE_PATH);
  console.log('Parsed rows:', rows);

  console.log('Fetching existing admin state...');
  const existingRes = await fetch(API_URL, { method: 'GET' });
  if (!existingRes.ok) {
    console.error('Failed to fetch admin state', await existingRes.text());
    process.exit(1);
  }
  const existingState = await existingRes.json();

  const existingUsers = Array.isArray(existingState.users) ? existingState.users : [];
  const existingRoles = Array.isArray(existingState.roles) ? existingState.roles : [];

  const newUsers = rows.map((r) => ({
    id: `user-import-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    fullName: r.fullName,
    email: r.email,
    password: r.password || 'changeme',
    roleId: r.roleId || 'role-viewer',
    directionId: r.directionId || undefined,
    permissions: [],
    status: 'Actif',
    passwordResetRequired: r.password ? false : true,
  }));

  const merged = { roles: existingRoles, users: [...existingUsers, ...newUsers] };

  console.log('Posting merged state to', API_URL);
  const postRes = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) });
  const postText = await postRes.text();
  console.log('POST status', postRes.status, postText);
  process.exit(postRes.ok ? 0 : 1);
})();
