// magazine-front/src/app_context/useWorkshopAccess.js
//
// Anyone sees the workshop cards; OPENING a workshop needs a signed-in
// account, and BOOKING a place is for paying subscribers (the magazine team —
// editors, admins, super admins — books without subscribing). The back-end
// enforces it; this guides the reader: sign in first, or subscribe (opens the
// plan picker with a note).
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useSubscription } from './SubscriptionContext';

export function useWorkshopAccess() {
  const { t } = useTranslation();
  const { currentUser, canCreateContent } = useAuth();
  const { navigateToLogin, showInfo } = useUI();
  const subscription = useSubscription();

  // Opening a workshop: 'allowed' | 'login'.
  const status = currentUser ? 'allowed' : 'login';
  // Booking a place: 'allowed' | 'login' | 'subscribe'. While the reader's
  // subscription is still loading we let them try — the server confirms.
  const bookingStatus = !currentUser
    ? 'login'
    : (canCreateContent || subscription?.isSubscriber || !subscription?.mineReady)
      ? 'allowed'
      : 'subscribe';

  // Guide the reader when they can't go on yet ('login' | 'subscribe'; by
  // default, opening a workshop). Returns true if allowed.
  const guard = useCallback((override) => {
    const s = override || status;
    if (s === 'allowed') return true;
    if (s === 'login') {
      showInfo(t('workshops.gate.login', 'Inicia sesión para ver los talleres y reservar plaza'));
      navigateToLogin();
      return false;
    }
    subscription?.openModal?.('workshops');
    return false;
  }, [status, showInfo, t, navigateToLogin, subscription]);

  return { status, bookingStatus, guard };
}
