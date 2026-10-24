// magazine-front/src/components/gallery/ExhibitionPage.jsx
//
// One exhibition of the Galería: its title (the artist's name when it has
// none), the artist, the short text and the approved works — each with its
// title («Sin título») and size in pixels, opened large in a viewer. Anyone
// with an account can write to the artist (GalleryChat, in a side panel);
// signed out, writing asks to sign in first.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, X, Images } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useAuthorPhoto } from '../../app_context/AuthorContext';
import GalleryChat from './GalleryChat';
import { workImageUrl, workTitle, workSize, exhibitionTitle } from './galleryUtils';
import './Gallery.css';

function WorkViewer({ works, index, onIndex, onClose }) {
  const { t } = useTranslation();
  const work = works[index];
  const go = useCallback((d) => onIndex((index + d + works.length) % works.length), [index, works.length, onIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  return createPortal(
    <div className="work-viewer" role="dialog" aria-modal="true" aria-label={workTitle(work, t)} onClick={onClose}>
      <button type="button" className="work-viewer__close" onClick={onClose} aria-label={t('common.buttons.close', 'Cerrar')} title={t('common.buttons.close', 'Cerrar')}>
        <X size={24} />
      </button>
      <figure className="work-viewer__figure" onClick={(e) => e.stopPropagation()}>
        <img src={workImageUrl(work.image)} alt={workTitle(work, t)} />
        <figcaption>
          <strong>{workTitle(work, t)}</strong>
          {workSize(work, t) && <span>{workSize(work, t)}</span>}
          <span className="work-viewer__count">{index + 1} / {works.length}</span>
        </figcaption>
      </figure>
      {works.length > 1 && (
        <>
          <button type="button" className="work-viewer__nav work-viewer__nav--prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label={t('gallery.viewer.prev', 'Obra anterior')}>
            <ChevronLeft size={28} />
          </button>
          <button type="button" className="work-viewer__nav work-viewer__nav--next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label={t('gallery.viewer.next', 'Obra siguiente')}>
            <ChevronRight size={28} />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

function ExhibitionPage() {
  const { t } = useTranslation();
  const { galleryView, navigateToGallery, navigateToMyGallery, navigateToLogin, showInfo } = useUI();
  const { currentUser } = useAuth();
  const photoOf = useAuthorPhoto();
  const [exhibition, setExhibition] = useState(null);
  const [missing, setMissing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [chatOpen, setChatOpen] = useState(!!galleryView.chat);
  const [conversationId, setConversationId] = useState(null);
  const id = galleryView.exhibitionId;

  useEffect(() => {
    window.scrollTo(0, 0);
    setExhibition(null);
    setMissing(false);
    axiosInstance.get(`/gallery/exhibition/${id}`)
      .then((res) => setExhibition(res.data?.data || null))
      .catch(() => setMissing(true));
  }, [id]);

  const artist = exhibition?.artist;
  const own = currentUser && artist && currentUser.id_user === artist.id_user;

  // An existing conversation with this artist opens where it left off.
  useEffect(() => {
    if (!chatOpen || !currentUser || !artist || own) return;
    axiosInstance.get('/gallery/conversations', { headers: { 'x-user-id': currentUser.id_user } })
      .then((res) => {
        const c = (res.data?.data || []).find((x) => x.role === 'visitor' && x.other?.id_user === artist.id_user);
        setConversationId(c?.id_conversation || null);
      })
      .catch(() => {});
  }, [chatOpen, currentUser, artist, own]);

  const openChat = () => {
    if (!currentUser) {
      showInfo(t('gallery.chat.loginRequired', 'Inicia sesión para escribir a la o el artista'));
      navigateToLogin();
      return;
    }
    setChatOpen(true);
  };

  if (missing) {
    return (
      <div className="gallery-page">
        <button type="button" className="gallery-back" onClick={navigateToGallery}><ArrowLeft size={18} /> {t('gallery.back', 'Volver a la galería')}</button>
        <p className="gallery-page__empty">{t('gallery.exhibition.missing', 'Esta exposición no existe o ya no está en la galería.')}</p>
      </div>
    );
  }
  if (!exhibition) return <div className="gallery-page"><p className="gallery-page__empty">{t('common.states.loading', 'Cargando…')}</p></div>;

  return (
    <div className="gallery-page exhibition-page">
      <button type="button" className="gallery-back" onClick={navigateToGallery}>
        <ArrowLeft size={18} aria-hidden="true" /> {t('gallery.back', 'Volver a la galería')}
      </button>

      <header className="exhibition-page__header">
        <h1>{exhibitionTitle(exhibition)}</h1>
        <span className="gallery-artist gallery-artist--large">
          {photoOf(artist)
            ? <img src={photoOf(artist)} alt="" className="gallery-artist__photo" />
            : <span className="gallery-artist__photo gallery-artist__photo--initial" aria-hidden="true">{artist?.name_user?.charAt(0)?.toUpperCase()}</span>}
          <span className="gallery-artist__name">{artist?.name_user}</span>
        </span>
        {exhibition.statement && (
          <div className="exhibition-page__statement">
            {exhibition.statement.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
        <div className="exhibition-page__actions">
          {own ? (
            <button type="button" className="gallery-btn" onClick={() => navigateToMyGallery()}>
              <Images size={18} aria-hidden="true" /> {t('gallery.exhibition.yours', 'Es tu exposición: editarla en «Mi galería»')}
            </button>
          ) : (
            <button type="button" className="gallery-btn gallery-btn--primary" onClick={openChat}>
              <MessageCircle size={18} aria-hidden="true" />
              {t('gallery.exhibition.write', { name: artist?.name_user, defaultValue: 'Escribir a {{name}}' })}
            </button>
          )}
        </div>
      </header>

      <div className="exhibition-works">
        {exhibition.works.map((w, i) => (
          <figure key={w.id_work} className="exhibition-work">
            <button type="button" className="exhibition-work__frame" onClick={() => setViewing(i)} aria-label={t('gallery.viewer.open', { title: workTitle(w, t), defaultValue: 'Ver «{{title}}» en grande' })}>
              <img
                src={workImageUrl(w.image)}
                alt={workTitle(w, t)}
                loading="lazy"
                style={w.width_px && w.height_px ? { aspectRatio: `${w.width_px} / ${w.height_px}` } : undefined}
              />
            </button>
            <figcaption>
              <strong>{workTitle(w, t)}</strong>
              {workSize(w, t) && <span>{workSize(w, t)}</span>}
            </figcaption>
          </figure>
        ))}
      </div>

      {viewing !== null && (
        <WorkViewer works={exhibition.works} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
      )}

      {chatOpen && currentUser && !own && createPortal(
        <div className="gallery-chat-panel" role="dialog" aria-modal="false" aria-label={t('gallery.exhibition.write', { name: artist?.name_user, defaultValue: 'Escribir a {{name}}' })}>
          <div className="gallery-chat-panel__head">
            <span className="gallery-artist">
              {photoOf(artist)
                ? <img src={photoOf(artist)} alt="" className="gallery-artist__photo" />
                : <span className="gallery-artist__photo gallery-artist__photo--initial" aria-hidden="true">{artist?.name_user?.charAt(0)?.toUpperCase()}</span>}
              <span className="gallery-artist__name">{artist?.name_user}</span>
            </span>
            <button type="button" className="gallery-chat-panel__close" onClick={() => setChatOpen(false)} aria-label={t('common.buttons.close', 'Cerrar')} title={t('common.buttons.close', 'Cerrar')}>
              <X size={20} />
            </button>
          </div>
          <GalleryChat
            conversationId={conversationId}
            exhibitionId={exhibition.id_exhibition}
            other={artist}
            onStarted={setConversationId}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

export default ExhibitionPage;
