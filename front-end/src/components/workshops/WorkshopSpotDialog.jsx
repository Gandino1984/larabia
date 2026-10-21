// magazine-front/src/components/workshops/WorkshopSpotDialog.jsx
//
// «Pedir una plaza» from a FULL workshop's card: a short window with an
// optional message for whoever runs it. The workshop page does the same
// inline (WorkshopExtraSpot). Who may ask is the server's call
// (`can_request_spot`: socios/as, or anyone signed in if it's free).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Send } from 'lucide-react';
import { useWorkshop } from '../../app_context/WorkshopContext';
import './WorkshopSpotDialog.css';

const MESSAGE_MAX = 300;

function WorkshopSpotDialog({ workshop, onClose }) {
  const { t } = useTranslation();
  const { requestExtraSpot } = useWorkshop();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, busy]);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await requestExtraSpot(workshop.id_workshop, message.trim());
    setBusy(false);
    if (res.success) onClose();
  };

  return createPortal(
    <div className="spot-dialog-overlay" onClick={() => !busy && onClose()}>
      <div className="spot-dialog" role="dialog" aria-modal="true" aria-labelledby="spot-dialog-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="spot-dialog__close" onClick={onClose} disabled={busy} aria-label={t('common.buttons.close', 'Cerrar')} title={t('common.buttons.close', 'Cerrar')}>
          <X size={20} />
        </button>
        <h2 id="spot-dialog-title">{t('workshops.extra.dialogTitle', { title: workshop.title_workshop, defaultValue: 'Pedir una plaza en «{{title}}»' })}</h2>
        <p className="spot-dialog__text">
          {t('workshops.extra.dialogText', 'El taller está completo. Quien lo gestiona decidirá si abre una plaza más; te avisaremos en la campana.')}
        </p>
        <form onSubmit={send} className="spot-dialog__form">
          <label htmlFor="spot-dialog-message">{t('workshops.extra.messageLabel', 'Un mensaje para quien gestiona el taller (opcional)')}</label>
          <textarea
            id="spot-dialog-message"
            rows={3}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('workshops.extra.messagePlaceholder', 'Por ejemplo: vengo con mi hija, que tiene 8 años.')}
          />
          <span className="spot-dialog__count">{message.length}/{MESSAGE_MAX}</span>
          <div className="spot-dialog__actions">
            <button type="submit" className="spot-dialog__btn spot-dialog__btn--primary" disabled={busy}>
              <Send size={16} aria-hidden="true" /> {busy ? t('workshops.extra.sending', 'Enviando…') : t('workshops.extra.send', 'Enviar la solicitud')}
            </button>
            <button type="button" className="spot-dialog__btn" onClick={onClose} disabled={busy}>
              {t('common.buttons.cancel', 'Cancelar')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default WorkshopSpotDialog;
