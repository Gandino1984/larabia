// magazine-front/src/components/workshops/CreateWorkshopModal.jsx
//
// "Crear taller" window on the workshops page (editors, admins, super
// admins): the same WorkshopForm as Admin → Talleres. Closes with the X,
// Escape or a click outside; closes itself after saving.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import WorkshopForm from './WorkshopForm';
import './CreateWorkshopModal.css';

function CreateWorkshopModal({ onClose, onSaved }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="create-workshop-overlay" onClick={onClose}>
      <div
        className="create-workshop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-workshop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-workshop-modal__header">
          <h2 id="create-workshop-title">{t('workshops.create', 'Crear taller')}</h2>
          <button
            type="button"
            className="create-workshop-modal__close"
            onClick={onClose}
            title={t('engagement.label.close', 'Cerrar')}
            aria-label={t('engagement.label.close', 'Cerrar')}
          >
            <X size={22} />
          </button>
        </div>
        <div className="create-workshop-modal__body">
          <WorkshopForm onSaved={(w) => { onSaved?.(w); onClose(); }} onCancel={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CreateWorkshopModal;
