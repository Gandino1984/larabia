// magazine-front/src/components/workshops/WorkshopDetail.jsx
//
// A workshop's page — or a convocatoria's (kind 'contest', utils/contests.js):
// its days, the section its works are published in, its prizes and winners
// (when it's also a contest), «Participar» while sign-ups are open, the
// participant's work and its review, and the published works to vote
// (CallVoting.jsx).
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localDate } from '../../utils/locale';
import { ArrowLeft, Calendar, MapPin, Users, Send, Pencil, Undo2, Paperclip, BookOpen, Hourglass, CheckCircle2, XCircle } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
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
import ContestEntryModal from './ContestEntryModal';
import ContestEntriesPanel from './ContestEntriesPanel';
import { CallWorks } from './CallVoting';
import { useMagazine } from '../../app_context/MagazineContext';
import { useSectionCatalog } from '../../app_context/useSectionCatalog';
import { sectionLabel } from '../../utils/sections';
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

/** The participant's work: where its review stands (and its article, once accepted). */
function EntryReview({ entry, section, onOpen }) {
  const { t } = useTranslation();
  const status = entry.status_entry || 'sent';
  const published = entry.article?.status_article === 'published';
  return (
    <div className={`contest-entry-review contest-entry-review--${published ? 'published' : status}`} role="status">
      {status === 'declined' ? <XCircle size={16} aria-hidden="true" />
        : status === 'accepted' ? <CheckCircle2 size={16} aria-hidden="true" />
          : <Hourglass size={16} aria-hidden="true" />}
      <span>
        {status === 'declined'
          ? (entry.decline_reason_entry
            ? t('calls.entry.declinedReason', { reason: entry.decline_reason_entry, defaultValue: 'Tu obra no ha sido seleccionada: {{reason}}' })
            : t('calls.entry.declined', 'Tu obra no ha sido seleccionada.'))
          : status === 'accepted'
            ? (published
              ? t('calls.entry.published', { section, defaultValue: '¡Tu obra está publicada en {{section}}!' })
              : t('calls.entry.accepted', { section, defaultValue: '¡Tu obra ha sido aceptada! La estamos preparando para publicarla en {{section}}.' }))
            : t('calls.entry.review', { section, defaultValue: 'En revisión: un super admin la leerá antes de publicarla en {{section}}.' })}
        {published && (
          <> <button type="button" className="contest-entry-review__link" onClick={() => onOpen(entry.article.id_article)}>{t('calls.entry.openWork', 'Ver tu obra')}</button></>
        )}
      </span>
    </div>
  );
}

