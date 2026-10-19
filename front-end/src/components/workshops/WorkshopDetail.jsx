// magazine-front/src/components/workshops/WorkshopDetail.jsx
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { localDate } from '../../utils/locale';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import AuthorChip from '../common/AuthorChip';
import WorkshopMap from '../maps/WorkshopMap';
import { useWorkshopAccess, canManageWorkshop } from '../../app_context/useWorkshopAccess';
import WorkshopOptions from './WorkshopOptions';
import WorkshopParticipantsPanel from './WorkshopParticipantsPanel';
import '../magazine/ArticleCard.css';
import '../magazine/ProjectDetail.css';
import './Workshops.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const resolveImg = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/${img.startsWith('/') ? img.slice(1) : img}`;
};
const formatDate = (d) => {
  if (!d) return null;
  try {
    return localDate(d, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return null; }
};

function WorkshopDetail() {
  const { t } = useTranslation();
  const { navigateToTalleres } = useUI();
  const { currentUser, isSuperAdmin, canCreateContent } = useAuth();
  const {
    selectedWorkshop, fetchWorkshopById, reserveWorkshop, cancelWorkshopReservation, loading,
    respondToWorkshopInvitation
  } = useWorkshop();

  const id = selectedWorkshop?.id_workshop;

  // Opening a workshop needs a signed-in account; booking, a subscription
  // (the magazine team books without one).
  const { guard } = useWorkshopAccess();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    fetchWorkshopById(id).then((res) => {
      // Not allowed to open it (signed out): back to the list, to sign in.
      if (res?.code) {
        navigateToTalleres();
        guard(res.code === 'subscription_required' ? 'subscribe' : 'login');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const w = selectedWorkshop;
  const isReserved = useMemo(
    () => !!(w?.reserved_by_me || w?.participants?.some(p => p.id_user === currentUser?.id_user)),
    [w, currentUser]
  );
  // The participants — like an article's author: super admins (any
  // workshop), or an admin who created or teaches it (edit / delete: the ⋯
  // options, same rule).
  const canManage = canManageWorkshop(w, currentUser, { isSuperAdmin, canCreateContent });

  // null (can book) | 'login_required' | 'subscription_required' | 'blocked'
  const bookingCode = !currentUser ? 'login_required' : (w?.booking_code || null);

  // Back to the workshops list (the header's arrow does the same, but this one
  // is in plain sight).
  const backButton = (
    <button type="button" className="workshop-back-btn" onClick={navigateToTalleres}>
      <ArrowLeft size={18} />
      <span>{t('workshops.backToList', 'Volver a talleres')}</span>
    </button>
  );

  if (!w) {
    return (
      <div className="workshops-page">
        <div className="workshops-container">
          {backButton}
          <p className="workshops-empty">{t('workshops.notFound')}</p>
        </div>
      </div>
    );
  }

  const cover = resolveImg(w.cover_image_workshop);
  const dateStr = formatDate(w.date_workshop);

  const handleReserve = async () => {
    if (bookingCode === 'login_required') { guard('login'); return; }
    if (bookingCode === 'subscription_required') { guard('subscribe'); return; }
    const res = await reserveWorkshop(id);
    if (res.success) fetchWorkshopById(id);
    else if (res.code) guard(res.code === 'login_required' ? 'login' : 'subscribe');
  };

  // Someone invited the reader: their place is held until they answer.
  const invitation = !isReserved ? w.my_invitation : null;
  const handleInvitation = async (response) => {
    if (response === 'decline'
      && !confirm(t('workshops.invitation.confirmDecline', '¿Rechazar la invitación? La plaza quedará libre para otra persona.'))) return;
    const res = await respondToWorkshopInvitation(invitation, response);
    if (res.code) guard(res.code === 'login_required' ? 'login' : 'subscribe');
  };

  const handleCancel = async () => {
    const res = await cancelWorkshopReservation(id);
    if (res.success) fetchWorkshopById(id);
  };

  return (
    <div className="workshops-page">
      <div className="workshops-container workshop-detail">
        <div className="workshop-detail-toolbar">
          {backButton}
          {/* ⋯ options, like an article's: share (everyone), edit / delete
              (its managers). project-options: the project header's look. */}
          <WorkshopOptions
            workshop={w}
            align="end"
            className="project-options"
            onDeleted={navigateToTalleres}
          />
        </div>
        {cover && (
          <div className="workshop-detail-cover">
            <img src={cover} alt={w.title_workshop} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}

        <h1 className="workshop-detail-title">{w.title_workshop}</h1>

        <div className="workshop-detail-meta">
          {dateStr && <span className="workshop-meta"><Calendar size={16} /> {dateStr}</span>}
          <span className="workshop-meta"><MapPin size={16} /> {w.location_workshop || t('workshops.map.defaultPlace', 'Matiko, Uribarri')}</span>
          <span className="workshop-meta">
            <Users size={16} />{' '}
            {w.capacity_workshop != null
              ? t('workshops.spots', { left: w.spots_left, total: w.capacity_workshop })
              : t('workshops.participants', { count: w.reservation_count })}
          </span>
        </div>

        {w.authors?.length > 0 && (
          <div className="workshop-detail-authors">
            <span className="workshop-detail-label">{t('workshops.instructors')}:</span>
            <div className="workshop-detail-authors-list">
              {w.authors.map(a => (
                <AuthorChip key={a.id_user} author={a} tone="light" />
              ))}
            </div>
          </div>
        )}

        {w.description_workshop && (
          <p className="workshop-detail-description">{w.description_workshop}</p>
        )}

        {/* Where it takes place (set by its creator on the map). */}
        <WorkshopMap lat={w.lat_workshop} lng={w.lng_workshop} label={w.location_workshop || w.title_workshop} />

        {/* Reservation action */}
        <div className="workshop-reserve-box">
          {invitation ? (
            <>
              <p className="workshop-invitation-note">
                {t('workshops.invitation.note', {
                  name: invitation.inviter?.name_user || '',
                  defaultValue: '{{name}} te ha invitado a este taller. Tu plaza está guardada hasta que respondas.'
                })}
              </p>
              <div className="workshop-invitation-actions">
                <button className="workshop-btn workshop-btn--reserve" onClick={() => handleInvitation('accept')} disabled={loading}>
                  {t('workshops.invitation.accept', 'Aceptar y reservar plaza')}
                </button>
                <button className="workshop-btn workshop-btn--decline" onClick={() => handleInvitation('decline')} disabled={loading}>
                  {t('workshops.invitation.decline', 'Rechazar')}
                </button>
              </div>
            </>
          ) : isReserved ? (
            <>
              <p className="workshop-reserved-note">{t('workshops.reservedNote')}</p>
              <button className="workshop-btn workshop-btn--cancel" onClick={handleCancel} disabled={loading}>
                {t('workshops.cancelReservation')}
              </button>
            </>
          ) : bookingCode === 'blocked' ? (
            <p className="workshop-full-note">{t('workshops.bookingNote.blocked', 'No puedes reservar plaza en este taller.')}</p>
          ) : w.is_full ? (
            <p className="workshop-full-note">{t('workshops.fullNote')}</p>
          ) : (
            <>
              <button className="workshop-btn workshop-btn--reserve" onClick={handleReserve} disabled={loading}>
                {t('workshops.reserve')}
              </button>
              {bookingCode && (
                <p className="workshop-booking-note">
                  {bookingCode === 'login_required'
                    ? t('workshops.bookingNote.login', 'Para reservar plaza, inicia sesión con tu cuenta de socio/a.')
                    : t('workshops.bookingNote.subscribe', 'Las reservas son exclusivas para socios/as de La Rabia.')}
                </p>
              )}
            </>
          )}
        </div>

        {/* Participants: the workshop's managers only. */}
        {canManage && w.participants && <WorkshopParticipantsPanel workshop={w} />}
      </div>
    </div>
  );
}

export default WorkshopDetail;
