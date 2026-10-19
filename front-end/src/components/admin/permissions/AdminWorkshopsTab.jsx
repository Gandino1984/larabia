// Admin → Talleres: create / edit form (WorkshopForm, shared with the
// workshops page) + the list of workshops.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit } from 'lucide-react';
import { useWorkshop } from '../../../app_context/WorkshopContext';
import WorkshopForm from '../../workshops/WorkshopForm';
import { localDate } from '../../../utils/locale';
import './AdminWorkshopsTab.css';

function AdminWorkshopsTab() {
  const { t } = useTranslation();
  const { workshops, fetchWorkshops, deleteWorkshop } = useWorkshop();
  // The workshop being edited (null = the form creates a new one); formKey
  // remounts the form to clear it after a save.
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => { fetchWorkshops(); }, [fetchWorkshops]);

  const startEdit = (w) => {
    setEditing(w);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const resetForm = () => {
    setEditing(null);
    setFormKey(k => k + 1);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.workshops.confirmDelete', '¿Eliminar este taller? Se borrarán también sus reservas. Esta acción no se puede deshacer.'))) return;
    await deleteWorkshop(id);
    if (editing?.id_workshop === id) resetForm();
  };

  return (
    <section className="admin-workshops">
      <h2>{editing ? t('admin.workshops.edit', 'Editar taller') : t('admin.workshops.create', 'Crear taller')}</h2>

      <WorkshopForm
        key={editing ? `edit-${editing.id_workshop}` : `new-${formKey}`}
        workshop={editing}
        onSaved={resetForm}
        onCancel={editing ? resetForm : undefined}
      />

      <h2 className="admin-workshops-list-title">{t('admin.tabs.workshops', 'Talleres')} ({workshops.length})</h2>
      {workshops.length === 0 ? (
        <p className="admin-workshops-empty">{t('admin.workshops.empty', 'Todavía no hay talleres.')}</p>
      ) : (
        <ul className="admin-workshops-list">
          {workshops.map(w => (
            <li key={w.id_workshop} className="admin-workshops-item">
              <div className="admin-workshops-item-info">
                <strong>{w.title_workshop}</strong>
                <span className="admin-workshops-item-meta">
                  {w.audience_workshop === 'infantil' ? `${t('admin.workshops.kids', 'Infantil')} · ` : ''}
                  {w.date_workshop ? localDate(w.date_workshop) : t('admin.workshops.noDate', 'Sin fecha')}
                  {' · '}
                  {w.capacity_workshop != null
                    ? `${w.reservation_count}/${w.capacity_workshop} plazas`
                    : `${w.reservation_count} inscritas/os`}
                </span>
              </div>
              <div className="admin-workshops-item-actions">
                <button onClick={() => startEdit(w)} title={t('common.buttons.edit', 'Editar')}><Edit size={18} /></button>
                <button onClick={() => handleDelete(w.id_workshop)} title={t('common.buttons.delete', 'Eliminar')}><Trash2 size={18} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminWorkshopsTab;
