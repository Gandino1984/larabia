// magazine-front/src/components/gallery/ExhibitionPage.jsx
//
// One exhibition of the Galería: its title (the artist's name when it has
// none), the artist, the short text and its obras — each with its title and
// its approved illustrations (title, «Sin título» if none; description; size
// in pixels), opened large in WorkViewer, which goes through the obra.
// «Charlar»: socios/as ask the artist to chat (the magazine's chat,
// ChatButton / ChatPanel). «Compartir», for everyone: the exhibition, an obra
// or an illustration (?exhibition=<id>[&piece=<id>|&work=<id>], opened by
// App: scrolled to that obra / that illustration opened large) — the phone's
// share sheet on touch screens, copied to the clipboard elsewhere.
// Readers with an account like obras and illustrations and comment on
// illustrations (GalleryActions, CommentsModal); the artist and super admins
// delete comments.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Images, Share2 } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useAuthor, useAuthorPhoto } from '../../app_context/AuthorContext';
import ChatButton from '../chat/ChatButton';
import CommentsModal from '../magazine/CommentsModal';
import WorkViewer from './WorkViewer';
import GalleryActions from './GalleryActions';
import {
  workImageUrl, workTitle, workSize, exhibitionTitle, pieceTitle, protectedImage,
  exhibitionLink, pieceLink, workLink, shareLink
} from './galleryUtils';
import './Gallery.css';

const flip = (x) => ({ ...x, liked: !x.liked, likes: Math.max(0, (x.likes || 0) + (x.liked ? -1 : 1)) });

