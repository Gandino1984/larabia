// Admin → Talleres: the list of workshops. Creating and editing happen in the
// workshop editor (WorkshopEditor, like the publications creator); closing it
// comes back here.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useWorkshop } from '../../../app_context/WorkshopContext';
import { useUI } from '../../../app_context/UIContext';
import { localDate } from '../../../utils/locale';
import WorkshopAccessTag from '../../workshops/WorkshopAccessTag';
import './AdminWorkshopsTab.css';

function AdminWorkshopsTab() {
  const { t } = useTranslation();
  const { workshops, fetchWorkshops, deleteWorkshop } = useWorkshop();
  const { navigateToWorkshopEditor } = useUI();

  useEffect(() => { fetchWorkshops(); }, [fetchWorkshops]);

  const handleDelete = async (id) => {
    if (!confirm(t('admin.workshops.confirmDelete', '¿Eliminar este taller? Se borrarán también sus reservas. Esta acción no se puede deshacer.'))) return;
    await deleteWorkshop(id);
  };

  return (
    <section className="admin-workshops">
      <div className="admin-workshops-head">
        <h2 className="admin-workshops-list-title">{t('admin.tabs.workshops', 'Talleres')} ({workshops.length})</h2>
        <button type="button" className="admin-workshops-btn admin-workshops-btn--save" onClick={() => navigateToWorkshopEditor(null, 'admin')}>
          <Plus size={16} /> {t('admin.workshops.create', 'Crear taller')}
        </button>
      </div>
      {workshops.length === 0 ? (
        <p className="admin-workshops-empty">{t('admin.workshops.empty', 'Todavía no hay talleres.')}</p>
      ) : (
        <ul className="admin-workshops-list">
          {workshops.map(w => (
            <li key={w.id_workshop} className="admin-workshops-item">
              <div className="admin-workshops-item-info">
                <strong>{w.title_workshop}</strong>
                <WorkshopAccessTag workshop={w} />
                <span className="admin-workshops-item-meta">
                  {w.audience_workshop === 'infantil' ? `${t('admin.workshops.kids', 'Infantil')} · ` : ''}
                  {w.date_workshop ? localDate(w.date_workshop) : t('admin.workshops.noDate', 'Sin fecha')}
                  {' · '}
                  {w.capacity_workshop != null
                    ? t('workshops.editor.mine.spots', { taken: w.reservation_count || 0, total: w.capacity_workshop, defaultValue: '{{taken}}/{{total}} plazas' })
                    : t('workshops.editor.mine.signedUp', { count: w.reservation_count || 0 })}
                </span>
              </div>
              <div className="admin-workshops-item-actions">
                <button onClick={() => navigateToWorkshopEditor(w, 'admin')} title={t('common.buttons.edit', 'Editar')}><Edit size={18} /></button>
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
