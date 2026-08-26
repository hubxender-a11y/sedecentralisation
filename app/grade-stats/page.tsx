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
import '../fonctions/fonctions.css';
import { buildAuthHeaders } from '@/lib/accessControl';

type Grade = {
  id: string;
  nom: string;
  description?: string;
  statut?: string;
  createdAt?: string;
};

export default function GradeStatsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadGrades() {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/grades`);
      const data = await response.json();
      setGrades(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      console.error(err);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrades();
  }, []);

  function resetForm() {
    setNom('');
    setDescription('');
    setEditId(null);
    setOpenModal(false);
  }

  function editGrade(item: Grade) {
    setEditId(item.id);
    setNom(item.nom);
    setDescription(item.description || '');
    setOpenModal(true);
  }

  async function saveGrade() {
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
        ? `${BACKEND_URL}/grades/${editId}`
        : `${BACKEND_URL}/grades`;

      const response = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Try to read server error message to show a helpful message to the user
        try {
          const payload = await response.json();
          const serverMsg = payload?.message || payload?.error || response.statusText || 'Erreur enregistrement';
          setError(String(serverMsg));
        } catch (parseErr) {
          setError('Erreur enregistrement');
        }
        return;
      }

      setSuccess(
        editId
          ? 'Grade modifié avec succès'
          : 'Grade créé avec succès'
      );

      resetForm();
      loadGrades();

      setTimeout(() => {
        setSuccess('');
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur enregistrement';
      setError(msg);
    }
  }

  async function deleteGrade(id: string) {
    const confirmDelete = confirm('Supprimer ce grade ?');
    if (!confirmDelete) return;

    try {
      await fetch(`${BACKEND_URL}/grades/${id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      });
      loadGrades();
    } catch (err) {
      console.error(err);
    }
  }

  const filteredGrades = grades.filter((item) =>
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
                <h1>Gestion des grades</h1>
                <p>Nomenclature des postes et métiers de l&apos;organisation</p>
              </div>

              <button className="add-btn" onClick={() => setOpenModal(true)}>
                <Plus size={20} />
                Nouveau grade
              </button>
            </div>

            <div className="fonction-stats">
              <div className="fonction-card">
                <div className="fonction-icon blue">
                  <Briefcase />
                </div>
                <div>
                  <strong>{grades.length}</strong>
                  <span>Grades référencés</span>
                </div>
              </div>

              <div className="fonction-card">
                <div className="fonction-icon green">
                  <CheckCircle />
                </div>
                <div>
                  <strong>
                    {grades.filter((f) => f.statut === 'ACTIF' || !f.statut).length}
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
                  placeholder="Rechercher un grade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="fonction-table-card">
              <table className="fonction-table">
                <thead>
                  <tr>
                    <th>Grade / Poste</th>
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

                  {!loading && filteredGrades.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty">
                        Aucun grade trouvé.
                      </td>
                    </tr>
                  )}

                  {!loading && filteredGrades.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nom}</td>
                      <td>{item.description || '—'}</td>
                      <td>{item.statut || 'ACTIF'}</td>
                      <td>
                        <button className="icon-btn" onClick={() => editGrade(item)}>
                          <Edit size={16} />
                        </button>
                        <button className="icon-btn danger" onClick={() => deleteGrade(item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {openModal && (
            <div className="modal-backdrop">
              <div className="modal-card">
                <div className="modal-header">
                  <h2>{editId ? 'Modifier un grade' : 'Nouveau grade'}</h2>
                  <button className="close-btn" onClick={resetForm}>
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-body">
                  {error && <div className="alert error">{error}</div>}
                  {success && <div className="alert success">{success}</div>}

                  <div className="form-row">
                    <label>Intitulé du grade</label>
                    <input value={nom} onChange={(e) => setNom(e.target.value)} />
                  </div>

                  <div className="form-row">
                    <label>Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="secondary-btn" onClick={resetForm}>
                    Annuler
                  </button>
                  <button className="primary-btn" onClick={saveGrade}>
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
