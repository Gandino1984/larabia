// magazine-front/src/components/common/ImageLightbox.jsx
//
// Full-screen image viewer in its own modal: the image as large as the screen
// allows (proportions kept) over a dark backdrop, with an optional caption.
// Closes with the X button, Escape, or a click outside the image; the page
// behind doesn't scroll while it's open. Rendered in a portal on <body>.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import './ImageLightbox.css';

function ImageLightbox({ src, alt = '', caption, onClose }) {
  const { t } = useTranslation();
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || caption}
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        className="image-lightbox__close"
        onClick={onClose}
        title={t('engagement.label.close', 'Cerrar')}
        aria-label={t('engagement.label.close', 'Cerrar')}
      >
        <X size={26} />
      </button>
      <figure className="image-lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} className="image-lightbox__img" />
        {caption && <figcaption className="image-lightbox__caption">{caption}</figcaption>}
      </figure>
    </div>,
    document.body
  );
}

export default ImageLightbox;