function ExhibitionPage() {
  const { t } = useTranslation();
  const { galleryView, navigateToGallery, navigateToMyGallery, navigateToAuthorProfile, showSuccess, showError } = useUI();
  const { currentUser, isSuperAdmin } = useAuth();
  const photoOf = useAuthorPhoto();
  const { authorProfiles } = useAuthor();
  const [exhibition, setExhibition] = useState(null);
  const [missing, setMissing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [commentsWorkId, setCommentsWorkId] = useState(null);
  const [focusedPiece, setFocusedPiece] = useState(null);
  const id = galleryView.exhibitionId;
  const userId = currentUser?.id_user;

  useEffect(() => {
    window.scrollTo(0, 0);
    setExhibition(null);
    setMissing(false);
  }, [id]);

  // Again when someone signs in or out: the likes that are theirs.
  useEffect(() => {
    let active = true;
    axiosInstance.get(`/gallery/exhibition/${id}`, userId ? { headers: { 'x-user-id': userId } } : undefined)
      .then((res) => { if (active) setExhibition(res.data?.data || null); })
      .catch(() => { if (active) setMissing(true); });
    return () => { active = false; };
  }, [id, userId]);

  // A shared link to an obra (scrolled to, marked a moment) or an
  // illustration (opened large) — once per link.
  const focusDone = useRef(null);
  useEffect(() => {
    const { focusPiece, focusWork } = galleryView;
    if (!exhibition || (!focusPiece && !focusWork)) return;
    const key = `${exhibition.id_exhibition}:${focusPiece}:${focusWork}`;
    if (focusDone.current === key) return;
    focusDone.current = key;
    if (focusWork) {
      exhibition.pieces.forEach((p, pi) => {
        const index = p.works.findIndex((w) => w.id_work === focusWork);
        if (index >= 0) setViewing({ piece: pi, index });
      });
      return;
    }
    if (!exhibition.pieces.some((p) => p.id_piece === focusPiece)) return;
    setFocusedPiece(focusPiece);
    requestAnimationFrame(() => document.getElementById(`piece-${focusPiece}`)?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    const timer = setTimeout(() => setFocusedPiece(null), 2600);
    return () => clearTimeout(timer);
  }, [exhibition, galleryView]);

  const artist = exhibition?.artist;
  const own = currentUser && artist && currentUser.id_user === artist.id_user;
  // Their published profile in Autoras/es: the name leads to it.
  const profile = artist ? authorProfiles.find((p) => p.user_id === artist.id_user) : null;

  const share = async ({ url, title, text }) => {
    const done = await shareLink({ url, title, text, promptLabel: t('gallery.exhibition.shareCopy', 'Copia el enlace de la exposición:') });
    if (done === 'copied') showSuccess(t('hero.linkCopied', '¡Enlace copiado!'));
  };
  const shareExhibition = () => share({
    url: exhibitionLink(exhibition.id_exhibition),
    title: exhibitionTitle(exhibition),
    text: t('gallery.exhibition.shareText', { name: artist?.name_user, defaultValue: 'La galería de {{name}} en La Rabia' })
  });
  const sharePiece = (piece) => share({
    url: pieceLink(exhibition.id_exhibition, piece.id_piece),
    title: pieceTitle(piece, t),
    text: t('gallery.share.text', { title: pieceTitle(piece, t), name: artist?.name_user, defaultValue: '«{{title}}», de {{name}}, en la Galería de La Rabia' })
  });
  const shareWork = (work) => share({
    url: workLink(exhibition.id_exhibition, work.id_work),
    title: workTitle(work, t),
    text: t('gallery.share.text', { title: workTitle(work, t), name: artist?.name_user, defaultValue: '«{{title}}», de {{name}}, en la Galería de La Rabia' })
  });

  // Likes: with an account; shown at once, then as the server counts them.
  const patchPiece = (pieceId, change) => setExhibition((ex) => ({
    ...ex, pieces: ex.pieces.map((p) => (p.id_piece === pieceId ? change(p) : p))
  }));
  const patchWork = (workId, change) => setExhibition((ex) => ({
    ...ex, pieces: ex.pieces.map((p) => ({ ...p, works: p.works.map((w) => (w.id_work === workId ? change(w) : w)) }))
  }));
  const like = async (path, patch) => {
    if (!currentUser) {
      showError(t('messages.error.loginToLike', 'Inicia sesión para dar me gusta'));
      return;
    }
    patch(flip);
    try {
      const res = await axiosInstance.post(path);
      const data = res.data?.data;
      if (data) patch((x) => ({ ...x, liked: data.liked, likes: data.likes }));
    } catch (err) {
      patch(flip);
      showError(err.response?.data?.error || t('gallery.likeError', 'No se pudo guardar el me gusta'));
    }
  };
  const likePiece = (piece) => like(`/gallery/pieces/${piece.id_piece}/like`, (change) => patchPiece(piece.id_piece, change));
  const likeWork = (work) => like(`/gallery/works/${work.id_work}/like`, (change) => patchWork(work.id_work, change));

  // An illustration's comments (CommentsModal): everyone reads, accounts write,
  // the artist and super admins delete.
  const commentsWork = commentsWorkId && exhibition
    ? exhibition.pieces.flatMap((p) => p.works).find((w) => w.id_work === commentsWorkId)
    : null;
  const commentsCall = useCallback(async (request, fallback) => {
    try {
      const res = await request();
      return { data: res.data?.data ?? true };
    } catch (err) {
      const error = err.response?.data?.error || fallback;
      showError(error);
      return { error };
    }
  }, [showError]);
  const commentsSource = commentsWork && {
    key: `work-${commentsWork.id_work}`,
    load: () => commentsCall(() => axiosInstance.get(`/gallery/works/${commentsWork.id_work}/comments`), t('messages.error.loadComments', 'Error al cargar los comentarios')),
    create: (content) => commentsCall(() => axiosInstance.post(`/gallery/works/${commentsWork.id_work}/comments`, { content_comment: content }), t('messages.error.postComment', 'Error al publicar el comentario')),
    remove: (commentId) => commentsCall(() => axiosInstance.delete(`/gallery/comments/${commentId}`), t('messages.error.deleteComment', 'Error al eliminar el comentario')),
    canDelete: !!(own || isSuperAdmin),
    onCountChange: (delta) => patchWork(commentsWork.id_work, (w) => ({ ...w, comments: Math.max(0, (w.comments || 0) + delta) }))
  };

  const workActions = (work, dark = false) => (
    <GalleryActions
      item={work}
      kind="work"
      dark={dark}
      onLike={() => likeWork(work)}
      onComments={() => setCommentsWorkId(work.id_work)}
      onShare={() => shareWork(work)}
    />
  );

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
          {profile ? (
            <button
              type="button"
              className="gallery-artist__name gallery-artist__name--link"
              onClick={() => navigateToAuthorProfile(profile, { from: 'exhibition' })}
              title={t('gallery.exhibition.artistProfile', 'Ver el perfil de la artista o el artista')}
            >
              {artist?.name_user}
            </button>
          ) : (
            <span className="gallery-artist__name">{artist?.name_user}</span>
          )}
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
            <ChatButton host={artist} origin="gallery" className="gallery-btn gallery-btn--primary" />
          )}
          <button type="button" className="gallery-btn" onClick={shareExhibition} title={t('gallery.exhibition.shareTitle', 'Compartir esta exposición')}>
            <Share2 size={18} aria-hidden="true" /> {t('gallery.exhibition.share', 'Compartir')}
          </button>
        </div>
      </header>

      {exhibition.pieces.map((piece, pi) => (
        <section
          key={piece.id_piece}
          className={`exhibition-piece ${focusedPiece === piece.id_piece ? 'is-focused' : ''}`}
          aria-labelledby={`piece-${piece.id_piece}`}
        >
          <header className="exhibition-piece__head">
            <h2 id={`piece-${piece.id_piece}`}>{pieceTitle(piece, t)}</h2>
            <span>{t('gallery.illustrationsCount', { count: piece.works.length })}</span>
            <GalleryActions item={piece} kind="piece" onLike={() => likePiece(piece)} onShare={() => sharePiece(piece)} />
          </header>
          <div className="exhibition-works">
            {piece.works.map((w, i) => (
              <figure key={w.id_work} className="exhibition-work">
                <button type="button" className="exhibition-work__frame" onClick={() => setViewing({ piece: pi, index: i })} aria-label={t('gallery.viewer.open', { title: workTitle(w, t), defaultValue: 'Ver «{{title}}» en grande' })}>
                  <img
                    {...protectedImage}
                    src={workImageUrl(w.image)}
                    alt={workTitle(w, t)}
                    loading="lazy"
                    style={w.width_px && w.height_px ? { aspectRatio: `${w.width_px} / ${w.height_px}` } : undefined}
                  />
                </button>
                <figcaption>
                  <strong>{workTitle(w, t)}</strong>
                  {workSize(w, t) && <span>{workSize(w, t)}</span>}
                  {w.description_work && <p className="exhibition-work__description">{w.description_work}</p>}
                  {workActions(w)}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}

      {viewing && (
        <WorkViewer
          works={exhibition.pieces[viewing.piece].works}
          index={viewing.index}
          onIndex={(index) => setViewing((v) => ({ ...v, index }))}
          onClose={() => setViewing(null)}
          actions={(work) => workActions(work, true)}
          paused={!!commentsWork}
        />
      )}

      {/* Beside the viewer, not inside it: a click here mustn't close it. */}
      {commentsSource && (
        <CommentsModal
          source={commentsSource}
          subtitle={workTitle(commentsWork, t)}
          onClose={() => setCommentsWorkId(null)}
        />
      )}

    </div>
  );
}

export default ExhibitionPage;
