// magazine-front/src/components/admin/permissions/AdminReportsTab.jsx
//
// Administración › Errores: what people reported with «Reportar un error»
// (ReportProblemModal) — what happened, who, where they were (the address,
// the view, what was open) and their device. Opening a new one marks it seen;
// the super admin marks it fixed, replies by email or deletes it. The new
// ones are counted in the Admin badge and listed in the bell
// (PendingReviewContext). Same look as Propuestas (AdminProposalsTab.css).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Mail, Trash2, Check, RotateCcw } from 'lucide-react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { usePendingReview } from '../../../app_context/PendingReviewContext';
import { localDate, serverDate } from '../../../utils/locale';
import './AdminProposalsTab.css';
import './AdminReportsTab.css';

const STATUSES = ['new', 'seen', 'fixed'];
const EXCERPT = 90;

function AdminReportsTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const { refreshReports } = usePendingReview();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const userId = currentUser?.id_user;
  const auth = useMemo(() => ({ headers: { 'x-user-id': userId } }), [userId]);
  const statusLabel = (s) => ({
    new: t('admin.reports.status.new', 'Nuevo'),
    seen: t('admin.reports.status.seen', 'Visto'),
    fixed: t('admin.reports.status.fixed', 'Arreglado')
  }[s] || s);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/bug-reports', auth);
      setReports(res.data.data || []);
    } catch (err) {
      showError(err.response?.data?.error || t('admin.reports.loadError', 'No se pudieron cargar los errores reportados'));
    } finally {
      setLoading(false);
    }
  }, [auth, showError, t]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: reports.length };
    STATUSES.forEach((s) => { c[s] = reports.filter((r) => r.status_report === s).length; });
    return c;
  }, [reports]);
  const shown = filter === 'all' ? reports : reports.filter((r) => r.status_report === filter);

  const setStatus = async (r, status, { quiet = false } = {}) => {
    setBusyId(r.id_report);
    try {
      await axiosInstance.patch(`/bug-reports/${r.id_report}`, { status }, auth);
      setReports((list) => list.map((x) => (x.id_report === r.id_report ? { ...x, status_report: status } : x)));
      if (!quiet) showSuccess(t('admin.reports.statusSaved', { status: statusLabel(status), defaultValue: 'Marcado como «{{status}}»' }));
      refreshReports();
    } catch (err) {
      showError(err.response?.data?.error || t('admin.reports.statusError', 'No se pudo cambiar el estado'));
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (r) => {
    const opening = openId !== r.id_report;
    setOpenId(opening ? r.id_report : null);
    // Opening a new one = it's been seen.
    if (opening && r.status_report === 'new') setStatus(r, 'seen', { quiet: true });
  };

  const remove = async (r) => {
    if (!window.confirm(t('admin.reports.confirmDelete', '¿Eliminar este aviso? No se puede deshacer.'))) return;
    setBusyId(r.id_report);
    try {
      const res = await axiosInstance.delete(`/bug-reports/${r.id_report}`, auth);
      setReports((list) => list.filter((x) => x.id_report !== r.id_report));
      showSuccess(res.data?.message || t('admin.reports.deleted', 'Aviso eliminado'));
      refreshReports();
    } catch (err) {
      showError(err.response?.data?.error || t('admin.reports.deleteError', 'No se pudo eliminar el aviso'));
    } finally {
      setBusyId(null);
    }
  };

  const mailto = (r) => {
    const subject = t('admin.reports.replySubject', 'El error que nos contaste en La Rabia');
    return `mailto:${r.user?.email_user}?subject=${encodeURIComponent(subject)}`;
  };

  const FILTERS = [
    { key: 'all', label: t('admin.reports.filter.all', 'Todos') },
    ...STATUSES.map((s) => ({ key: s, label: t(`admin.reports.filter.${s}`, statusLabel(s)) }))
  ];

  return (
    <section className="admin-proposals admin-reports">
      <div className="admin-proposals__header">
        <h2>{t('admin.reports.title', 'Errores reportados')}</h2>
        <button type="button" className="admin-proposals__refresh" onClick={() => { load(); refreshReports(); }}>
          {t('admin.pending.refresh', 'Actualizar')}
        </button>
      </div>
      <p className="admin-proposals__intro">
        {t('admin.reports.intro', 'Los envía con «Reportar un error» (en el menú y bajo el botón de idioma) cualquier persona con cuenta. Al abrir uno nuevo queda marcado como visto; márcalo como arreglado cuando esté resuelto.')}
      </p>

      <div className="admin-proposals__filters" role="group" aria-label={t('admin.proposals.filterLabel', 'Filtrar por estado')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`admin-proposals__filter ${filter === f.key ? 'is-active' : ''}`}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label} <span className="admin-proposals__filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-proposals__empty">{t('common.states.loading', 'Cargando…')}</p>
      ) : shown.length === 0 ? (
        <p className="admin-proposals__empty">
          {reports.length === 0
            ? t('admin.reports.emptyAll', 'Nadie ha reportado ningún error.')
            : t('admin.reports.empty', 'No hay avisos con este estado.')}
        </p>
      ) : (
        <ul className="admin-proposals__list">
          {shown.map((r) => {
            const open = openId === r.id_report;
            const sentAt = serverDate(r.created_at);
            const busy = busyId === r.id_report;
            const ctx = r.context_report || {};
            const excerpt = r.description_report.length > EXCERPT ? `${r.description_report.slice(0, EXCERPT - 1)}…` : r.description_report;
            return (
              <li key={r.id_report} className={`admin-proposal ${r.status_report === 'new' ? 'is-new' : ''}`}>
                <button
                  type="button"
                  className="admin-proposal__summary"
                  aria-expanded={open}
                  aria-controls={`admin-report-${r.id_report}`}
                  onClick={() => toggle(r)}
                >
                  <span className="admin-proposal__line">
                    <span className="admin-proposal__title admin-report__excerpt">{excerpt}</span>
                    <span className={`admin-proposal__status admin-report__status--${r.status_report}`}>
                      {statusLabel(r.status_report)}
                    </span>
                  </span>
                  <span className="admin-proposal__meta">
                    {r.user?.name_user || t('admin.proposals.deletedUser', 'Cuenta eliminada')}
                    {sentAt && <> · {localDate(sentAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                    {r.view_report && <> · {r.view_report}</>}
                  </span>
                  <ChevronDown size={20} className="admin-proposal__chevron" aria-hidden="true" />
                </button>

                {open && (
                  <div className="admin-proposal__detail" id={`admin-report-${r.id_report}`}>
                    <h3 className="admin-proposal__label">{t('admin.reports.what', 'Qué ha pasado')}</h3>
                    <p className="admin-proposal__summary-text">{r.description_report}</p>

                    <h3 className="admin-proposal__label">{t('admin.reports.where', 'Dónde')}</h3>
                    <dl className="admin-report__facts">
                      {r.page_report && (<><dt>{t('admin.reports.page', 'Dirección')}</dt><dd><a href={r.page_report} target="_blank" rel="noopener noreferrer">{r.page_report}</a></dd></>)}
                      {r.view_report && (<><dt>{t('admin.reports.view', 'Vista')}</dt><dd>{r.view_report}</dd></>)}
                      {ctx.open && (<><dt>{t('admin.reports.open', 'Abierto')}</dt><dd>{ctx.open}</dd></>)}
                      {ctx.language && (<><dt>{t('admin.reports.language', 'Idioma')}</dt><dd>{ctx.language}</dd></>)}
                      {ctx.screen && (<><dt>{t('admin.reports.screen', 'Pantalla')}</dt><dd>{ctx.screen}</dd></>)}
                      {ctx.browser && (<><dt>{t('admin.reports.browser', 'Navegador')}</dt><dd className="admin-report__browser">{ctx.browser}</dd></>)}
                    </dl>

                    {r.user && (
                      <p className="admin-proposal__from">
                        {t('admin.proposals.from', 'De')}: <strong>{r.user.name_user}</strong>
                        {' · '}<a href={`mailto:${r.user.email_user}`}>{r.user.email_user}</a>
                      </p>
                    )}

                    <div className="admin-proposal__actions">
                      {r.status_report !== 'fixed' ? (
                        <button type="button" className="admin-proposal__btn admin-report__btn--fixed" onClick={() => setStatus(r, 'fixed')} disabled={busy}>
                          <Check size={16} aria-hidden="true" />
                          {t('admin.reports.markFixed', 'Marcar como arreglado')}
                        </button>
                      ) : (
                        <button type="button" className="admin-proposal__btn" onClick={() => setStatus(r, 'seen')} disabled={busy}>
                          <RotateCcw size={16} aria-hidden="true" />
                          {t('admin.reports.reopen', 'Volver a abrir')}
                        </button>
                      )}
                      {r.user?.email_user && (
                        <a className="admin-proposal__btn" href={mailto(r)}>
                          <Mail size={16} aria-hidden="true" />
                          {t('admin.proposals.reply', 'Responder')}
                        </a>
                      )}
                      <button type="button" className="admin-proposal__btn admin-proposal__btn--danger" onClick={() => remove(r)} disabled={busy}>
                        <Trash2 size={16} aria-hidden="true" />
                        {t('admin.proposals.delete', 'Eliminar')}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default AdminReportsTab;