function WorkshopDetail() {
  const { t } = useTranslation();
  const { navigateToTalleres, navigateToArticle, showSuccess, showError } = useUI();
  const { fetchArticleById } = useMagazine();
  const sectionCatalog = useSectionCatalog();
  // A contest: the entry form (sending the work = taking part).
  const [entryForm, setEntryForm] = useState(false);
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
      <span>{t('workshops.backToList', 'Volver a talleres y convocatorias')}</span>
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

  // A contest: withdraw their work (and sign-up) while sign-ups are open.
  // The participant's published work.
  const openWork = async (articleId) => {
    const r = await fetchArticleById(articleId);
    if (r?.success) navigateToArticle();
  };

  const withdrawEntry = async () => {
    if (!window.confirm(t('contests.entry.confirmWithdraw', '¿Retirar tu obra? Dejarás de participar en la convocatoria (podrás volver a enviarla mientras sigan abiertas las inscripciones).'))) return;
    try {
      const res = await axiosInstance.delete(`/magazine-workshop/contests/${id}/entry`, { headers: { 'x-user-id': currentUser?.id_user } });
      showSuccess(res.data?.success || t('contests.entry.withdrawn', 'Has retirado tu obra'));
      fetchWorkshopById(id);
    } catch (err) {
      showError(err.response?.data?.error || t('contests.entry.withdrawError', 'No se pudo retirar la obra'));
    }
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
              <span className="workshop-meta"><Calendar size={16} /> {dateStr || t('workshops.dateTbd', 'Fecha por definir')}</span>
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

        {/* A convocatoria: where the works it accepts are published. */}
        {contest && w.section_workshop && (
          <p className="workshop-call-section">
            <BookOpen size={16} aria-hidden="true" />
            <span>{t('calls.section', { section: sectionLabel(w.section_workshop, sectionCatalog), defaultValue: 'Las obras aceptadas se publican en {{section}} y se someten a votación.' })}</span>
          </p>
        )}

        {/* A contest's prizes; its winners from the jury's day on (its
            managers, who fill them in, see them before — said so). */}
        {contest && (
          <>
            <ContestAwards workshop={w} showWinners={phase === 'resolved' || canManage} />
            {canManage && phase !== 'resolved' && w.awards_workshop && Object.values(w.awards_workshop).some((a) => a?.winner) && (
              <p className="workshop-booking-note">{t('contests.winnersHidden', { day: formatDay(w.resolution_date_workshop), defaultValue: 'Las ganadoras y los ganadores solo los ves tú (y quien gestiona la convocatoria) hasta el día del fallo: {{day}}.' })}</p>
            )}
          </>
        )}

        {/* Where it takes place (set by its creator on the map). */}
        {!contest && <WorkshopMap lat={w.lat_workshop} lng={w.lng_workshop} label={w.location_workshop || w.title_workshop} />}

        {/* Reservation action (a contest: its sign-up) */}
        <div className="workshop-reserve-box">
          {contest ? (
            review !== 'approved' ? (
              <p className="workshop-contest-note">{t('contests.signup.unpublished', 'Las inscripciones se abrirán cuando se publique la convocatoria.')}</p>
            ) : isPastWorkshop(w) ? (
              <p className="workshop-full-note">{t('contests.signup.finished', 'Esta convocatoria ya ha terminado.')}</p>
            ) : w.my_entry ? (
              // Their work is in: change or withdraw it while sign-ups are open.
              <div className="contest-my-entry">
                <p className="workshop-reserved-note">
                  {t('contests.entry.yours', { title: w.my_entry.title_entry, defaultValue: 'Has enviado «{{title}}»: ya participas en la convocatoria.' })}
                </p>
                {w.my_entry.has_file && (
                  <span className="contest-my-entry__file"><Paperclip size={14} aria-hidden="true" /> {w.my_entry.file_name_entry}</span>
                )}
                <EntryReview entry={w.my_entry} section={sectionLabel(w.section_workshop, sectionCatalog)} onOpen={openWork} />
                {phase === 'open' && w.my_entry.status_entry !== 'accepted' ? (
                  <div className="contest-my-entry__actions">
                    <button className="workshop-btn workshop-btn--reserve" onClick={() => setEntryForm(true)}>
                      <Pencil size={16} aria-hidden="true" /> {t('contests.entry.change', 'Cambiar mi obra')}
                    </button>
                    <button className="workshop-btn workshop-btn--cancel" onClick={withdrawEntry} disabled={loading}>
                      <Undo2 size={16} aria-hidden="true" /> {t('contests.entry.withdraw', 'Retirar mi obra')}
                    </button>
                  </div>
                ) : (
                  phase !== 'open' && (
                  <p className="workshop-booking-note">
                    {phase === 'closed'
                      ? (w.with_prizes_workshop
                        ? t('contests.entry.lockedClosed', { day: formatDay(w.resolution_date_workshop), defaultValue: 'Las inscripciones están cerradas: tu obra ya no se puede cambiar. El jurado dará a conocer a las ganadoras y los ganadores el {{day}}.' })
                        : t('calls.entry.lockedClosed', { day: formatDay(w.resolution_date_workshop), defaultValue: 'Las inscripciones están cerradas: tu obra ya no se puede cambiar. Los resultados de la votación se publicarán el {{day}}.' }))
                      : (w.with_prizes_workshop ? t('contests.signup.resolved', 'El jurado ya ha decidido.') : t('calls.signup.resolved', 'La votación ha terminado: mira los resultados.'))}
                  </p>
                  )
                )}
              </div>
            ) : bookingCode === 'blocked' ? (
              <p className="workshop-full-note">{t('contests.signup.blocked', 'No puedes inscribirte en esta convocatoria.')}</p>
            ) : phase === 'soon' ? (
              <p className="workshop-contest-note">{t('contests.signup.soon', { day: formatDay(w.registration_start_workshop), defaultValue: 'Las inscripciones se abren el {{day}}: desde ese día podrás enviar tu obra aquí.' })}</p>
            ) : phase === 'closed' ? (
              <p className="workshop-contest-note">
                {w.with_prizes_workshop
                  ? t('contests.signup.closed', { day: formatDay(w.resolution_date_workshop), defaultValue: 'Las inscripciones están cerradas. El jurado dará a conocer a las ganadoras y los ganadores el {{day}}.' })
                  : t('calls.signup.closed', { day: formatDay(w.resolution_date_workshop), defaultValue: 'Las inscripciones están cerradas. Los resultados de la votación se publicarán el {{day}}.' })}
              </p>
            ) : phase === 'resolved' ? (
              <p className="workshop-contest-note">{w.with_prizes_workshop ? t('contests.signup.resolved', 'El jurado ya ha decidido.') : t('calls.signup.resolved', 'La votación ha terminado: mira los resultados.')}</p>
            ) : (
              <>
                <button className="workshop-btn workshop-btn--reserve" onClick={() => setEntryForm(true)}>
                  <Send size={16} aria-hidden="true" /> {t('contests.entry.participate', 'Participar: enviar mi obra')}
                </button>
                <p className="workshop-booking-note">
                  {t('contests.signup.until', { day: formatDay(w.registration_end_workshop), defaultValue: 'Puedes enviar tu obra hasta el {{day}}. Para participar hace falta una cuenta en la revista.' })}
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

        {/* A convocatoria: its published works, to vote (anyone). */}
        {contest && review === 'approved' && <CallWorks key={`works-${w.id_workshop}`} call={w} />}

        {/* The works that came in, and their review (its managers). */}
        {contest && canManage && <ContestEntriesPanel key={w.entry_count} contest={w} onChange={() => fetchWorkshopById(id)} />}

        {/* Participants: the workshop's managers only. */}
        {canManage && w.participants && <WorkshopParticipantsPanel workshop={w} />}

        {entryForm && (
          <ContestEntryModal
            contest={w}
            entry={w.my_entry || null}
            onClose={() => setEntryForm(false)}
            onSent={() => fetchWorkshopById(id)}
          />
        )}
      </div>
    </div>
  );
}

export default WorkshopDetail;
