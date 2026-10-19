// magazine-front/src/components/admin/permissions/AdminProposalsTab.jsx
//
// Administración › Propuestas: the literary proposals sent from «Espacio
// abierto» (OpenSpaceProposalModal). Opening a new one marks it read; the
// super admin sets it accepted / declined (the sender sees that), downloads
// the file, replies by email or deletes it.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Paperclip, Mail, Trash2 } from 'lucide-react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { usePendingReview } from '../../../app_context/PendingReviewContext';
import { localDate, serverDate } from '../../../utils/locale';
import { proposalKindLabel, proposalAdminStatusLabel, downloadProposalFile } from '../../../utils/proposals';
import './AdminProposalsTab.css';

const STATUSES = ['new', 'read', 'accepted', 'declined'];

function AdminProposalsTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const { refresh: refreshPending } = usePendingReview();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const userId = currentUser?.id_user;
  const auth = useMemo(() => ({ headers: { 'x-user-id': userId } }), [userId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/open-space/proposals', auth);
      setProposals(res.data.data || []);
    } catch (err) {
      showError(err.response?.data?.error || t('admin.proposals.loadError', 'No se pudieron cargar las propuestas'));
    } finally {
      setLoading(false);
    }
  }, [auth, showError, t]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: proposals.length };
    STATUSES.forEach((s) => { c[s] = proposals.filter((p) => p.status_proposal === s).length; });
    return c;
  }, [proposals]);
  const shown = filter === 'all' ? proposals : proposals.filter((p) => p.status_proposal === filter);

  const setStatus = async (p, status, { quiet = false } = {}) => {
    setBusyId(p.id_proposal);
    try {
      await axiosInstance.patch(`/open-space/proposals/${p.id_proposal}`, { status }, auth);
      setProposals((list) => list.map((x) => (x.id_proposal === p.id_proposal ? { ...x, status_proposal: status } : x)));
      if (!quiet) showSuccess(t('admin.proposals.statusSaved', { status: proposalAdminStatusLabel(status, t), defaultValue: 'Propuesta marcada como «{{status}}»' }));
      refreshPending();
    } catch (err) {
      showError(err.response?.data?.error || t('admin.proposals.statusError', 'No se pudo cambiar el estado'));
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (p) => {
    const opening = openId !== p.id_proposal;
    setOpenId(opening ? p.id_proposal : null);
    // Opening a new one = it's been read.
    if (opening && p.status_proposal === 'new') setStatus(p, 'read', { quiet: true });
  };

  const remove = async (p) => {
    if (!window.confirm(t('admin.proposals.confirmDelete', { title: p.title_proposal, defaultValue: '¿Eliminar «{{title}}»? Se borrará con su archivo y quien la envió dejará de verla.' }))) return;
    setBusyId(p.id_proposal);
    try {
      const res = await axiosInstance.delete(`/open-space/proposals/${p.id_proposal}`, auth);
      setProposals((list) => list.filter((x) => x.id_proposal !== p.id_proposal));
      showSuccess(res.data?.success || t('admin.proposals.deleted', 'Propuesta eliminada'));
      refreshPending();
    } catch (err) {
      showError(err.response?.data?.error || t('admin.proposals.deleteError', 'No se pudo eliminar la propuesta'));
    } finally {
      setBusyId(null);
    }
  };

  const download = async (p) => {
    try {
      await downloadProposalFile(p, userId);
    } catch {
      showError(t('openspace.mine.downloadError', 'No se pudo descargar el archivo'));
    }
  };

  const mailto = (p) => {
    const subject = t('admin.proposals.replySubject', { title: p.title_proposal, defaultValue: 'Tu propuesta «{{title}}» para Espacio abierto' });
    return `mailto:${p.user?.email_user}?subject=${encodeURIComponent(subject)}`;
  };

  const FILTERS = [
    { key: 'all', label: t('admin.proposals.filter.all', 'Todas') },
    ...STATUSES.map((s) => ({ key: s, label: t(`admin.proposals.filter.${s}`, proposalAdminStatusLabel(s, t)) }))
  ];

  return (
    <section className="admin-proposals">
      <div className="admin-proposals__header">
        <h2>{t('admin.proposals.title', 'Propuestas de Espacio abierto')}</h2>
        <button type="button" className="admin-proposals__refresh" onClick={() => { load(); refreshPending(); }}>
          {t('admin.pending.refresh', 'Actualizar')}
        </button>
      </div>
      <p className="admin-proposals__intro">
        {t('admin.proposals.intro', 'Las envían desde Espacio abierto las personas con cuenta en la revista. Al abrir una nueva, queda marcada como leída. Quien la envió ve si está recibida, leída, aceptada o no seleccionada.')}
      </p>

      <div className="admin-proposals__filters" role="group" aria-label={t('admin.proposals.filterLabel', 'Filtrar por estado')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`admin-proposals__filter ${filter === f.key ? 'is-active' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="admin-proposals__filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-proposals__empty">{t('common.states.loading', 'Cargando…')}</p>
      ) : shown.length === 0 ? (
        <p className="admin-proposals__empty">
          {filter === 'all'
            ? t('admin.proposals.emptyAll', 'Aún no ha llegado ninguna propuesta.')
            : t('admin.proposals.empty', 'No hay propuestas con este estado.')}
        </p>
      ) : (
        <ul className="admin-proposals__list">
          {shown.map((p) => {
            const open = openId === p.id_proposal;
            const sentAt = serverDate(p.created_at);
            const busy = busyId === p.id_proposal;
            return (
              <li key={p.id_proposal} className={`admin-proposal ${p.status_proposal === 'new' ? 'is-new' : ''}`}>
                <button
                  type="button"
                  className="admin-proposal__summary"
                  aria-expanded={open}
                  aria-controls={`admin-proposal-${p.id_proposal}`}
                  onClick={() => toggle(p)}
                >
                  <span className="admin-proposal__line">
                    <span className="admin-proposal__title">{p.title_proposal}</span>
                    <span className={`admin-proposal__status admin-proposal__status--${p.status_proposal}`}>
                      {proposalAdminStatusLabel(p.status_proposal, t)}
                    </span>
                  </span>
                  <span className="admin-proposal__meta">
                    {proposalKindLabel(p.kind_proposal, t)}
                    {' · '}{p.user?.name_user || t('admin.proposals.deletedUser', 'Cuenta eliminada')}
                    {sentAt && <> · {localDate(sentAt, { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                    {p.file_name_proposal && <Paperclip size={13} aria-label={t('admin.proposals.hasFile', 'Con archivo')} />}
                  </span>
                  <ChevronDown size={20} className="admin-proposal__chevron" aria-hidden="true" />
                </button>

                {open && (
                  <div className="admin-proposal__detail" id={`admin-proposal-${p.id_proposal}`}>
                    <h3 className="admin-proposal__label">{t('admin.proposals.summary', 'Explicación')}</h3>
                    <p className="admin-proposal__summary-text">{p.summary_proposal}</p>

                    {p.text_proposal && (
                      <>
                        <h3 className="admin-proposal__label">{t('admin.proposals.text', 'Texto')}</h3>
                        <div className="admin-proposal__text" tabIndex={0}>{p.text_proposal}</div>
                      </>
                    )}

                    {p.file_name_proposal && (
                      <button type="button" className="admin-proposal__file" onClick={() => download(p)}>
                        <Paperclip size={16} aria-hidden="true" />
                        <span>{p.file_name_proposal}</span>
                      </button>
                    )}

                    {p.user && (
                      <p className="admin-proposal__from">
                        {t('admin.proposals.from', 'De')}: <strong>{p.user.name_user}</strong>
                        {' · '}<a href={`mailto:${p.user.email_user}`}>{p.user.email_user}</a>
                      </p>
                    )}

                    <div className="admin-proposal__actions">
                      <label className="admin-proposal__status-field">
                        <span>{t('admin.proposals.statusLabel', 'Estado')}</span>
                        <select
                          value={p.status_proposal}
                          disabled={busy}
                          onChange={(e) => setStatus(p, e.target.value)}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{proposalAdminStatusLabel(s, t)}</option>)}
                        </select>
                      </label>
                      {p.user?.email_user && (
                        <a className="admin-proposal__btn" href={mailto(p)}>
                          <Mail size={16} aria-hidden="true" />
                          {t('admin.proposals.reply', 'Responder')}
                        </a>
                      )}
                      <button type="button" className="admin-proposal__btn admin-proposal__btn--danger" onClick={() => remove(p)} disabled={busy}>
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

export default AdminProposalsTab;
