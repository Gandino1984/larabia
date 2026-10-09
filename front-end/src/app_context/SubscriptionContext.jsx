// magazine-front/src/app_context/SubscriptionContext.jsx
//
// Paid reader subscriptions (Stripe). Knows whether the feature is on (the
// back-end reports it once Stripe is configured), the plan prices, and the
// signed-in reader's own subscription. Starts Stripe Checkout / the customer
// portal (both are Stripe-hosted pages: card data never touches our site) and
// handles the return from Checkout (?subscription=success|cancel).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showInfo, showError } = useUI();
  const [config, setConfig] = useState({ enabled: false, prices: {} });
  const [mine, setMine] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axiosInstance.get('/subscription/config')
      .then((res) => setConfig(res.data?.data || { enabled: false, prices: {} }))
      .catch(() => setConfig({ enabled: false, prices: {} }));
  }, []);

  const refresh = useCallback(async () => {
    if (!currentUser?.id_user) { setMine(null); return; }
    try {
      const res = await axiosInstance.get('/subscription/me', { headers: { 'x-user-id': currentUser.id_user } });
      setMine(res.data?.data || null);
    } catch {
      setMine(null);
    }
  }, [currentUser?.id_user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Back from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('subscription');
    if (!result) return;
    if (result === 'success') {
      showSuccess(t('subscription.thanks', '¡Gracias por suscribirte a La Rabia!'));
      // The webhook may land a moment after the redirect.
      refresh();
      setTimeout(refresh, 4000);
    } else if (result === 'cancel') {
      showInfo(t('subscription.cancelled', 'Pago cancelado. Puedes suscribirte cuando quieras.'));
    }
    params.delete('subscription');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCheckout = useCallback(async (plan) => {
    if (!currentUser?.id_user) return;
    setBusy(true);
    try {
      const res = await axiosInstance.post('/subscription/checkout', { plan }, { headers: { 'x-user-id': currentUser.id_user } });
      const url = res.data?.data?.url;
      if (url) window.location.assign(url);
      else showError(res.data?.error || t('subscription.error', 'No se pudo iniciar el pago'));
    } catch (err) {
      showError(err.response?.data?.error || t('subscription.error', 'No se pudo iniciar el pago'));
    } finally {
      setBusy(false);
    }
  }, [currentUser?.id_user, showError, t]);

  const openPortal = useCallback(async () => {
    if (!currentUser?.id_user) return;
    setBusy(true);
    try {
      const res = await axiosInstance.post('/subscription/portal', {}, { headers: { 'x-user-id': currentUser.id_user } });
      const url = res.data?.data?.url;
      if (url) window.location.assign(url);
    } catch (err) {
      showError(err.response?.data?.error || t('subscription.portalError', 'No se pudo abrir la gestión de la suscripción'));
    } finally {
      setBusy(false);
    }
  }, [currentUser?.id_user, showError, t]);

  const value = {
    enabled: !!config.enabled,
    prices: config.prices || {},
    isSubscriber: !!mine?.active,
    mine,
    refresh,
    busy,
    startCheckout,
    openPortal,
    showModal,
    openModal: useCallback(() => setShowModal(true), []),
    closeModal: useCallback(() => setShowModal(false), [])
  };
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => useContext(SubscriptionContext);
