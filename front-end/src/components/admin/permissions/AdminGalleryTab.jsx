// Admin → Galería (super admins): review the works the artists hang — a work
// shows in the gallery only once approved; reject (with a reason the artist
// sees) or withdraw one already published. And the artists: who's in, the
// invitations (when each email went out — resend, or send the unsent ones),
// and «Invitar artista». A thumbnail opens the work large (WorkViewer, with
// the others of the list). Server: /gallery/review*, /gallery/invitations*.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Undo2, Send, UserPlus, ExternalLink } from 'lucide-react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { usePendingReview } from '../../../app_context/PendingReviewContext';
import { useGallery } from '../../../app_context/GalleryContext';
import { localDate } from '../../../utils/locale';
import InviteArtistModal from '../../gallery/InviteArtistModal';
import WorkViewer from '../../gallery/WorkViewer';
import { workImageUrl, workTitle, workSize } from '../../gallery/galleryUtils';
import './AdminGalleryTab.css';

const STATUSES = ['pending', 'approved', 'rejected'];

function ReviewItem({ work, onOpen, onDecide, busy }) {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <li className="admin-gallery__work">
      <button type="button" className="admin-gallery__thumb" onClick={onOpen} aria-label={t('gallery.viewer.open', { title: workTitle(work, t), defaultValue: 'Ver «{{title}}» en grande' })}>
        <img src={workImageUrl(work.image)} alt="" loading="lazy" />
      </button>
      <div className="admin-gallery__info">
        <strong>{workTitle(work, t)}</strong>
        <span>{[work.artist?.name_user, work.exhibition?.title, workSize(work, t)].filter(Boolean).join(' · ')}</span>
        {work.status_work === 'rejected' && work.rejection_reason && (
          <span className="admin-gallery__reason">{t('gallery.status.reason', { reason: work.rejection_reason, defaultValue: 'Motivo: {{reason}}' })}</span>
        )}
        {rejecting ? (
          <form className="admin-gallery__reject" onSubmit={(e) => { e.preventDefault(); onDecide(work, 'reject', reason); }}>
            <label htmlFor={`reject-${work.id_work}`}>{t('admin.gallery.reasonLabel', 'Motivo (lo verá la o el artista, opcional)')}</label>
            <textarea id={`reject-${work.id_work}`} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="admin-gallery__buttons">
              <button type="submit" className="admin-gallery__btn admin-gallery__btn--danger" disabled={busy}>
                {work.status_work === 'approved' ? t('admin.gallery.confirmWithdraw', 'Retirar de la galería') : t('admin.gallery.confirmReject', 'Rechazar')}
              </button>
              <button type="button" className="admin-gallery__btn" onClick={() => setRejecting(false)} disabled={busy}>{t('common.buttons.cancel', 'Cancelar')}</button>
            </div>
          </form>
        ) : (
          <div className="admin-gallery__buttons">
            {work.status_work !== 'approved' && (
              <button type="button" className="admin-gallery__btn admin-gallery__btn--primary" onClick={() => onDecide(work, 'approve')} disabled={busy}>
                <Check size={15} aria-hidden="true" /> {t('admin.gallery.approve', 'Aprobar')}
              </button>
            )}
            {work.status_work === 'pending' && (
              <button type="button" className="admin-gallery__btn" onClick={() => setRejecting(true)} disabled={busy}>
                <X size={15} aria-hidden="true" /> {t('admin.gallery.reject', 'Rechazar')}
              </button>
            )}
            {work.status_work === 'approved' && (
              <button type="button" className="admin-gallery__btn" onClick={() => setRejecting(true)} disabled={busy}>
                <Undo2 size={15} aria-hidden="true" /> {t('admin.gallery.withdraw', 'Retirar')}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function AdminGalleryTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError, showInfo, navigateToGallery } = useUI();
  const { refresh: refreshPending } = usePendingReview();
  const { refreshFeed } = useGallery();
  const [status, setStatus] = useState('pending');
  const [works, setWorks] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [artists, setArtists] = useState(null);
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [viewing, setViewing] = useState(null);
  const auth = useCallback(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser?.id_user]);

  const loadWorks = useCallback(() => {
    axiosInstance.get('/gallery/review', { ...auth(), params: { status } })
      .then((res) => setWorks(res.data?.data || []))
      .catch(() => setWorks([]));
    axiosInstance.get('/gallery/review/count', auth())
      .then((res) => setPendingCount(res.data?.data?.pending || 0))
      .catch(() => {});
  }, [status, auth]);
  const loadArtists = useCallback(() => {
    axiosInstance.get('/gallery/invitations', auth())
      .then((res) => setArtists(res.data?.data || []))
      .catch(() => setArtists([]));
  }, [auth]);

  useEffect(() => { setViewing(null); setWorks(null); loadWorks(); }, [loadWorks]);
  useEffect(() => { loadArtists(); }, [loadArtists]);

  const decide = async (work, decision, reason = '') => {
    setBusy(true);
    try {
      const res = await axiosInstance.post(`/gallery/review/${work.id_work}`, { decision, reason }, auth());
      showSuccess(res.data?.success);
      loadWorks();
      refreshPending();
      refreshFeed();
    } catch (err) {
      showError(err.response?.data?.error || t('admin.gallery.reviewError', 'No se pudo revisar la obra'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async (person) => {
    setBusy(true);
    try {
      const res = await axiosInstance.post(`/gallery/invitations/${person.id_user}/resend`, {}, auth());
      showSuccess(res.data?.success);
      loadArtists();
    } catch (err) {
      showError(err.response?.data?.error || t('authors.invitation.resendError', 'No se pudo reenviar la invitación'));
    } finally {
      setBusy(false);
    }
  };

  const sendUnsent = async () => {
    setBusy(true);
    try {
      const res = await axiosInstance.post('/gallery/invitations/send-unsent', {}, auth());
      if (res.data?.data?.failed?.length) showError(res.data.success);
      else showSuccess(res.data?.success);
      loadArtists();
    } catch (err) {
      showError(err.response?.data?.error || t('authors.unsent.error', 'No se pudieron enviar las invitaciones'));
    } finally {
      setBusy(false);
    }
  };

  const onInvited = (res) => {
    setInviting(false);
    if (res?.emailSent === false) showInfo(res.success);
    else showSuccess(res?.success);
    loadArtists();
  };

  const unsent = (artists || []).filter((a) => a.artist_invite_status === 'pending' && !a.artist_invite_email_sent_at && !a.has_signed_in);
  const day = (d) => localDate(d, { day: 'numeric', month: 'long', year: 'numeric' });

  const statusOf = (a) => {
    if (a.is_artist) return { cls: 'is-in', label: t('admin.gallery.isArtist', 'Artista') };
    if (a.artist_invite_status === 'pending') return { cls: 'is-pending', label: t('admin.gallery.invitePending', 'Invitación pendiente') };
    if (a.artist_invite_status === 'declined') return { cls: 'is-declined', label: t('admin.gallery.inviteDeclined', 'Rechazó la invitación') };
    return { cls: '', label: t('admin.gallery.notArtist', 'Ya no es artista') };
  };

  return (
    <section className="admin-gallery">
      <div className="admin-gallery__head">
        <h2>{t('admin.gallery.title', 'Galería')}</h2>
        <button type="button" className="admin-gallery__link" onClick={navigateToGallery}>
          <ExternalLink size={15} aria-hidden="true" /> {t('admin.gallery.view', 'Ver la galería')}
        </button>
      </div>

      <h3>{t('admin.gallery.worksTitle', 'Obras')}</h3>
      <p className="admin-gallery__hint">{t('admin.gallery.worksHint', 'Una obra solo se ve en la galería cuando la apruebas. Cada obra nueva o cambiada vuelve aquí.')}</p>
      <div className="admin-gallery__filters" role="tablist">
        {STATUSES.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={`admin-gallery__filter ${status === s ? 'is-active' : ''}`} onClick={() => setStatus(s)}>
            {s === 'pending' ? t('admin.gallery.filterPending', 'Para revisar') : s === 'approved' ? t('admin.gallery.filterApproved', 'En la galería') : t('admin.gallery.filterRejected', 'No publicadas')}
            {s === 'pending' && pendingCount > 0 && <span className="admin-page__tab-badge">{pendingCount}</span>}
          </button>
        ))}
      </div>
      {works === null ? (
        <p className="admin-gallery__empty">{t('common.states.loading', 'Cargando…')}</p>
      ) : works.length === 0 ? (
        <p className="admin-gallery__empty">
          {status === 'pending' ? t('admin.gallery.noPending', 'No hay obras esperando revisión.') : t('admin.gallery.none', 'No hay obras aquí.')}
        </p>
      ) : (
        <ul className="admin-gallery__works">
          {works.map((w, i) => <ReviewItem key={w.id_work} work={w} onOpen={() => setViewing(i)} onDecide={decide} busy={busy} />)}
        </ul>
      )}
      {viewing !== null && works?.[viewing] && (
        <WorkViewer works={works} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
      )}

      <div className="admin-gallery__head admin-gallery__head--artists">
        <h3>{t('admin.gallery.artistsTitle', 'Artistas')}</h3>
        <button type="button" className="admin-gallery__btn admin-gallery__btn--primary" onClick={() => setInviting(true)}>
          <UserPlus size={15} aria-hidden="true" /> {t('gallery.invite.button', 'Invitar artista')}
        </button>
      </div>
      {unsent.length > 0 && (
        <div className="admin-gallery__unsent" role="status">
          <p>{t('admin.gallery.unsent', { count: unsent.length, defaultValue: '{{count}} invitaciones no constan como enviadas.' })}</p>
          <button type="button" className="admin-gallery__btn admin-gallery__btn--primary" onClick={sendUnsent} disabled={busy}>
            <Send size={15} aria-hidden="true" /> {t('authors.unsent.send', { count: unsent.length, defaultValue: 'Enviarlas ahora' })}
          </button>
        </div>
      )}
      {artists === null ? (
        <p className="admin-gallery__empty">{t('common.states.loading', 'Cargando…')}</p>
      ) : artists.length === 0 ? (
        <p className="admin-gallery__empty">{t('admin.gallery.noArtists', 'Todavía no hay artistas. Invita a alguien con «Invitar artista».')}</p>
      ) : (
        <ul className="admin-gallery__artists">
          {artists.map((a) => {
            const st = statusOf(a);
            return (
              <li key={a.id_user} className="admin-gallery__artist">
                <div className="admin-gallery__info">
                  <strong>{a.name_user}</strong>
                  <span>{a.email_user}</span>
                  <span className={`admin-gallery__chip ${st.cls}`}>{st.label}</span>
                  {a.artist_invite_status === 'pending' && !a.is_artist && (
                    <span className="admin-gallery__sent">
                      {a.artist_invite_email_sent_at
                        ? t('admin.gallery.sentOn', { date: day(a.artist_invite_email_sent_at), defaultValue: 'Email enviado el {{date}}' })
                        : t('admin.gallery.notSent', 'El email no consta como enviado')}
                    </span>
                  )}
                </div>
                {a.artist_invite_status === 'pending' && !a.is_artist && (
                  <div className="admin-gallery__buttons">
                    <button type="button" className="admin-gallery__btn" onClick={() => resend(a)} disabled={busy}>
                      <Send size={15} aria-hidden="true" />
                      {a.artist_invite_email_sent_at ? t('authors.invitation.resend', 'Reenviar email') : t('authors.invitation.send', 'Enviar email')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {inviting && <InviteArtistModal onClose={() => setInviting(false)} onInvited={onInvited} />}
    </section>
  );
}

export default AdminGalleryTab;
