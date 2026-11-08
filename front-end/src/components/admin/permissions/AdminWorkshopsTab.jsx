// Admin → Talleres: the list of workshops and contests. Creating and editing happen in the
// workshop editor (WorkshopEditor, like the publications creator); closing it
// comes back here.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useWorkshop } from '../../../app_context/WorkshopContext';
import { useUI } from '../../../app_context/UIContext';
import { localDate } from '../../../utils/locale';
import WorkshopAccessTag from '../../workshops/WorkshopAccessTag';
import WorkshopKindTag, { WorkshopReviewTag } from '../../workshops/WorkshopKindTag';
import { isContest, signupRange } from '../../../utils/contests';
import './AdminWorkshopsTab.css';

function AdminWorkshopsTab() {
  const { t } = useTranslation();
  const { workshops, fetchWorkshops, deleteWorkshop } = useWorkshop();
  const { navigateToWorkshopEditor } = useUI();

  useEffect(() => { fetchWorkshops(); }, [fetchWorkshops]);

  const handleDelete = async (w) => {
    if (!confirm(isContest(w)
      ? t('contests.confirmDelete', '¿Eliminar este concurso? Se borrarán también sus inscripciones. Esta acción no se puede deshacer.')
      : t('admin.workshops.confirmDelete', '¿Eliminar este taller? Se borrarán también sus reservas. Esta acción no se puede deshacer.'))) return;
    await deleteWorkshop(w.id_workshop);
  };

  return (
    <section className="admin-workshops">
      <div className="admin-workshops-head">
        <h2 className="admin-workshops-list-title">{t('admin.workshops.title', 'Talleres y concursos')} ({workshops.length})</h2>
        <div className="admin-workshops-head__actions">
          <button type="button" className="admin-workshops-btn admin-workshops-btn--save" onClick={() => navigateToWorkshopEditor(null, 'admin')}>
            <Plus size={16} /> {t('admin.workshops.create', 'Crear taller')}
          </button>
          <button type="button" className="admin-workshops-btn admin-workshops-btn--save" onClick={() => navigateToWorkshopEditor(null, 'admin', 'contest')}>
            <Plus size={16} /> {t('contests.create', 'Crear concurso')}
          </button>
        </div>
      </div>
      {workshops.length === 0 ? (
        <p className="admin-workshops-empty">{t('admin.workshops.empty', 'Todavía no hay talleres ni concursos.')}</p>
      ) : (
        <ul className="admin-workshops-list">
          {workshops.map(w => (
            <li key={w.id_workshop} className="admin-workshops-item">
              <div className="admin-workshops-item-info">
                <strong>{w.title_workshop}</strong>
                <span className="admin-workshops-item-tags">
                  <WorkshopKindTag workshop={w} />
                  {!isContest(w) && <WorkshopAccessTag workshop={w} />}
                  <WorkshopReviewTag workshop={w} />
                </span>
                <span className="admin-workshops-item-meta">
                  {isContest(w) ? (
                    <>
                      {t('contests.signups', { ...signupRange(w.registration_start_workshop, w.registration_end_workshop), defaultValue: 'Inscripciones: del {{from}} al {{to}}' })}
                      {' · '}
                      {t('contests.signedUp', { count: w.reservation_count || 0 })}
                    </>
                  ) : (
                    <>
                      {w.date_workshop ? localDate(w.date_workshop) : t('admin.workshops.noDate', 'Sin fecha')}
                      {' · '}
                      {w.capacity_workshop != null
                        ? t('workshops.editor.mine.spots', { taken: w.reservation_count || 0, total: w.capacity_workshop, defaultValue: '{{taken}}/{{total}} plazas' })
                        : t('workshops.editor.mine.signedUp', { count: w.reservation_count || 0 })}
                    </>
                  )}
                </span>
              </div>
              <div className="admin-workshops-item-actions">
                <button onClick={() => navigateToWorkshopEditor(w, 'admin')} title={t('common.buttons.edit', 'Editar')}><Edit size={18} /></button>
                <button onClick={() => handleDelete(w)} title={t('common.buttons.delete', 'Eliminar')}><Trash2 size={18} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminWorkshopsTab;
