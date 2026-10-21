// magazine-front/src/components/workshops/WorkshopExtraSpot.jsx
//
// A FULL workshop's booking box: whoever may (`can_request_spot`, the
// server's rule: socios/as, or anyone signed in if the workshop is free) can
// ask its managers to open one more place. Shows the request while it's
// pending (it can be withdrawn) and says when it couldn't be opened. Anyone
// else just reads that it's full. Server: /magazine-workshop/spot-requests.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Hourglass } from 'lucide-react';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { useSubscription } from '../../app_context/SubscriptionContext';

const MESSAGE_MAX = 300;

function WorkshopExtraSpot({ workshop: w }) {
  const { t } = useTranslation();
  const { requestExtraSpot, withdrawExtraSpot } = useWorkshop();
  const subscription = useSubscription();
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const request = w.my_spot_request;
  const full = <p className="workshop-full-note">{t('workshops.fullNote')}</p>;

  if (request?.status === 'pending') {
    return (
      <div className="workshop-extra">
        <p className="workshop-extra__status">
          <Hourglass size={16} aria-hidden="true" />
          {t('workshops.extra.pending', 'Has pedido una plaza extra. Te avisaremos cuando quien gestiona el taller responda.')}
        </p>
        <button
          type="button"
          className="workshop-btn workshop-btn--decline"
          disabled={busy}
          onClick={async () => { setBusy(true); await withdrawExtraSpot(w.id_workshop); setBusy(false); }}
        >
          {t('workshops.extra.withdraw', 'Retirar la solicitud')}
        </button>
      </div>
    );
  }
  if (request?.status === 'declined') {
    return (
      <>
        {full}
        <p className="workshop-booking-note">{t('workshops.extra.declined', 'Tu solicitud de una plaza extra no se pudo aceptar.')}</p>
      </>
    );
  }
  if (!w.can_request_spot) {
    return (
      <>
        {full}
        {!w.free_workshop && !w.is_member && subscription?.canJoin && (
          <p className="workshop-booking-note">{t('workshops.extra.membersHint', 'Los socios/as de la revista pueden pedir que se abra una plaza más.')}</p>
        )}
      </>
    );
  }

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await requestExtraSpot(w.id_workshop, message.trim());
    setBusy(false);
    if (res.success) { setAsking(false); setMessage(''); }
  };

  return (
    <div className="workshop-extra">
      {full}
      <p className="workshop-booking-note">
        {t('workshops.extra.hintAny', 'Puedes pedir que se abra una plaza más. Quien gestiona el taller lo decidirá.')}
      </p>
      {asking ? (
        <form className="workshop-extra__form" onSubmit={send}>
          <label htmlFor="ws-extra-message">{t('workshops.extra.messageLabel', 'Un mensaje para quien gestiona el taller (opcional)')}</label>
          <textarea
            id="ws-extra-message"
            rows={3}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('workshops.extra.messagePlaceholder', 'Por ejemplo: vengo con mi hija, que tiene 8 años.')}
          />
          <span className="workshop-extra__count">{message.length}/{MESSAGE_MAX}</span>
          <div className="workshop-extra__actions">
            <button type="submit" className="workshop-btn workshop-btn--reserve" disabled={busy}>
              <Send size={16} aria-hidden="true" /> {busy ? t('workshops.extra.sending', 'Enviando…') : t('workshops.extra.send', 'Enviar la solicitud')}
            </button>
            <button type="button" className="workshop-btn workshop-btn--decline" onClick={() => setAsking(false)} disabled={busy}>
              {t('common.buttons.cancel', 'Cancelar')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="workshop-btn workshop-btn--reserve" onClick={() => setAsking(true)}>
          {t('workshops.extra.ask', 'Pedir una plaza extra')}
        </button>
      )}
    </div>
  );
}

export default WorkshopExtraSpot;
