// magazine-front/src/components/workshops/WorkshopDetail.jsx
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, MapPin, Users, User } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import AuthorChip from '../common/AuthorChip';
import './Workshops.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const resolveImg = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/${img.startsWith('/') ? img.slice(1) : img}`;
};
const resolveAvatar = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
};
const formatDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return null; }
};

function WorkshopDetail() {
  const { t } = useTranslation();
  const { navigateToTalleres, navigateToLogin } = useUI();
  const { currentUser } = useAuth();
  const { selectedWorkshop, fetchWorkshopById, reserveWorkshop, cancelWorkshopReservation, loading } = useWorkshop();

  const id = selectedWorkshop?.id_workshop;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) fetchWorkshopById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const w = selectedWorkshop;
  const isReserved = useMemo(
    () => !!(w?.participants?.some(p => p.id_user === currentUser?.id_user)),
    [w, currentUser]
  );

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
    if (!currentUser) { navigateToLogin(); return; }
    const res = await reserveWorkshop(id);
    if (res.success) fetchWorkshopById(id);
  };
  const handleCancel = async () => {
    const res = await cancelWorkshopReservation(id);
    if (res.success) fetchWorkshopById(id);
  };

  return (
    <div className="workshops-page">
      <div className="workshops-container workshop-detail">
        {backButton}
        {cover && (
          <div className="workshop-detail-cover">
            <img src={cover} alt={w.title_workshop} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}

        <h1 className="workshop-detail-title">{w.title_workshop}</h1>

        <div className="workshop-detail-meta">
          {dateStr && <span className="workshop-meta"><Calendar size={16} /> {dateStr}</span>}
          {w.location_workshop && <span className="workshop-meta"><MapPin size={16} /> {w.location_workshop}</span>}
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

        {/* Reservation action */}
        <div className="workshop-reserve-box">
          {isReserved ? (
            <>
              <p className="workshop-reserved-note">{t('workshops.reservedNote')}</p>
              <button className="workshop-btn workshop-btn--cancel" onClick={handleCancel} disabled={loading}>
                {t('workshops.cancelReservation')}
              </button>
            </>
          ) : w.is_full ? (
            <p className="workshop-full-note">{t('workshops.fullNote')}</p>
          ) : (
            <button className="workshop-btn workshop-btn--reserve" onClick={handleReserve} disabled={loading}>
              {t('workshops.reserve')}
            </button>
          )}
        </div>

        {/* Participants */}
        {w.participants?.length > 0 && (
          <div className="workshop-participants">
            <h3>{t('workshops.participantsTitle')} ({w.participants.length})</h3>
            <div className="workshop-participants-list">
              {w.participants.map(p => (
                <span key={p.id_user} className="workshop-author-chip">
                  {resolveAvatar(p.image_user)
                    ? <img src={resolveAvatar(p.image_user)} alt={p.name_user} className="workshop-author-avatar" />
                    : <User size={14} />}
                  {p.name_user}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkshopDetail;
