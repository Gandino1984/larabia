// magazine-front/src/components/activityProposals/ActivityProposalsReview.jsx
//
// The proposals of workshops and open calls that have come in, for admins and
// super admins (on «Propón una actividad» and in Admin › Propuestas):
// «Aprobar y avisar» sends its person an email — in the language they wrote
// from — saying we've received it and are considering it (once; «Reenviar el
// correo» if it didn't go out); «Descartar» doesn't write.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, Check, X, Mail, RotateCcw } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { usePendingReview } from '../../app_context/PendingReviewContext';
import { localDate, serverDate } from '../../utils/locale';
import ActivityKindTag from './ActivityKindTag';
import './ActivityProposals.css';

const FILTERS = ['new', 'considering', 'declined', 'all'];

function ActivityProposalsReview() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const { refreshActivityProposals } = usePendingReview();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('new');
  const [busyId, setBusyId] = useState(null);
  const headers = { 'x-user-id': currentUser?.id_user };

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/activity-proposals', { headers: { 'x-user-id': currentUser?.id_user } });
      setItems(res.data.data || []);
    } catch (err) {
      setItems([]);
      showError(err.response?.data?.error || t('activityProposals.review.loadError', 'No se pudieron cargar las propuestas'));
    }
  }, [currentUser?.id_user, showError, t]);
  useEffect(() => { load(); }, [load]);

  const decide = async (p, action) => {
    const name = p.user?.name_user || t('admin.proposals.deletedUser', 'Cuenta eliminada');
    const sure = action === 'consider'
      ? window.confirm(t('activityProposals.review.confirmConsider', { name, email: p.user?.email_user || '', defaultValue: 'Se enviará un correo a {{name}} ({{email}}) diciendo que hemos recibido su propuesta y la estamos considerando. ¿Seguir?' }))
      : window.confirm(t('activityProposals.review.confirmDecline', { title: p.title_proposal, defaultValue: '¿Descartar «{{title}}»? No se le enviará ningún correo.' }));
    if (!sure) return;
    setBusyId(p.id_activity_proposal);
    try {
      const res = await axiosInstance.post(`/activity-proposals/${p.id_activity_proposal}/${action}`, {}, { headers });
      setItems((list) => list.map((x) => (x.id_activity_proposal === p.id_activity_proposal ? res.data.data : x)));
      if (res.data.code === 'email_failed') showError(res.data.success);
      else showSuccess(res.data.success);
      refreshActivityProposals?.();
    } catch (err) {
      showError(err.response?.data?.error || t('activityProposals.review.error', 'No se pudo guardar la decisión'));
    } finally {
      setBusyId(null);
    }
  };

  const counts = Object.fromEntries(FILTERS.map((f) => [f, (items || []).filter((p) => f === 'all' || p.status_proposal === f).length]));
  const shown = (items || []).filter((p) => filter === 'all' || p.status_proposal === filter);
  const STATUS = {
    new: t('activityProposals.review.status.new', 'Nueva'),
    considering: t('activityProposals.review.status.considering', 'En consideración'),
    declined: t('activityProposals.review.status.declined', 'Descartada')
  };
  const LABEL = {
    new: t('activityProposals.review.filter.new', 'Nuevas'),
    considering: t('activityProposals.review.filter.considering', 'En consideración'),
    declined: t('activityProposals.review.filter.declined', 'Descartadas'),
    all: t('activityProposals.review.filter.all', 'Todas')
  };

  return (
    <section className="activity-review" aria-labelledby="activity-review-title">
      <header className="activity-review__header">
        <h2 id="activity-review-title"><Inbox size={20} aria-hidden="true" /> {t('activityProposals.review.title', 'Propuestas recibidas')}</h2>
        <p>{t('activityProposals.review.hint', 'Las ven las y los admins. Al aprobar una, le escribimos a su correo para decirle que la hemos recibido y la estamos considerando.')}</p>
      </header>
      <div className="activity-review__filters" role="tablist" aria-label={t('activityProposals.review.filters', 'Filtrar')}>
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
            {LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>
      {items && shown.length === 0 && <p className="activity-review__empty">{t('activityProposals.review.empty', 'No hay propuestas aquí.')}</p>}
      <ul className="activity-review__list">
        {shown.map((p) => {
          const at = serverDate(p.created_at);
          const mailedAt = serverDate(p.email_sent_at);
          const busy = busyId === p.id_activity_proposal;
          return (
            <li key={p.id_activity_proposal} className={`activity-review__item is-${p.status_proposal}`}>
              <div className="activity-review__head">
                <ActivityKindTag kind={p.kind_proposal} />
                <span className={`activity-review__status activity-review__status--${p.status_proposal}`}>{STATUS[p.status_proposal]}</span>
              </div>
              <h3>{p.title_proposal}</h3>
              <p className="activity-review__meta">
                {p.user?.name_user || t('admin.proposals.deletedUser', 'Cuenta eliminada')}
                {p.user?.email_user && <> · <a href={`mailto:${p.user.email_user}`}>{p.user.email_user}</a></>}
                {at && <> · {localDate(at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
              </p>
              <p className="activity-review__text">{p.description_proposal}</p>
              {p.details_proposal && (
                <p className="activity-review__details"><strong>{t('activityProposals.review.details', 'Detalles')}:</strong> {p.details_proposal}</p>
              )}
              {p.status_proposal === 'considering' && (
                <p className={`activity-review__mail ${mailedAt ? 'is-sent' : 'is-failed'}`}>
                  <Mail size={14} aria-hidden="true" />
                  {mailedAt
                    ? t('activityProposals.review.mailed', { date: localDate(mailedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), defaultValue: 'Correo enviado: {{date}}' })
                    : t('activityProposals.review.notMailed', 'El correo no se pudo enviar.')}
                </p>
              )}
              <div className="activity-review__actions">
                {p.status_proposal !== 'considering' && (
                  <button type="button" className="activity-btn activity-btn--primary" onClick={() => decide(p, 'consider')} disabled={busy}>
                    <Check size={15} aria-hidden="true" /> {t('activityProposals.review.consider', 'Aprobar y avisar')}
                  </button>
                )}
                {p.status_proposal === 'considering' && !mailedAt && (
                  <button type="button" className="activity-btn activity-btn--primary" onClick={() => decide(p, 'consider')} disabled={busy}>
                    <RotateCcw size={15} aria-hidden="true" /> {t('activityProposals.review.resend', 'Reenviar el correo')}
                  </button>
                )}
                {p.status_proposal !== 'declined' && (
                  <button type="button" className="activity-btn" onClick={() => decide(p, 'decline')} disabled={busy}>
                    <X size={15} aria-hidden="true" /> {t('activityProposals.review.decline', 'Descartar')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ActivityProposalsReview;
