'use client';

import { useEffect, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { getCurrentUser, hasPermission, buildAuthHeaders } from '@/lib/accessControl';
import { Upload, FileText } from 'lucide-react';

type ParsedRow = Record<string, string | number>;

type NormalizedAgentRow = {
  nom: string;
  prenom: string;
  sexe?: string;
  matricule?: string;
  directionNom?: string;
  service?: string;
};

export default function AgentsImportPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<NormalizedAgentRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((u) => {
      if (!mounted) return;
      setCurrentUser(u);
      setIsAuthorized(hasPermission(u, 'agents'));
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

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as ParsedRow[];
      setRows(normalizeRows(json));
    } catch (err) {
      setError('Impossible de parser le fichier XLSX. Essayez un fichier CSV si possible.');
    }
  }

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return setError('Fichier CSV vide');
    const header = lines[0].split(',').map((h) => h.trim());
    const parsed: ParsedRow[] = lines.slice(1).map((line) => {
      const cols = line.split(',');
      const row: ParsedRow = {};
      header.forEach((h, i) => {
        row[h] = (cols[i] || '').trim();
      });
      return row;
    });
    setRows(parsedToAgents(parsed));
  }

  function normalizeRows(rows: ParsedRow[]) {
    return rowsToAgents(rows);
  }

  function rowsToAgents(rows: ParsedRow[]) {
    const normalized: NormalizedAgentRow[] = [];
    if (rows.length === 0) return normalized;

    const headerRow = Array.isArray(rows[0]) ? (rows[0] as any[]) : [];
    const hasHeader = isHeaderRow(headerRow);
    const startIndex = hasHeader ? 1 : 0;
    const mapping = getColumnMapping(headerRow, hasHeader);

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i] as any;
      if (!row) continue;
      const fullName = getCellValue(row, mapping.fullNameIndex, 1);
      if (!fullName) continue;
      const [nom, prenom] = splitName(fullName);
      normalized.push({
        nom,
        prenom,
        sexe: getCellValue(row, mapping.sexeIndex, 5) || undefined,
        matricule: getCellValue(row, mapping.matriculeIndex, 6) || undefined,
        directionNom: getCellValue(row, mapping.directionIndex, 9) || undefined,
        service: getCellValue(row, mapping.serviceIndex, 9) || undefined,
      });
    }
    return normalized;
  }

  function isHeaderRow(row: any[]): boolean {
    const values = row.map((cell) => normalizeHeader(String(cell || '')));
    const headerCandidates = ['fullname', 'email', 'roleid', 'directionid', 'nom', 'prenom', 'matricule', 'nompostnometprenom', 'service', 'serviceDAffectation'];
    return values.some((value) => headerCandidates.includes(value));
  }

  function normalizeHeader(value: string) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function getColumnMapping(headerRow: any[], hasHeader: boolean) {
    const defaultMapping = {
      fullNameIndex: 0,
      sexeIndex: 5,
      matriculeIndex: 6,
      directionIndex: 3,
      serviceIndex: 9,
    };

    if (!hasHeader) return defaultMapping;

    const normalized = headerRow.map((cell) => normalizeHeader(String(cell || '')));

    const findIndex = (candidates: string[]) => {
      const index = normalized.findIndex((value) => candidates.includes(value));
      return index >= 0 ? index : -1;
    };

    return {
      fullNameIndex: findIndex(['fullname', 'fullName', 'fullnamenompostnometprenom', 'nompostnometprenom', 'nomprenom', 'nom', 'name']) >= 0 ? findIndex(['fullname', 'fullName', 'fullnamenompostnometprenom', 'nompostnometprenom', 'nomprenom', 'nom', 'name']) : 1,
      sexeIndex: findIndex(['sexe', 'sex', 'gender']) >= 0 ? findIndex(['sexe', 'sex', 'gender']) : 5,
      matriculeIndex: findIndex(['matricule', 'matriculeid', 'id', 'employeeid', 'matricule']) >= 0 ? findIndex(['matricule', 'matriculeid', 'id', 'employeeid', 'matricule']) : 6,
      directionIndex: findIndex(['direction', 'division', 'department', 'directionid']) >= 0 ? findIndex(['direction', 'division', 'department', 'directionid']) : 3,
      serviceIndex: findIndex(['service', 'serviceDAffectation', 'serviceDAffectation', 'serviceaffectation']) >= 0 ? findIndex(['service', 'serviceDAffectation', 'serviceDAffectation', 'serviceaffectation']) : 9,
    };
  }

  function getCellValue(row: any, index: number, fallbackIndex: number) {
    const value = row[index] ?? row[fallbackIndex] ?? '';
    return String(value || '').trim();
  }

  function parsedToAgents(rows: ParsedRow[]) {
    const normalized: NormalizedAgentRow[] = [];
    for (const row of rows) {
      const fullName = String(row['nom'] || row['Nom'] || row['fullName'] || row['FULLNAME'] || row['Nom complet'] || '').trim();
      if (!fullName) continue;
      const [nom, prenom] = splitName(fullName);
      normalized.push({
        nom,
        prenom,
        sexe: String(row['sexe'] || row['Sexe'] || '').trim() || undefined,
        matricule: String(row['matricule'] || row['Matricule'] || row['matricule/identity'] || '').trim() || undefined,
        directionNom: String(row['direction'] || row['Direction'] || row['directionNom'] || row['Division'] || row['service'] || row['Service'] || '').trim() || undefined,
        service: String(row['service'] || row['Service'] || '').trim() || undefined,
      });
    }
    return normalized;
  }

  function splitName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) {
      return [fullName, ''];
    }
    const prenom = parts.pop() || '';
    const nom = parts.join(' ');
    return [nom, prenom];
  }

  async function handleImport() {
    if (rows.length === 0) {
      setError('Aucune ligne à importer');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/agents/import', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ agents: rows }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Import échoué');
      }
      setSuccess(`${payload.imported || 0} agent(s) importé(s)`);
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
                <h1>Importer agents</h1>
                <p>Importez un fichier XLSX ou CSV contenant la liste des agents. Seules les colonnes identifiées sont utilisées.</p>
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
                          <th style={{ padding: 8, fontWeight: 700 }}>Prénom</th>
                          <th style={{ padding: 8, fontWeight: 700 }}>Sexe</th>
                          <th style={{ padding: 8, fontWeight: 700 }}>Matricule</th>
                          <th style={{ padding: 8, fontWeight: 700 }}>Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: 8 }}>{r.nom}</td>
                            <td style={{ padding: 8 }}>{r.prenom}</td>
                            <td style={{ padding: 8 }}>{r.sexe}</td>
                            <td style={{ padding: 8 }}>{r.matricule}</td>
                            <td style={{ padding: 8 }}>{r.directionNom}</td>
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
