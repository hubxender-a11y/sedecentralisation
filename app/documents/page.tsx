'use client';

import React, { useEffect, useState } from 'react';
import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { FileText, Search, Download, FileCheck, ShieldCheck } from 'lucide-react';
import { BACKEND_URL } from '@/lib/backend';
import { getCurrentUser, type AdminUser } from '@/lib/accessControl';
import './documents.css';

function getAgentFolderFromUrl(url?: string) {
  if (!url) return 'Dossier inconnu';
  const segments = url.split('/').filter(Boolean);
  return segments.length >= 3 ? segments[2] : 'Dossier inconnu';
}

type DocumentItem = {
  id: string;
  agentId: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  url?: string;
  agentName?: string;
  directionNom?: string;
  service?: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    async function loadDocs() {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/documents`);
        const docs = await res.json();
        const list = Array.isArray(docs) ? docs : docs.data || [];
        setDocuments(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }

    loadDocs();
    loadUser();
  }, []);

  const directions = Array.from(
    new Set(documents.map((doc) => doc.directionNom || '').filter(Boolean))
  );

  const agents = Array.from(
    new Set(documents.map((doc) => doc.agentName || '').filter(Boolean))
  );

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesDirection = selectedDirection
      ? doc.directionNom === selectedDirection
      : true;
    const matchesAgent = selectedAgent
      ? doc.agentName === selectedAgent
      : true;
    return matchesSearch && matchesDirection && matchesAgent;
  });

  const groupedByAgent = filteredDocs.reduce(
    (groups, doc) => {
      const key = doc.agentId || doc.agentName || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          agentId: doc.agentId,
          agentName: doc.agentName || 'Agent inconnu',
          directionNom: doc.directionNom || 'Division inconnue',
          service: doc.service || 'Service inconnu',
          documents: [],
        };
      }
      groups[key].documents.push(doc);
      return groups;
    },
    {} as Record<
      string,
      {
        agentId?: string;
        agentName: string;
        directionNom: string;
        service: string;
        documents: DocumentItem[];
      }
    >
  );

  const agentGroups = Object.values(groupedByAgent);
  const selectedGroup = agentGroups.find((group) => group.agentId === selectedAgentId);

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="direction-container">
            <div className="direction-header">
              <div>
                <h1>{currentUser?.directionNom ? `${currentUser.directionNom} — Gestion documentaire` : 'Gestionnaire de Documents'}</h1>
                <p>
                  {currentUser?.directionNom
                    ? `Répertoire centralisé des pièces justificatives de ${currentUser.directionNom}`
                    : 'Répertoire centralisé des pièces justificatives et contrats'}
                </p>
              </div>

              <div className="system-pill">
                <FileCheck size={16} />
                {documents.length} document(s) archivé(s)
              </div>
            </div>

            <div className="direction-toolbar documents-toolbar">
              <div className="search-box">
                <Search size={19} />
                <input
                  placeholder="Rechercher un document par nom..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filters-row">
                <div className="filter-column">
                  <label style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    Filtrer par division
                  </label>
                  <select
                    value={selectedDirection}
                    onChange={(e) => setSelectedDirection(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', minWidth: '200px' }}
                  >
                    <option value="">Toutes les divisions</option>
                    {directions.map((direction) => (
                      <option key={direction} value={direction}>
                        {direction}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    Filtrer par agent
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', minWidth: '220px' }}
                  >
                    <option value="">Tous les agents</option>
                    {agents.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="direction-table-card documents-card">
              {loading && (
                <div className="empty documents-empty">
                  Chargement du répertoire documentaire...
                </div>
              )}

              {!loading && filteredDocs.length === 0 && (
                <div className="empty" style={{ padding: '32px', textAlign: 'center' }}>
                  Aucun document trouvé.
                </div>
              )}

              {!loading && !selectedGroup && (
                <div className="agent-grid">
                  {agentGroups.map((group) => {
                    const initials = group.agentName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0].toUpperCase())
                      .join('');

                    return (
                      <button
                        key={group.agentId || group.agentName}
                        onClick={() => setSelectedAgentId(group.agentId || '')}
                        className="agent-card"
                      >
                        <div className="agent-card-header">
                          <div className="agent-avatar">
                            {initials || 'AG'}
                          </div>
                          <div>
                            <h3 className="agent-card-title">{group.agentName}</h3>
                            <p className="agent-card-subtitle">
                              {group.directionNom}
                              <br />
                              {group.service}
                            </p>
                          </div>
                        </div>
                        <div className="agent-card-footer">
                          <span className="agent-card-count">{group.documents.length} document(s)</span>
                          <span className="agent-card-action">Ouvrir</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && selectedGroup && (
                <div className="agent-detail-card">
                  <button
                    onClick={() => setSelectedAgentId('')}
                    className="back-button"
                  >
                    ← Retour aux agents
                  </button>

                  <div className="agent-detail-header">
                    <div className="agent-detail-avatar">
                      {selectedGroup.agentName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0].toUpperCase())
                        .join('')}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>{selectedGroup.agentName}</h2>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                        {selectedGroup.directionNom} • {selectedGroup.service}
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                        Dossier agent : {getAgentFolderFromUrl(selectedGroup.documents[0]?.url)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '14px' }}>
                    {selectedGroup.documents.map((doc) => (
                      <div key={doc.id} className="document-item">
                        <div className="document-preview">
                          {doc.type.startsWith('image/') && doc.url ? (
                            <img src={doc.url} alt={doc.name} />
                          ) : (
                            <div className="document-icon">
                              <FileText size={22} />
                            </div>
                          )}
                        </div>
                        <div className="document-meta">
                          <strong>{doc.name}</strong>
                          <small>{doc.type} • {doc.size}</small>
                          <span className="document-type-pill">{doc.type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                          <span style={{ display: 'block', marginTop: '8px', color: '#64748b', fontSize: '12px' }}>
                            Dossier : {getAgentFolderFromUrl(doc.url)}
                          </span>
                        </div>
                        <div className="document-actions">
                          <span className="document-date">{new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}</span>
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="document-link">
                              Ouvrir
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Aucun fichier</span>
                          )}
                          {doc.url && (
                            <a href={doc.url} download={doc.name} className="document-download">
                              Télécharger
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
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
