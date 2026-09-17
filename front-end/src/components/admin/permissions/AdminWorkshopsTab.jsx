import { useEffect, useState, useCallback } from 'react';
import { Trash2, Edit, Plus, X, User, Save } from 'lucide-react';
import { useWorkshop } from '../../../app_context/WorkshopContext';
import { useMagazine } from '../../../app_context/MagazineContext';
import './AdminWorkshopsTab.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const resolveAvatar = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
};

// Convert a DB datetime to the value a <input type="datetime-local"> expects.
const toLocalInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const EMPTY = { title_workshop: '', description_workshop: '', location_workshop: '', date_workshop: '', capacity_workshop: '' };

function AdminWorkshopsTab() {
  const { workshops, fetchWorkshops, createWorkshop, updateWorkshop, deleteWorkshop, uploadWorkshopCover } = useWorkshop();
  const { editors, fetchEditors } = useMagazine();

  const [form, setForm] = useState(EMPTY);
  const [authors, setAuthors] = useState([]);       // [{id_user,name_user,image_user}]
  const [coverFile, setCoverFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchWorkshops(); fetchEditors(); }, [fetchWorkshops, fetchEditors]);

  const resetForm = useCallback(() => {
    setForm(EMPTY); setAuthors([]); setCoverFile(null); setEditingId(null);
  }, []);

  const startEdit = (w) => {
    setEditingId(w.id_workshop);
    setForm({
      title_workshop: w.title_workshop || '',
      description_workshop: w.description_workshop || '',
      location_workshop: w.location_workshop || '',
      date_workshop: toLocalInput(w.date_workshop),
      capacity_workshop: w.capacity_workshop ?? ''
    });
    setAuthors((w.authors || []).map(a => ({ id_user: a.id_user, name_user: a.name_user, image_user: a.image_user })));
    setCoverFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addAuthor = (rawId) => {
    const id = parseInt(rawId);
    if (!id || authors.some(a => a.id_user === id)) return;
    const ed = editors.find(e => e.id_user === id);
    if (ed) setAuthors(prev => [...prev, { id_user: ed.id_user, name_user: ed.name_user, image_user: ed.image_user }]);
  };
  const removeAuthor = (id) => setAuthors(prev => prev.filter(a => a.id_user !== id));

  const handleSave = async () => {
    if (!form.title_workshop.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title_workshop: form.title_workshop,
        description_workshop: form.description_workshop || null,
        location_workshop: form.location_workshop || null,
        date_workshop: form.date_workshop ? new Date(form.date_workshop).toISOString() : null,
        capacity_workshop: form.capacity_workshop === '' ? null : Number(form.capacity_workshop),
        authors: authors.map((a, i) => ({ user_id: a.id_user, author_order: i }))
      };
      const result = editingId
        ? await updateWorkshop(editingId, payload)
        : await createWorkshop(payload);
      if (result.success && result.data) {
        if (coverFile) {
          await uploadWorkshopCover(result.data.id_workshop, coverFile);
          await fetchWorkshops();
        }
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este taller? Se borrarán también sus reservas. Esta acción no se puede deshacer.')) return;
    await deleteWorkshop(id);
    if (editingId === id) resetForm();
  };

  return (
    <section className="admin-workshops">
      <h2>{editingId ? 'Editar taller' : 'Crear taller'}</h2>

      <div className="admin-workshops-form">
        <label>Título *
          <input type="text" value={form.title_workshop}
            onChange={e => setForm({ ...form, title_workshop: e.target.value })}
            placeholder="Título del taller" />
        </label>

        <label>Descripción
          <textarea rows={4} value={form.description_workshop}
            onChange={e => setForm({ ...form, description_workshop: e.target.value })}
            placeholder="¿De qué trata el taller?" />
        </label>

        <div className="admin-workshops-row">
          <label>Fecha y hora
            <input type="datetime-local" value={form.date_workshop}
              onChange={e => setForm({ ...form, date_workshop: e.target.value })} />
          </label>
          <label>Lugar
            <input type="text" value={form.location_workshop}
              onChange={e => setForm({ ...form, location_workshop: e.target.value })}
              placeholder="Lugar del taller" />
          </label>
          <label>Aforo (plazas)
            <input type="number" min="0" value={form.capacity_workshop}
              onChange={e => setForm({ ...form, capacity_workshop: e.target.value })}
              placeholder="Ej. 20" />
          </label>
        </div>

        <div className="admin-workshops-authors">
          <span className="admin-workshops-label">Autoras/es (talleristas)</span>
          <div className="admin-workshops-author-chips">
            {authors.map(a => (
              <span key={a.id_user} className="admin-workshops-chip">
                {resolveAvatar(a.image_user)
                  ? <img src={resolveAvatar(a.image_user)} alt={a.name_user} />
                  : <User size={12} />}
                {a.name_user}
                <button type="button" onClick={() => removeAuthor(a.id_user)} aria-label="Quitar"><X size={12} /></button>
              </span>
            ))}
          </div>
          <select value="" onChange={e => { if (e.target.value) addAuthor(e.target.value); }}>
            <option value="">+ Añadir tallerista</option>
            {editors.filter(e => !authors.some(a => a.id_user === e.id_user)).map(ed => (
              <option key={ed.id_user} value={ed.id_user}>{ed.name_user}</option>
            ))}
          </select>
        </div>

        <label>Imagen de portada
          <input type="file" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f && f.type.startsWith('image/')) setCoverFile(f); }} />
        </label>

        <div className="admin-workshops-actions">
          <button className="admin-workshops-btn admin-workshops-btn--save" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {editingId ? 'Guardar cambios' : 'Crear taller'}
          </button>
          {editingId && (
            <button className="admin-workshops-btn" onClick={resetForm}>Cancelar</button>
          )}
        </div>
      </div>

      <h2 className="admin-workshops-list-title">Talleres ({workshops.length})</h2>
      {workshops.length === 0 ? (
        <p className="admin-workshops-empty">Todavía no hay talleres.</p>
      ) : (
        <ul className="admin-workshops-list">
          {workshops.map(w => (
            <li key={w.id_workshop} className="admin-workshops-item">
              <div className="admin-workshops-item-info">
                <strong>{w.title_workshop}</strong>
                <span className="admin-workshops-item-meta">
                  {w.date_workshop ? new Date(w.date_workshop).toLocaleDateString('es-ES') : 'Sin fecha'}
                  {' · '}
                  {w.capacity_workshop != null
                    ? `${w.reservation_count}/${w.capacity_workshop} plazas`
                    : `${w.reservation_count} inscritas/os`}
                </span>
              </div>
              <div className="admin-workshops-item-actions">
                <button onClick={() => startEdit(w)} title="Editar"><Edit size={18} /></button>
                <button onClick={() => handleDelete(w.id_workshop)} title="Eliminar"><Trash2 size={18} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminWorkshopsTab;
