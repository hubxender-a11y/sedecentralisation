'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle, Download, FileText, Search, Users } from 'lucide-react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { buildAuthHeaders } from '@/lib/accessControl';
import '../presence.css';

type JournalRow = {
  date: string;
  directionId: string;
  directionNom: string;
  serviceId: string;
  serviceNom: string;
  bureaux: string[];
  total: number;
  firstHour: string;
  lastHour: string;
};

function formatHour(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(`${value}T12:00:00`));
}

export default function PresenceJournalPage() {
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/presences/journal', { headers: buildAuthHeaders() })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Impossible de charger le journal.');
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Impossible de charger le journal.'))
      .finally(() => setLoading(false));
  }, []);

  async function downloadPdf(row: JournalRow) {
    const key = `${row.date}|${row.directionId}`;
    setDownloading(key);
    setError('');
    try {
      const response = await fetch('/api/presences/export-pdf', {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ date: row.date, directionId: row.directionId, directionNom: row.directionNom }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Impossible de générer le PDF.');
      }
      const bytes = await response.arrayBuffer();
      const header = new TextDecoder().decode(bytes.slice(0, 4));
      if (bytes.byteLength === 0 || header !== '%PDF') {
        throw new Error('Le serveur n’a pas renvoyé un PDF valide.');
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presence-${row.date}-${row.serviceNom.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de générer le PDF.');
    } finally {
      setDownloading('');
    }
  }

  const directions = useMemo(() => Array.from(new Map(rows.map((row) => [row.directionId, row.directionNom])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesDirection = !directionFilter || row.directionId === directionFilter;
    const text = search.trim().toLowerCase();
    return matchesDirection && (!text || row.directionNom.toLowerCase().includes(text) || row.bureaux.join(' ').toLowerCase().includes(text) || row.date.includes(text));
  }), [rows, search, directionFilter]);
  const totalPresent = filteredRows.reduce((sum, row) => sum + row.total, 0);
  const totalDays = new Set(filteredRows.map((row) => row.date)).size;

  return (
    <div className="office-layout">
      <OfficeHeader />
      <div className="office-body">
        <OfficeSidebar />
        <main className="office-content">
          <div className="presence-hero">
            <div>
              <div className="presence-kicker">RH · ARCHIVES DE PRÉSENCE</div>
              <h1>Journal des présences</h1>
              <p>Consultez les feuilles quotidiennes, par date et par bureau, à partir des pointages enregistrés.</p>
            </div>
            <Link href="/presence" className="presence-export"><CalendarDays size={18} /> Nouveau pointage</Link>
          </div>

          <section className="presence-toolbar">
            <div className="presence-field"><label htmlFor="journal-direction">Direction</label><select id="journal-direction" value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value)}><option value="">Toutes les directions</option>{directions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
            <div className="presence-field presence-search-field"><label htmlFor="journal-search">Rechercher une archive</label><div className="presence-search"><Search size={18} /><input id="journal-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Direction, bureau ou date" /></div></div>
          </section>

          <section className="presence-overview">
            <div className="presence-date"><FileText size={19} /><div><span>Rapports affichés</span><strong>{filteredRows.length}</strong></div></div>
            <div className="presence-metric"><CalendarDays size={19} /><div><span>Jours couverts</span><strong>{totalDays}</strong></div></div>
            <div className="presence-metric"><Users size={19} /><div><span>Présences enregistrées</span><strong>{totalPresent}</strong></div></div>
            <div className="presence-status is-open"><CheckCircle size={19} /><div><span>Archivage</span><strong>Disponible</strong></div></div>
          </section>

          {error && <div className="presence-alert error"><FileText size={18} />{error}</div>}
          <section className="presence-list-card">
            <div className="presence-list-heading"><div><h2>Feuilles générées</h2><p>{filteredRows.length} rapport(s) correspondant à votre recherche</p></div><span className="presence-window">PDF · JOURNAL</span></div>
            {loading ? <div className="presence-empty">Chargement du journal...</div> : rows.length === 0 ? <div className="presence-empty"><FileText size={34} /><h3>Aucun rapport de présence enregistré</h3><p>Les rapports apparaîtront ici dès qu’un agent aura été pointé.</p><Link href="/presence" className="presence-export">Ouvrir le pointage</Link></div> : filteredRows.length === 0 ? <div className="presence-empty"><Search size={34} /><h3>Aucun résultat</h3><p>Modifiez le bureau ou le terme de recherche.</p></div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="presence-table">
                  <thead><tr><th>Date</th><th>Direction</th><th>Bureaux inclus</th><th>Présents</th><th>Horaires</th><th>Rapport unique</th></tr></thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const key = `${row.date}|${row.directionId}`;
                      return (
                        <tr key={`${key}|${row.serviceNom}`}>
                          <td><CalendarDays size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{formatDate(row.date)}</td>
                          <td><strong>{row.directionNom}</strong></td>
                          <td><div className="presence-bureau-list">{row.bureaux.map((bureau) => <span key={bureau}>{bureau}</span>)}</div></td>
                          <td>{row.total}</td>
                          <td>{formatHour(row.firstHour)} - {formatHour(row.lastHour)}</td>
                          <td>
                            <button type="button" className="presence-action" disabled={downloading === key} onClick={() => downloadPdf(row)}>
                              <Download size={16} /> {downloading === key ? 'Génération...' : 'Télécharger PDF'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}