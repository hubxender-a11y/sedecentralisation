'use client';

import { useEffect, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { getCurrentUser, hasPermission, buildAuthHeaders, isSuperAdmin } from '@/lib/accessControl';
import { Upload, FileText, Users as UsersIcon } from 'lucide-react';

type ParsedRow = Record<string, string>;

export default function UsersImportPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((u) => {
      if (!mounted) return;
      setCurrentUser(u);
      if (!hasPermission(u, 'settings')) setIsAuthorized(false);
      else setIsAuthorized(true);
    });
    return () => { mounted = false; };
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    setSuccess('');
    setRows([]);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      parseCSV(text);
      return;
    }

    // Try to parse XLSX using dynamic import of xlsx if available
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as ParsedRow[];
      setRows(json.map((r) => normalizeRow(r)));
    } catch (err) {
      setError('Impossible de parser le fichier XLSX. Si vous utilisez un fichier Excel, installez la dépendance "xlsx" ou exportez en CSV.');
    }
  }

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return setError('Fichier CSV vide');
    const header = lines[0].split(',').map((h) => h.trim());
    const parsed: ParsedRow[] = lines.slice(1).map((line) => {
      const cols = line.split(',');
      const obj: ParsedRow = {};
      header.forEach((h, i) => {
        obj[h] = (cols[i] || '').trim();
      });
      return normalizeRow(obj);
    }).filter((r) => r.email && r.fullName);
    setRows(parsed);
  }

  function normalizeRow(r: ParsedRow) {
    // Try multiple header variants
    const fullName = r.fullName || r.full_name || r.nom || r.name || '';
    const email = (r.email || r.Email || r.mail || '').toLowerCase();
    const roleId = r.roleId || r.role || r.Role || 'role-viewer';
    const directionId = r.directionId || r.direction_id || r.direction || '';
    const password = r.password || r.motdepasse || 'changeme';
    return { fullName, email, roleId, directionId, password } as ParsedRow;
  }

  async function handleImport() {
    if (rows.length === 0) {
      setError('Aucune ligne à importer');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const stateRes = await fetch('/api/admin/state', { headers: buildAuthHeaders() });
      if (!stateRes.ok) throw new Error('Impossible de charger l état existant');
      const state = await stateRes.json();
      const existingUsers = Array.isArray(state.users) ? state.users : [];
      const existingRoles = Array.isArray(state.roles) ? state.roles : [];

      if (!isSuperAdmin(currentUser) && rows.some((r) => r.roleId === 'role-super-admin')) {
        throw new Error('Vous ne pouvez pas importer des utilisateurs avec le rôle super-admin.');
      }

      const newUsers = rows.map((r) => ({
        id: `user-import-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        fullName: r.fullName,
        email: r.email,
        password: r.password || 'changeme',
        roleId: r.roleId || 'role-viewer',
        directionId: currentUser?.directionId || r.directionId || undefined,
        permissions: [],
        status: 'Actif',
        passwordResetRequired: r.password ? false : true,
      }));

      const res = await fetch('/api/admin/state', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ roles: existingRoles, users: [...existingUsers, ...newUsers] }),
      });

      if (!res.ok) throw new Error('Import échoué');
      setSuccess(`${newUsers.length} utilisateur(s) importé(s)`);
      setRows([]);
      setFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur import');
    } finally {
      setLoading(false);
    }
  }

  if (isAuthorized === null) return null;
  if (!isAuthorized) return <div style={{ padding: 20 }}>Accès refusé</div>;

  return (
    <div className="office-layout">
      <OfficeHeader />
      <div className="office-body">
        <OfficeSidebar />
        <main className="office-content">
          <div className="direction-container">
            <div className="direction-header" style={{ gap: 12 }}>
              <div>
                <h1>Importer utilisateurs</h1>
                <p>Importez un fichier CSV ou Excel contenant les champs : fullName, email, roleId, directionId, password (optionnel).</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, color: '#1e40af', fontWeight: 700 }}>
                <FileText size={16} /> Import
              </div>
            </div>

            <div style={{ maxWidth: 1000, background: 'white', borderRadius: 12, padding: 18, border: '1px solid #e8edf5' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
                <div style={{ color: '#475569' }}>{fileName ?? 'Aucun fichier sélectionné'}</div>
                <div style={{ marginLeft: 'auto' }}>
                  <button onClick={handleImport} disabled={rows.length === 0 || loading} className="add-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Upload size={14} /> Importer
                  </button>
                </div>
              </div>

              {error && <div style={{ marginTop: 12, color: '#b91c1c', fontWeight: 700 }}>{error}</div>}
              {success && <div style={{ marginTop: 12, color: '#166534', fontWeight: 700 }}>{success}</div>}

              {rows.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h3>Aperçu ({rows.length})</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: 8, fontWeight: 700 }}>Nom</th>
                          <th style={{ padding: 8, fontWeight: 700 }}>Email</th>
                          <th style={{ padding: 8, fontWeight: 700 }}>Rôle</th>
                          <th style={{ padding: 8, fontWeight: 700 }}>Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: 8 }}>{r.fullName}</td>
                            <td style={{ padding: 8 }}>{r.email}</td>
                            <td style={{ padding: 8 }}>{r.roleId}</td>
                            <td style={{ padding: 8 }}>{r.directionId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
