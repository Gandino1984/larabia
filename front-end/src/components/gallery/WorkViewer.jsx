// magazine-front/src/components/gallery/WorkViewer.jsx
//
// An illustration of the Galería, large: its image, title («Sin título»),
// size in pixels and description, with the others of the list — its obra —
// (arrows, ← →) and a close button (✕, Esc, or a click outside the picture). Used by the exhibitions and by
// Admin › Galería when reviewing.
import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { workImageUrl, workTitle, workSize, protectedImage } from './galleryUtils';
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
        <img src={workImageUrl(work.image)} alt={workTitle(work, t)} {...protectedImage} />
        <figcaption>
          <strong>{workTitle(work, t)}</strong>
          {workSize(work, t) && <span>{workSize(work, t)}</span>}
          <span className="work-viewer__count">{index + 1} / {works.length}</span>
          {work.description_work && <p className="work-viewer__description">{work.description_work}</p>}
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

export default WorkViewer;
