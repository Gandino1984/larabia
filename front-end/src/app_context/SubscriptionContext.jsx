// magazine-front/src/app_context/SubscriptionContext.jsx
//
// Paid reader subscriptions (Stripe). Knows whether the feature is on (the
// back-end reports it once Stripe is configured), the plan prices, the
// signed-in reader's own subscription, and which users subscribe (to mark
// their profile photos). Starts Stripe Checkout / the customer portal (both
// Stripe-hosted: card data never touches our site) and handles the return from
// Checkout (?subscription=success|cancel).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useTranslation } from 'react-i18next';

const SubscriptionContext = createContext(null);

// Read once at load, before anything cleans the URL.
const initialCheckoutResult = (() => {
  try {
    return new URLSearchParams(window.location.search).get('subscription');
  } catch {
    return null;
  }
})();

export const SubscriptionProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showError } = useUI();
  const [config, setConfig] = useState({ enabled: false, prices: {} });
  const [mine, setMine] = useState(null);
  const [subscriberIds, setSubscriberIds] = useState(() => new Set());
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  // 'success' | 'cancel' after returning from Checkout. Its notice is shown by
  // SubscribeButton once the page has finished loading (then marked done).
  const [checkoutResult] = useState(initialCheckoutResult);
  const [checkoutNoticeDone, setCheckoutNoticeDone] = useState(false);
  const userId = currentUser?.id_user || null;

  useEffect(() => {
    axiosInstance.get('/subscription/config')
      .then((res) => setConfig(res.data?.data || { enabled: false, prices: {} }))
      .catch(() => setConfig({ enabled: false, prices: {} }));
  }, []);

  const loadSubscribers = useCallback(() => {
    axiosInstance.get('/subscription/subscribers')
      .then((res) => setSubscriberIds(new Set((res.data?.data || []).map(Number))))
      .catch(() => {});
  }, []);
  useEffect(() => { loadSubscribers(); }, [loadSubscribers]);

  // The signed-in reader's own subscription. Returns it (null when none).
  const fetchMine = useCallback(async (uid) => {
    if (!uid) return null;
    try {
      const res = await axiosInstance.get('/subscription/me', { headers: { 'x-user-id': uid } });
      return res.data?.data || null;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchMine(userId);
    setMine(data);
    return data;
  }, [fetchMine, userId]);

  // Load it whenever the signed-in user changes (and clear it on logout).
  useEffect(() => {
    if (!userId) { setMine(null); return undefined; }
    let cancelled = false;
    fetchMine(userId).then((data) => { if (!cancelled) setMine(data); });
    return () => { cancelled = true; };
  }, [userId, fetchMine]);

  // Back from a successful Checkout: Stripe's webhook may land a moment after
  // the redirect, so check again a few times until the subscription is active.
  useEffect(() => {
    if (checkoutResult !== 'success' || !userId) return undefined;
    let cancelled = false;
    let attempt = 0;
    const tick = async () => {
      if (cancelled) return;
      const data = await fetchMine(userId);
      if (cancelled) return;
      setMine(data);
      if (data?.active) { loadSubscribers(); return; }
      attempt += 1;
      if (attempt < 10) setTimeout(tick, 2000);
    };
    tick();
    return () => { cancelled = true; };
  }, [checkoutResult, userId, fetchMine, loadSubscribers]);

  // Clean ?subscription=… from the address bar.
  useEffect(() => {
    if (!initialCheckoutResult) return;
    const params = new URLSearchParams(window.location.search);
    params.delete('subscription');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, []);

  const startCheckout = useCallback(async (plan) => {
    if (!userId) return;
    setBusy(true);
    try {
      const res = await axiosInstance.post('/subscription/checkout', { plan }, { headers: { 'x-user-id': userId } });
      const url = res.data?.data?.url;
      if (url) window.location.assign(url);
      else showError(res.data?.error || t('subscription.error', 'No se pudo iniciar el pago'));
    } catch (err) {
      showError(err.response?.data?.error || t('subscription.error', 'No se pudo iniciar el pago'));
    } finally {
      setBusy(false);
    }
  }, [userId, showError, t]);

  const openPortal = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const res = await axiosInstance.post('/subscription/portal', {}, { headers: { 'x-user-id': userId } });
      const url = res.data?.data?.url;
      if (url) window.location.assign(url);
    } catch (err) {
      showError(err.response?.data?.error || t('subscription.portalError', 'No se pudo abrir la gestión de la suscripción'));
    } finally {
      setBusy(false);
    }
  }, [userId, showError, t]);

  // Is this user a paying subscriber? (profile-photo mark)
  const isUserSubscriber = useCallback(
    (id) => (id != null && subscriberIds.has(Number(id))) || (!!mine?.active && Number(id) === Number(userId)),
    [subscriberIds, mine?.active, userId]
  );

  const value = {
    enabled: !!config.enabled,
    prices: config.prices || {},
    isSubscriber: !!mine?.active,
    mine,
    refresh,
    busy,
    startCheckout,
    openPortal,
    isUserSubscriber,
    checkoutNotice: checkoutNoticeDone ? null : checkoutResult,
    markCheckoutNoticeShown: useCallback(() => setCheckoutNoticeDone(true), []),
    showModal,
    openModal: useCallback(() => setShowModal(true), []),
    closeModal: useCallback(() => setShowModal(false), [])
  };
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => useContext(SubscriptionContext);
