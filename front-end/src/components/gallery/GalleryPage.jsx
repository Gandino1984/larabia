// magazine-front/src/components/gallery/GalleryPage.jsx
//
// The Galería: the exhibitions of the neighbourhood's visual artists, each
// with its works approved by the team (anyone sees them). Artists get «Mi
// galería»; super admins invite artists and review the works (Admin ›
// Galería, with the count of works waiting).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Images, UserPlus, ClipboardCheck } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useGallery } from '../../app_context/GalleryContext';
import { useAuthorPhoto } from '../../app_context/AuthorContext';
import InviteArtistModal from './InviteArtistModal';
import { workImageUrl, exhibitionTitle } from './galleryUtils';
import './Gallery.css';

function GalleryPage() {
  const { t } = useTranslation();
  const { navigateToExhibition, navigateToMyGallery, navigateToAdmin, showSuccess, showInfo } = useUI();
  const { isSuperAdmin } = useAuth();
  const { isArtist, feed, unreadMessages } = useGallery();
  const photoOf = useAuthorPhoto();
  const [exhibitions, setExhibitions] = useState(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    axiosInstance.get('/gallery')
      .then((res) => setExhibitions(res.data?.data || []))
      .catch(() => setExhibitions([]));
  }, []);

  const onInvited = (res) => {
    setInviting(false);
    if (res?.emailSent === false) showInfo(res.success);
    else showSuccess(res?.success);
  };

  return (
    <div className="gallery-page">
      <header className="gallery-page__header">
        <div>
          <h1>{t('gallery.title', 'Galería')}</h1>
          <p className="gallery-page__subtitle">
            {t('gallery.subtitle', 'La obra de las y los artistas del barrio: cada exposición, con hasta siete obras.')}
          </p>
        </div>
        {(isArtist || isSuperAdmin) && (
          <div className="gallery-page__actions">
            {isArtist && (
              <button type="button" className="gallery-btn gallery-btn--primary" onClick={() => navigateToMyGallery()}>
                <Images size={18} aria-hidden="true" />
                {t('gallery.mine.button', 'Mi galería')}
                {unreadMessages > 0 && <span className="gallery-badge">{unreadMessages}</span>}
              </button>
            )}
            {isSuperAdmin && (
              <>
                <button type="button" className="gallery-btn" onClick={() => setInviting(true)}>
                  <UserPlus size={18} aria-hidden="true" />
                  {t('gallery.invite.button', 'Invitar artista')}
                </button>
                <button type="button" className="gallery-btn" onClick={() => navigateToAdmin('gallery')}>
                  <ClipboardCheck size={18} aria-hidden="true" />
                  {t('gallery.review.button', 'Revisar obras')}
                  {feed.pending_review > 0 && <span className="gallery-badge">{feed.pending_review}</span>}
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {exhibitions === null ? (
        <p className="gallery-page__empty">{t('common.states.loading', 'Cargando…')}</p>
      ) : exhibitions.length === 0 ? (
        <p className="gallery-page__empty">{t('gallery.empty', 'Todavía no hay exposiciones en la galería.')}</p>
      ) : (
        <div className="gallery-grid">
          {exhibitions.map((ex) => (
            <article
              key={ex.id_exhibition}
              className="gallery-card"
              role="link"
              tabIndex={0}
              onClick={() => navigateToExhibition(ex.id_exhibition)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigateToExhibition(ex.id_exhibition); }}
            >
              <div className="gallery-card__image">
                {ex.cover?.image && <img src={workImageUrl(ex.cover.image)} alt="" loading="lazy" />}
                <span className="gallery-card__count">
                  {t('gallery.worksCount', { count: ex.works_count })}
                </span>
              </div>
              <div className="gallery-card__body">
                <h2 className="gallery-card__title">{exhibitionTitle(ex)}</h2>
                <span className="gallery-artist">
                  {photoOf(ex.artist)
                    ? <img src={photoOf(ex.artist)} alt="" className="gallery-artist__photo" />
                    : <span className="gallery-artist__photo gallery-artist__photo--initial" aria-hidden="true">{ex.artist?.name_user?.charAt(0)?.toUpperCase()}</span>}
                  <span className="gallery-artist__name">{ex.artist?.name_user}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {inviting && <InviteArtistModal onClose={() => setInviting(false)} onInvited={onInvited} />}
    </div>
  );
}

export default GalleryPage;
