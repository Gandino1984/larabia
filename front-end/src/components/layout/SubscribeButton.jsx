// magazine-front/src/components/layout/SubscribeButton.jsx
//
// "Suscríbete": a red button flanking the header bar on the LEFT (mirror of
// the "Publica" button on the right). Opens the plan picker (SubscribeModal);
// readers who aren't signed in are sent to log in first. Hidden for readers
// who already subscribe and wherever the header is hidden (editor, article
// reader). While Stripe isn't configured only super admins see it (preview).
import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useSubscription } from '../../app_context/SubscriptionContext';
import SubscribeModal from './SubscribeModal';
import './SubscribeButton.css';

// Slide in once per session, after the header entrance.
let slideInPlayed = false;

function SubscribeButton({ ready = true }) {
  const { t } = useTranslation();
  const { currentUser, isSuperAdmin } = useAuth();
  const { navigateToLogin, showInfo, showSuccess, showEditor, showArticleDetail } = useUI();
  const subscription = useSubscription();
  const [isIn, setIsIn] = useState(slideInPlayed);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!ready || slideInPlayed) return undefined;
    timerRef.current = setTimeout(() => {
      slideInPlayed = true;
      setIsIn(true);
    }, 950);
    return () => clearTimeout(timerRef.current);
  }, [ready]);

  // Back from Stripe Checkout: the thank-you / cancelled notice, once the page
  // has finished loading (so it isn't shown behind the loading screen).
  const notice = subscription?.checkoutNotice;
  const markNoticeShown = subscription?.markCheckoutNoticeShown;
  useEffect(() => {
    if (!ready || !notice) return undefined;
    const timer = setTimeout(() => {
      if (notice === 'success') showSuccess(t('subscription.thanks', '¡Gracias por suscribirte a La Rabia!'));
      else if (notice === 'cancel') showInfo(t('subscription.cancelled', 'Pago cancelado. Puedes suscribirte cuando quieras.'));
      markNoticeShown?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [ready, notice, markNoticeShown, showSuccess, showInfo, t]);

  // The plan picker can also be opened from elsewhere (e.g. the Talleres
  // check), so it renders even while the button itself is hidden.
  const modal = subscription?.showModal ? <SubscribeModal onClose={subscription.closeModal} /> : null;
  if (!subscription || subscription.isSubscriber) return modal;
  if (!subscription.enabled && !isSuperAdmin) return modal;

  const isHidden = showEditor || showArticleDetail;
  const label = t('subscription.button', 'Suscríbete');

  const handleClick = () => {
    if (!currentUser) {
      showInfo(t('subscription.loginFirst', 'Inicia sesión para suscribirte a la revista'));
      navigateToLogin();
      return;
    }
    subscription.openModal();
  };

  return (
    <>
      <button
        type="button"
        className={`subscribe-btn ${isIn ? 'is-in' : ''} ${isHidden ? 'hidden' : ''}`}
        onClick={handleClick}
        title={label}
        aria-label={label}
      >
        <Flame size={26} />
        <span className="subscribe-btn__text">{label}</span>
      </button>
      {modal}
    </>
  );
}

export default SubscribeButton;
