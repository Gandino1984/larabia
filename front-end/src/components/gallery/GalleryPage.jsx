// magazine-front/src/components/gallery/GalleryPage.jsx
//
// The Galería: the exhibitions of the neighbourhood's visual artists, each
// with its works approved by the team (anyone sees them). Artists get «Mi
// galería»; super admins invite artists, create galleries on an artist's
// behalf (theirs once they accept) and review the works (Admin › Galería,
// with the count of works waiting). A search bar finds an artist (or an
// exhibition by its title) — no case, no accents.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Images, UserPlus, ClipboardCheck, ImagePlus, Search, X } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useGallery } from '../../app_context/GalleryContext';
import { useAuthorPhoto } from '../../app_context/AuthorContext';
import InviteArtistModal from './InviteArtistModal';
import { workImageUrl, exhibitionTitle, protectedImage } from './galleryUtils';
import './Gallery.css';

// For searching: no case, no accents («lucia» finds «Lucía»).
const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function GalleryPage() {
  const { t } = useTranslation();
  const { navigateToExhibition, navigateToMyGallery, navigateToAdmin, showSuccess, showInfo } = useUI();
  const { isSuperAdmin } = useAuth();
  const { isArtist, feed } = useGallery();
  const photoOf = useAuthorPhoto();
  const [exhibitions, setExhibitions] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const query = fold(search).trim();
  const shown = useMemo(() => (!query || !exhibitions
    ? exhibitions
    : exhibitions.filter((ex) => fold(ex.artist?.name_user).includes(query) || fold(exhibitionTitle(ex)).includes(query))
  ), [exhibitions, query]);

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
  // A gallery prepared on the artist's behalf: open it to hang the works.
  const onCreated = (res) => {
    onInvited(res);
    setCreating(false);
    if (res?.data) navigateToMyGallery({ forUser: { id_user: res.data.id_user, name_user: res.data.name_user } });
  };

  return (
    <div className="gallery-page">
      <header className="gallery-page__header">
        <div>
          <h1>{t('gallery.title', 'Galería')}</h1>
          <p className="gallery-page__subtitle">
            {t('gallery.subtitle', 'Bienvenida/o a la galería de obras digitales de La Rabia. Aquí puedes explorar la actividad creativa de las/los artistas del barrio. Para convertirte en un artista visual en nuestra plataforma debes tener tu cuenta en la revista (Google Mail) y hacerte socia/o.')}
          </p>
        </div>
        {(isArtist || isSuperAdmin) && (
          <div className="gallery-page__actions">
            {isArtist && (
              <button type="button" className="gallery-btn gallery-btn--primary" onClick={() => navigateToMyGallery()}>
                <Images size={18} aria-hidden="true" />
                {t('gallery.mine.button', 'Mi galería')}
              </button>
            )}
            {isSuperAdmin && (
              <>
                <button type="button" className="gallery-btn" onClick={() => setInviting(true)}>
                  <UserPlus size={18} aria-hidden="true" />
                  {t('gallery.invite.button', 'Invitar artista')}
                </button>
                <button type="button" className="gallery-btn" onClick={() => setCreating(true)}>
                  <ImagePlus size={18} aria-hidden="true" />
                  {t('gallery.create.button', 'Crear una galería')}
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
        <>
        <div className="gallery-search" role="search">
          <Search size={20} className="gallery-search__icon" aria-hidden="true" />
          <input
            type="search"
            className="gallery-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('gallery.search.placeholder', 'Busca una artista o una exposición…')}
            aria-label={t('gallery.search.label', 'Buscar en la galería')}
            autoComplete="off"
            enterKeyHint="search"
          />
          {search && (
            <button
              type="button"
              className="gallery-search__clear"
              onClick={() => setSearch('')}
              aria-label={t('authors.search.clear', 'Borrar la búsqueda')}
              title={t('authors.search.clear', 'Borrar la búsqueda')}
            >
              <X size={18} />
            </button>
          )}
        </div>
        {query && (
          <p className="gallery-search__count" aria-live="polite">
            {shown.length > 0
              ? t('gallery.search.results', { count: shown.length })
              : t('gallery.search.none', { q: search.trim(), defaultValue: 'Ninguna artista ni exposición coincide con «{{q}}».' })}
          </p>
        )}
        <div className="gallery-grid">
          {shown.map((ex) => (
            <article
              key={ex.id_exhibition}
              className="gallery-card"
              role="link"
              tabIndex={0}
              onClick={() => navigateToExhibition(ex.id_exhibition)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigateToExhibition(ex.id_exhibition); }}
            >
              <div className="gallery-card__image">
                {ex.cover?.image && <img src={workImageUrl(ex.cover.image)} alt="" loading="lazy" {...protectedImage} />}
                <span className="gallery-card__count">
                  {t('gallery.worksCount', { count: ex.pieces_count })}
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
        </>
      )}

      {inviting && <InviteArtistModal onClose={() => setInviting(false)} onInvited={onInvited} />}
      {creating && <InviteArtistModal withGallery onClose={() => setCreating(false)} onInvited={onCreated} />}
    </div>
  );
}

export default GalleryPage;
