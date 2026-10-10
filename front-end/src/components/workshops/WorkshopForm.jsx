// magazine-front/src/components/workshops/WorkshopForm.jsx
//
// Create / edit a workshop: title, description, date, place name, capacity,
// type (taller / taller infantil), map location (LocationPicker), instructors
// and cover. Used in Admin → Talleres and in the "Crear taller" window of the
// workshops page (admins, super admins).
//   workshop  — the workshop to edit (null = create a new one)
//   onSaved   — called with the saved workshop
//   onCancel  — optional; shows a "Cancelar" button
import { useEffect, useState } from 'react';
import { X, User, Save } from 'lucide-react';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuth } from '../../app_context/AuthContext';
import LocationPicker from '../maps/LocationPicker';
import { DEFAULT_CENTER } from '../maps/mapPin';
import '../admin/permissions/AdminWorkshopsTab.css';

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

// A workshop → form values. New workshops start placed on the default
// location (Matiko, Uribarri); the creator moves the pin if it's elsewhere.
const toForm = (w) => ({
  title_workshop: w?.title_workshop || '',
  description_workshop: w?.description_workshop || '',
  location_workshop: w?.location_workshop || '',
  date_workshop: toLocalInput(w?.date_workshop),
  capacity_workshop: w?.capacity_workshop ?? '',
  audience_workshop: w?.audience_workshop === 'infantil' ? 'infantil' : 'general',
  lat_workshop: w?.lat_workshop ?? DEFAULT_CENTER[0],
  lng_workshop: w?.lng_workshop ?? DEFAULT_CENTER[1]
});

function WorkshopForm({ workshop = null, onSaved, onCancel }) {
  const { createWorkshop, updateWorkshop, uploadWorkshopCover, fetchWorkshops } = useWorkshop();
  const { editors, fetchEditors } = useMagazine();
  const { currentUser } = useAuth();
  const editingId = workshop?.id_workshop || null;

  const [form, setForm] = useState(() => toForm(workshop));
  // Instructors. A new workshop starts with its creator as instructor (they
  // can remove themselves / add others).
  const [authors, setAuthors] = useState(() => (
    workshop
      ? (workshop.authors || []).map(a => ({ id_user: a.id_user, name_user: a.name_user, image_user: a.image_user }))
      : (currentUser ? [{ id_user: currentUser.id_user, name_user: currentUser.name_user, image_user: currentUser.image_user }] : [])
  ));
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEditors(); }, [fetchEditors]);

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
        audience_workshop: form.audience_workshop,
        lat_workshop: form.lat_workshop,
        lng_workshop: form.lng_workshop,
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
        onSaved?.(result.data);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
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
        <label>Tipo de taller
          <select value={form.audience_workshop}
            onChange={e => setForm({ ...form, audience_workshop: e.target.value })}>
            <option value="general">Taller</option>
            <option value="infantil">Taller infantil</option>
          </select>
        </label>
      </div>

      {/* Where it takes place: search / click / drag on the map. */}
      <div className="admin-workshops-location">
        <span className="admin-workshops-label">Ubicación en el mapa</span>
        <LocationPicker
          lat={form.lat_workshop}
          lng={form.lng_workshop}
          initialQuery={form.location_workshop}
          onChange={({ lat, lng }) => setForm(prev => ({ ...prev, lat_workshop: lat, lng_workshop: lng }))}
        />
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
        <button type="button" className="admin-workshops-btn admin-workshops-btn--save" onClick={handleSave} disabled={saving || !form.title_workshop.trim()}>
          <Save size={16} /> {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear taller'}
        </button>
        {onCancel && (
          <button type="button" className="admin-workshops-btn" onClick={onCancel}>Cancelar</button>
        )}
      </div>
    </div>
  );
}

export default WorkshopForm;
