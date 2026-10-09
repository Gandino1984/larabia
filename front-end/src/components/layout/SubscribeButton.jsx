// magazine-front/src/components/layout/SubscribeButton.jsx
//
// "Suscríbete": a red button flanking the header bar on the LEFT (mirror of
// the "Publica" button on the right). Opens the plan picker (SubscribeModal);
// readers who aren't signed in are sent to log in first. Hidden while Stripe
// isn't configured, for readers who already subscribe, and wherever the header
// is hidden (editor, article reader).
import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
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
  const { currentUser } = useAuth();
  const { navigateToLogin, showInfo, showEditor, showArticleDetail } = useUI();
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

  if (!subscription?.enabled || subscription.isSubscriber) return null;

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
        <Heart size={24} />
        <span className="subscribe-btn__text">{label}</span>
      </button>
      {subscription.showModal && <SubscribeModal onClose={subscription.closeModal} />}
    </>
  );
}

export default SubscribeButton;
