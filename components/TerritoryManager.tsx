'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle, Edit, Network, Plus, Search, Trash2, X } from 'lucide-react';
import { buildAuthHeaders, canAccessPath, getCurrentUser, type AdminUser } from '@/lib/accessControl';

type TerritoryEntity = 'province' | 'ville' | 'commune';

type TerritoryManagerProps = {
  entity: TerritoryEntity;
  title: string;
  singularLabel: string;
  parentLabel?: string;
  parentEndpoint?: string;
  parentKey?: 'provinceId' | 'villeId';
};

type Province = { id: string; nom: string; statut?: string; createdAt?: string };
type Ville = { id: string; nom: string; provinceId: string; statut?: string; createdAt?: string; districtId?: string };
type Commune = { id: string; nom: string; villeId: string; statut?: string; createdAt?: string };

type GenericItem = Province | Ville | Commune;

const defaultForm = (entity: TerritoryEntity) => ({
  nom: '',
  parentId: '',
});

export default function TerritoryManager({
  entity,
  title,
  singularLabel,
  parentLabel,
  parentEndpoint,
  parentKey,
}: TerritoryManagerProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [items, setItems] = useState<GenericItem[]>([]);
  const [parents, setParents] = useState<GenericItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm(entity));

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const user = await getCurrentUser();
      if (!cancelled) {
        setCurrentUser(user);
        if (!canAccessPath(`/${entity === 'province' ? 'provinces' : entity === 'ville' ? 'villes' : 'communes'}`, user)) {
          router.replace('/');
          return;
        }
      }

      await loadData();
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [entity, router]);

  async function loadData() {
    try {
      setLoading(true);
      const entityEndpoint = entity === 'province' ? 'provinces' : entity === 'ville' ? 'villes' : 'communes';
      const [entityResp, parentsResp] = await Promise.all([
        fetch(`/api/${entityEndpoint}`),
        parentEndpoint ? fetch(`/api/${parentEndpoint}`) : Promise.resolve(null),
      ]);

      const entityData = entityResp.ok ? await entityResp.json() : [];
      const parentData = parentsResp && parentsResp.ok ? await parentsResp.json() : [];

      setItems(Array.isArray(entityData) ? entityData : []);
      setParents(Array.isArray(parentData) ? parentData : []);
    } catch (err) {
      console.error(`Unable to load ${entity} list`, err);
      setItems([]);
      setParents([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const name = 'nom' in item ? item.nom : '';
      const parentName = parentKey && 'provinceId' in item && item.provinceId
        ? parents.find((candidate) => candidate.id === item.provinceId)?.nom || ''
        : parentKey && 'villeId' in item && item.villeId
          ? parents.find((candidate) => candidate.id === item.villeId)?.nom || ''
          : '';
      return name.toLowerCase().includes(query) || parentName.toLowerCase().includes(query);
    });
  }, [items, parents, parentKey, search]);

  function resetForm() {
    setForm(defaultForm(entity));
    setEditId(null);
    setOpenModal(false);
    setError('');
    setSuccess('');
  }

  function editItem(item: GenericItem) {
    setEditId(item.id);
    setForm({
      nom: 'nom' in item ? item.nom : '',
      parentId:
        parentKey === 'provinceId' && 'provinceId' in item ? item.provinceId || '' :
        parentKey === 'villeId' && 'villeId' in item ? item.villeId || '' : '',
    });
    setOpenModal(true);
    setError('');
    setSuccess('');
  }

  async function saveItem() {
    if (!form.nom.trim()) {
      setError(`Le nom du ${singularLabel.toLowerCase()} est obligatoire.`);
      return;
    }

    if (parentKey && !form.parentId) {
      setError(`Le ${parentLabel?.toLowerCase() || 'parent'} est obligatoire.`);
      return;
    }

    try {
      setError('');
      const body: Record<string, string> = { nom: form.nom.trim() };
      if (parentKey) body[parentKey] = form.parentId;
      const endpoint = entity === 'province' ? 'provinces' : entity === 'ville' ? 'villes' : 'communes';
      const url = editId ? `/api/${endpoint}/${editId}` : `/api/${endpoint}`;
      const response = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Erreur lors de l'enregistrement du ${singularLabel.toLowerCase()}.`);
      }

      setSuccess(editId ? `${singularLabel} mis à jour.` : `${singularLabel} créé.`);
      setOpenModal(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function deleteItem(id: string) {
    const endpoint = entity === 'province' ? 'provinces' : entity === 'ville' ? 'villes' : 'communes';
    const confirmed = window.confirm(`Voulez-vous supprimer ce ${singularLabel.toLowerCase()} ?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || data?.message || `Impossible de supprimer ce ${singularLabel.toLowerCase()}.`);
      }
      setSuccess(`${singularLabel} supprimé.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#7f1d1d', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Network size={16} /> SIGAD · TERRITOIRE
            </div>
            <h1 style={{ margin: '8px 0 0', fontSize: 34, lineHeight: 1.2, color: '#111827' }}>{title}</h1>
          </div>

          <button
            type="button"
            onClick={() => { setForm(defaultForm(entity)); setEditId(null); setOpenModal(true); setError(''); setSuccess(''); }}
            style={{ border: 'none', background: 'linear-gradient(135deg, #991b1b, #7f1d1d)', color: 'white', borderRadius: 12, padding: '12px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} /> Nouveau {singularLabel}
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 18, padding: 16, boxShadow: '0 10px 25px rgba(15, 23, 42, 0.05)', border: '1px solid rgba(148, 163, 184, 0.2)', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', maxWidth: 420 }}>
            <Search size={16} color="#64748b" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Rechercher un ${singularLabel.toLowerCase()}`}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 15 }}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ marginBottom: 16, background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', fontWeight: 600 }}>
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ background: 'white', borderRadius: 18, padding: 24, textAlign: 'center', color: '#475569', fontWeight: 600 }}>
            Chargement des données…
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Nom</th>
                  {parentLabel && parentKey && <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{parentLabel}</th>}
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Statut</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={parentLabel ? 4 : 3} style={{ padding: '26px 16px', textAlign: 'center', color: '#64748b' }}>
                      Aucune donnée pour le moment.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const name = 'nom' in item ? item.nom : '';
                    const status = item.statut || 'ACTIF';
                    const parentValue = parentKey === 'provinceId' && 'provinceId' in item && item.provinceId
                      ? parents.find((candidate) => candidate.id === item.provinceId)?.nom || item.provinceId
                      : parentKey === 'villeId' && 'villeId' in item && item.villeId
                        ? parents.find((candidate) => candidate.id === item.villeId)?.nom || item.villeId
                        : '';

                    return (
                      <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{name}</td>
                        {parentLabel && parentKey && (
                          <td style={{ padding: '14px 16px', color: '#475569' }}>{parentValue || '—'}</td>
                        )}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, background: status === 'ACTIF' ? '#ecfdf5' : '#fef2f2', color: status === 'ACTIF' ? '#166534' : '#991b1b' }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button type="button" onClick={() => editItem(item)} style={{ border: '1px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <Edit size={14} /> Modifier
                            </button>
                            <button type="button" onClick={() => deleteItem(item.id)} style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 30 }}>
          <div style={{ width: '100%', maxWidth: 560, background: 'white', borderRadius: 18, boxShadow: '0 25px 60px rgba(15, 23, 42, 0.22)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: 24 }}>{editId ? `Modifier ${singularLabel.toLowerCase()}` : `Créer ${singularLabel.toLowerCase()}`}</h2>
              <button type="button" onClick={resetForm} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#475569' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 8, fontWeight: 600, color: '#334155' }}>
                Nom
                <input value={form.nom} onChange={(event) => setForm((prev) => ({ ...prev, nom: event.target.value }))} placeholder={`Nom du ${singularLabel.toLowerCase()}`} style={{ border: '1px solid #dbe1ea', borderRadius: 10, padding: '12px 14px', fontSize: 15 }} />
              </label>

              {parentKey && parentLabel && (
                <label style={{ display: 'grid', gap: 8, fontWeight: 600, color: '#334155' }}>
                  {parentLabel}
                  <select value={form.parentId} onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))} style={{ border: '1px solid #dbe1ea', borderRadius: 10, padding: '12px 14px', fontSize: 15, background: 'white' }}>
                    <option value="">Sélectionner</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>{'nom' in parent ? parent.nom : ''}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button type="button" onClick={resetForm} style={{ border: '1px solid #dbe1ea', background: 'white', color: '#334155', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
                Annuler
              </button>
              <button type="button" onClick={saveItem} style={{ border: 'none', background: 'linear-gradient(135deg, #991b1b, #7f1d1d)', color: 'white', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} /> {editId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
