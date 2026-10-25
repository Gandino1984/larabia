// magazine-front/src/components/gallery/ExhibitionPage.jsx
//
// One exhibition of the Galería: its title (the artist's name when it has
// none), the artist, the short text and its obras — each with its title and
// its approved illustrations (title, «Sin título» if none; description; size
// in pixels), opened large in WorkViewer, which goes through the obra.
// «Charlar»: socios/as ask the artist to chat (the magazine's chat,
// ChatButton / ChatPanel).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Images } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useAuthorPhoto } from '../../app_context/AuthorContext';
import ChatButton from '../chat/ChatButton';
import WorkViewer from './WorkViewer';
import { workImageUrl, workTitle, workSize, exhibitionTitle, pieceTitle, protectedImage } from './galleryUtils';
import './Gallery.css';

function ExhibitionPage() {
  const { t } = useTranslation();
  const { galleryView, navigateToGallery, navigateToMyGallery } = useUI();
  const { currentUser } = useAuth();
  const photoOf = useAuthorPhoto();
  const [exhibition, setExhibition] = useState(null);
  const [missing, setMissing] = useState(false);
  const [viewing, setViewing] = useState(null);
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
            <ChatButton host={artist} origin="gallery" className="gallery-btn gallery-btn--primary" />
          )}
        </div>
      </header>

      {exhibition.pieces.map((piece, pi) => (
        <section key={piece.id_piece} className="exhibition-piece" aria-labelledby={`piece-${piece.id_piece}`}>
          <header className="exhibition-piece__head">
            <h2 id={`piece-${piece.id_piece}`}>{pieceTitle(piece, t)}</h2>
            <span>{t('gallery.illustrationsCount', { count: piece.works.length })}</span>
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
        />
      )}

    </div>
  );
}

export default ExhibitionPage;
