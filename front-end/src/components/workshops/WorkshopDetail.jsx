// magazine-front/src/components/workshops/WorkshopDetail.jsx
//
// A workshop's page — or a contest's (utils/contests.js): its days, prizes
// and winners, and «Inscribirme» while sign-ups are open.
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
import WorkshopAccessTag from './WorkshopAccessTag';
import WorkshopExtraSpot from './WorkshopExtraSpot';
import WorkshopKindTag, { WorkshopReviewTag, WorkshopFinishedTag } from './WorkshopKindTag';
import { ContestDates, ContestAwards } from './ContestInfo';
import { isPastWorkshop } from '../../utils/workshopFilters';
import { isContest, contestPhase, formatDay, reviewStateOf } from '../../utils/contests';
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
      <span>{t('workshops.backToList', 'Volver a talleres y concursos')}</span>
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
  const contest = isContest(w);
  const phase = contest ? contestPhase(w) : null;
  const review = reviewStateOf(w);

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
          <div className={`workshop-detail-cover ${isPastWorkshop(w) ? 'is-past' : ''}`}>
            <img src={cover} alt={w.title_workshop} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}

        <h1 className="workshop-detail-title">{w.title_workshop}</h1>

        {/* A contest its managers see before it's published: where its
            review stands (sent back: why). */}
        {canManage && review !== 'approved' && (
          <p className={`workshop-review-note workshop-review-note--${review}`} role="status">
            {review === 'rejected'
              ? t('contests.review.rejectedNote', { reason: w.rejection_reason_workshop || t('contests.review.noReason', 'sin motivo'), defaultValue: 'Un super admin lo ha devuelto: {{reason}}. Edítalo y guárdalo para enviarlo de nuevo a revisión.' })
              : t('contests.review.pendingNote', 'En revisión: la gente lo verá cuando lo apruebe un super admin.')}
          </p>
        )}

        <div className="workshop-detail-meta">
          <WorkshopKindTag workshop={w} />
          <WorkshopFinishedTag workshop={w} />
          {!contest && <WorkshopAccessTag workshop={w} />}
          <WorkshopReviewTag workshop={w} />
          {contest ? (
            <>
              <ContestDates workshop={w} as="span" />
              <span className="workshop-meta">
                <Users size={16} />{' '}
                {t('contests.signedUp', { count: w.reservation_count || 0 })}
              </span>
            </>
          ) : (
            <>
              {dateStr && <span className="workshop-meta"><Calendar size={16} /> {dateStr}</span>}
              <span className="workshop-meta"><MapPin size={16} /> {w.location_workshop || t('workshops.map.defaultPlace', 'Matiko, Uribarri')}</span>
              <span className="workshop-meta">
                <Users size={16} />{' '}
                {w.capacity_workshop != null
                  ? t('workshops.spots', { left: w.spots_left, total: w.capacity_workshop })
                  : t('workshops.participants', { count: w.reservation_count })}
              </span>
            </>
          )}
        </div>

        {w.authors?.length > 0 && (
          <div className="workshop-detail-authors">
            <span className="workshop-detail-label">{contest ? t('contests.organizers', 'Organizan') : t('workshops.instructors')}:</span>
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

        {/* A contest's prizes; its winners from the jury's day on (its
            managers, who fill them in, see them before — said so). */}
        {contest && (
          <>
            <ContestAwards workshop={w} showWinners={phase === 'resolved' || canManage} />
            {canManage && phase !== 'resolved' && w.awards_workshop && Object.values(w.awards_workshop).some((a) => a?.winner) && (
              <p className="workshop-booking-note">{t('contests.winnersHidden', { day: formatDay(w.resolution_date_workshop), defaultValue: 'Las ganadoras y los ganadores solo los ves tú (y quien gestiona el concurso) hasta el día del fallo: {{day}}.' })}</p>
            )}
          </>
        )}

        {/* Where it takes place (set by its creator on the map). */}
        {!contest && <WorkshopMap lat={w.lat_workshop} lng={w.lng_workshop} label={w.location_workshop || w.title_workshop} />}

        {/* Reservation action (a contest: its sign-up) */}
        <div className="workshop-reserve-box">
          {contest ? (
            review !== 'approved' ? (
              <p className="workshop-contest-note">{t('contests.signup.unpublished', 'Las inscripciones se abrirán cuando se publique el concurso.')}</p>
            ) : isPastWorkshop(w) ? (
              <p className="workshop-full-note">{t('contests.signup.finished', 'Este concurso ya ha terminado.')}</p>
            ) : isReserved ? (
              <>
                <p className="workshop-reserved-note">{t('contests.signup.done', 'Estás inscrita/o en este concurso.')}</p>
                {phase !== 'resolved' && (
                  <button className="workshop-btn workshop-btn--cancel" onClick={handleCancel} disabled={loading}>
                    {t('contests.signup.cancel', 'Cancelar la inscripción')}
                  </button>
                )}
              </>
            ) : bookingCode === 'blocked' ? (
              <p className="workshop-full-note">{t('contests.signup.blocked', 'No puedes inscribirte en este concurso.')}</p>
            ) : phase === 'soon' ? (
              <p className="workshop-contest-note">{t('contests.signup.soon', { day: formatDay(w.registration_start_workshop), defaultValue: 'Las inscripciones se abren el {{day}}.' })}</p>
            ) : phase === 'closed' ? (
              <p className="workshop-contest-note">{t('contests.signup.closed', { day: formatDay(w.resolution_date_workshop), defaultValue: 'Las inscripciones están cerradas. El jurado dará a conocer a las ganadoras y los ganadores el {{day}}.' })}</p>
            ) : phase === 'resolved' ? (
              <p className="workshop-contest-note">{t('contests.signup.resolved', 'El jurado ya ha decidido.')}</p>
            ) : (
              <>
                <button className="workshop-btn workshop-btn--reserve" onClick={handleReserve} disabled={loading}>
                  {t('contests.signup.button', 'Inscribirme')}
                </button>
                <p className="workshop-booking-note">
                  {t('contests.signup.until', { day: formatDay(w.registration_end_workshop), defaultValue: 'Inscripciones abiertas hasta el {{day}}, para cualquier persona con cuenta en la revista.' })}
                </p>
              </>
            )
          ) : isPastWorkshop(w) ? (
            // Finished: no booking, no extra places (the server says so too).
            <p className="workshop-full-note">{t('workshops.finishedNote', 'Este taller ya ha terminado.')}</p>
          ) : invitation ? (
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
            <WorkshopExtraSpot workshop={w} />
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
