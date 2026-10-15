// magazine-front/src/components/notifications/CardCloseButton.jsx
//
// The ✕ of the notification cards: closes the card right away (they also
// close by themselves after a few seconds, or swiped to the right).
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const CardCloseButton = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="card-close-button"
      onClick={onClose}
      // Not the start of a swipe on the card.
      onPointerDown={(e) => e.stopPropagation()}
      title={t('common.buttons.close', 'Cerrar')}
      aria-label={t('common.buttons.close', 'Cerrar')}
    >
      <X size={20} />
    </button>
  );
};

export default CardCloseButton;
