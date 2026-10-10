// magazine-front/src/components/common/SubscriberMark.jsx
//
// Paid-subscriber mark on a profile photo, visible to everyone: a red ring
// around the round avatar and a small red badge with a white heart in its
// bottom-right corner. Wraps the avatar element; renders it untouched when the
// user isn't a subscriber.
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../app_context/SubscriptionContext';
import './SubscriberMark.css';

function SubscriberMark({ userId, children }) {
  const { t } = useTranslation();
  const subscription = useSubscription();
  if (!subscription?.isUserSubscriber?.(userId)) return children;
  const label = t('subscription.markTitle', 'Suscriptor/a de La Rabia');
  return (
    <span className="subscriber-avatar" title={label}>
      {children}
      <span className="subscriber-avatar__mark" role="img" aria-label={label}>
        <Heart fill="currentColor" strokeWidth={0} />
      </span>
    </span>
  );
}

export default SubscriberMark;
