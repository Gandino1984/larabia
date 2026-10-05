// magazine-front/src/components/admin/RecommendationsModal.jsx
//
// "Recomendaciones" (admins + super admins): pick published articles and send
// them as recommendations to the newsletter subscribers. Opened from the
// header's "Más" menu; wraps NewsletterTab (which used to be a tab of the
// publication creator). Closes with the X, Escape or a click outside.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import NewsletterTab from './NewsletterTab';
import './RecommendationsModal.css';

function RecommendationsModal({ onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="recommendations-modal-overlay" onClick={onClose}>
      <div
        className="recommendations-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendations-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="recommendations-modal__header">
          <h2 id="recommendations-modal-title">
            {t('recommendations.title', 'Envía tus recomendaciones')}
          </h2>
          <button
            type="button"
            className="recommendations-modal__close"
            onClick={onClose}
            title={t('engagement.label.close', 'Cerrar')}
            aria-label={t('engagement.label.close', 'Cerrar')}
          >
            <X size={22} />
          </button>
        </div>
        <div className="recommendations-modal__body">
          <NewsletterTab />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default RecommendationsModal;
