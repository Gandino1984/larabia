// magazine-front/src/app_context/useWorkshopAccess.js
//
// Anyone can browse workshops; BOOKING a place is for paying subscribers (the
// magazine team — editors, admins, super admins — books without subscribing).
// The back-end enforces it; this guides the reader when they try to book:
// sign in first, or subscribe (opens the plan picker with a note).
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

  // 'allowed' | 'login' | 'subscribe'. While the reader's subscription is still
  // loading we let them through — the page confirms with the server.
  const status = !currentUser
    ? 'login'
    : (canCreateContent || subscription?.isSubscriber || !subscription?.mineReady)
      ? 'allowed'
      : 'subscribe';

  // Guide the reader when they can't enter yet. Returns true if allowed.
  const guard = useCallback((override) => {
    const s = override || status;
    if (s === 'allowed') return true;
    if (s === 'login') {
      showInfo(t('workshops.gate.login', 'Inicia sesión para reservar plaza en los talleres'));
      navigateToLogin();
      return false;
    }
    subscription?.openModal?.('workshops');
    return false;
  }, [status, showInfo, t, navigateToLogin, subscription]);

  return { status, guard };
}
