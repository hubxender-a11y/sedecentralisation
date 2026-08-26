'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import { BACKEND_URL } from '@/lib/backend';
import { buildAuthHeaders } from '@/lib/accessControl';
import './fonctions.css';

type Fonction = {
  id: string;
  nom: string;
  description?: string;
  statut?: string;
  createdAt?: string;
};

export default function FonctionsPage() {
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadFonctions() {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/fonctions`, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      setFonctions(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      console.error(err);
      setFonctions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFonctions();
  }, []);

  function resetForm() {
    setNom('');
    setDescription('');
    setEditId(null);
    setOpenModal(false);
  }

  function editFonction(item: Fonction) {
    setEditId(item.id);
    setNom(item.nom);
    setDescription(item.description || '');
    setOpenModal(true);
  }

  async function saveFonction() {
    if (!nom.trim()) {
      setError('Le nom de la fonction est obligatoire');
      return;
    }

    try {
      setError('');
      const payload = {
        nom,
        description,
        statut: 'ACTIF',
      };

      const url = editId
        ? `${BACKEND_URL}/fonctions/${editId}`
        : `${BACKEND_URL}/fonctions`;

      const response = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: {
          ...buildAuthHeaders('application/json'),
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let parsed: any = null;
      try {
        parsed = responseText ? JSON.parse(responseText) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const serverMessage = parsed?.error || parsed?.message || parsed?.details || responseText || 'Erreur d\'enregistrement.';
        throw new Error(serverMessage);
      }

      setSuccess(
        editId
          ? 'Fonction modifiée avec succès'
          : 'Fonction créée avec succès'
      );

      resetForm();
      loadFonctions();
      window.dispatchEvent(new Event('functions:updated'));

      setTimeout(() => {
        setSuccess('');
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Erreur d\'enregistrement.';
      setError(msg);
    }
  }

  async function deleteFonction(id: string) {
    const confirmDelete = confirm('Supprimer cette fonction ?');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${BACKEND_URL}/fonctions/${id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      });

      const responseText = await response.text();
      let parsed: any = null;
      try {
        parsed = responseText ? JSON.parse(responseText) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const serverMessage = parsed?.error || parsed?.message || parsed?.details || responseText || 'Erreur de suppression.';
        throw new Error(serverMessage);
      }

      loadFonctions();
      window.dispatchEvent(new Event('functions:updated'));
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Erreur de suppression.';
      setError(msg);
      console.error('deleteFonction failed', err);
    }
  }

  const filteredFonctions = fonctions.filter((item) =>
    item.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="fonction-container">
            <div className="fonction-header">
              <div>
                <h1>Gestion des fonctions</h1>
                <p>Nomenclature des postes et métiers de l&apos;organisation</p>
              </div>

              <button className="add-btn" onClick={() => setOpenModal(true)}>
                <Plus size={20} />
                Nouvelle fonction
              </button>
            </div>

            <div className="fonction-stats">
              <div className="fonction-card">
                <div className="fonction-icon blue">
                  <Briefcase />
                </div>
                <div>
                  <strong>{fonctions.length}</strong>
                  <span>Fonctions référencées</span>
                </div>
              </div>

              <div className="fonction-card">
                <div className="fonction-icon green">
                  <CheckCircle />
                </div>
                <div>
                  <strong>
                    {fonctions.filter((f) => f.statut === 'ACTIF' || !f.statut).length}
                  </strong>
                  <span>Actives</span>
                </div>
              </div>

              <div className="fonction-card">
                <div className="fonction-icon purple">
                  <Users />
                </div>
                <div>
                  <strong>Métiers RH</strong>
                  <span>GPEC &amp; Postes</span>
                </div>
              </div>
            </div>

            <div className="fonction-toolbar">
              <div className="search-box">
                <Search size={19} />
                <input
                  placeholder="Rechercher une fonction..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="fonction-table-card">
              <table className="fonction-table">
                <thead>
                  <tr>
                    <th>Fonction / Poste</th>
                    <th>Description</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} className="empty">
                        Chargement...
                      </td>
                    </tr>
                  )}

                  {!loading && filteredFonctions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty">
                        Aucune fonction trouvée
                      </td>
                    </tr>
                  )}

                  {filteredFonctions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fonction-name">
                          <div className="mini-icon">
                            <Briefcase size={18} />
                          </div>
                          <div>
                            <strong>{item.nom}</strong>
                            <small style={{ color: '#94a3b8' }}>ID : {item.id}</small>
                          </div>
                        </div>
                      </td>

                      <td>{item.description || 'Pas de description'}</td>

                      <td>
                        <span
                          className={
                            item.statut === 'ACTIF' || !item.statut
                              ? 'status active'
                              : 'status inactive'
                          }
                        >
                          {item.statut === 'ACTIF' || !item.statut ? (
                            <CheckCircle size={15} />
                          ) : (
                            <XCircle size={15} />
                          )}
                          {item.statut || 'ACTIF'}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit"
                            onClick={() => editFonction(item)}
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            className="delete"
                            onClick={() => deleteFonction(item.id)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {success && <div className="toast success">{success}</div>}
            {error && <div className="toast error">{error}</div>}

            {openModal && (
              <div className="modal-overlay">
                <div className="fonction-modal">
                  <div className="modal-header">
                    <div>
                      <h2>
                        {editId ? 'Modifier la fonction' : 'Nouvelle fonction'}
                      </h2>
                      <p>Renseignez la désignation du poste</p>
                    </div>

                    <button onClick={resetForm}>
                      <X />
                    </button>
                  </div>

                  <div className="modal-body">
                    <label>Intitulé de la fonction</label>
                    <input
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Ex: Chef de Division RH"
                    />

                    <label>Description du poste</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Attributions et responsabilités générales"
                    />
                  </div>

                  <div className="modal-footer">
                    <button className="cancel-btn" onClick={resetForm}>
                      Annuler
                    </button>

                    <button className="save-btn" onClick={saveFonction}>
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
