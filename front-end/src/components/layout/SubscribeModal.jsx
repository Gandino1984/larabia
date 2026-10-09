// magazine-front/src/components/layout/SubscribeModal.jsx
//
// Plan picker for the paid subscription: monthly / yearly (prices from
// Stripe), then "Continuar al pago" sends the reader to Stripe Checkout.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Heart, Lock, Check } from 'lucide-react';
import { useSubscription } from '../../app_context/SubscriptionContext';
import './SubscribeButton.css';

function SubscribeModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const { prices, startCheckout, busy } = useSubscription();
  const plans = ['monthly', 'yearly'].filter((p) => prices[p]);
  const [plan, setPlan] = useState(plans.includes('yearly') ? 'yearly' : plans[0]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const money = (p) => new Intl.NumberFormat(i18n.language || 'es', {
    style: 'currency',
    currency: (p.currency || 'eur').toUpperCase(),
    minimumFractionDigits: p.amount % 100 === 0 ? 0 : 2
  }).format(p.amount / 100);

  // Yearly saving vs. twelve monthly payments (when both exist).
  const saving = prices.monthly && prices.yearly
    ? Math.round((1 - prices.yearly.amount / (prices.monthly.amount * 12)) * 100)
    : 0;

  const PLAN_TEXT = {
    monthly: { title: t('subscription.monthly', 'Mensual'), per: t('subscription.perMonth', '/mes') },
    yearly: { title: t('subscription.yearly', 'Anual'), per: t('subscription.perYear', '/año') }
  };

  return createPortal(
    <div className="subscribe-modal-overlay" onClick={onClose}>
      <div
        className="subscribe-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="subscribe-modal__close"
          onClick={onClose}
          title={t('engagement.label.close', 'Cerrar')}
          aria-label={t('engagement.label.close', 'Cerrar')}
        >
          <X size={22} />
        </button>

        <span className="subscribe-modal__icon" aria-hidden="true"><Heart size={28} /></span>
        <h2 id="subscribe-modal-title">{t('subscription.title', 'Suscríbete a La Rabia')}</h2>
        <p className="subscribe-modal__lead">
          {t('subscription.lead', 'La Rabia se sostiene gracias a sus lectoras y lectores. Con tu suscripción apoyas el periodismo independiente y la creación de la revista, y luces la insignia de suscriptor/a en tu perfil.')}
        </p>

        <div className="subscribe-plans" role="radiogroup" aria-label={t('subscription.choosePlan', 'Elige tu plan')}>
          {plans.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={plan === p}
              className={`subscribe-plan ${plan === p ? 'is-selected' : ''}`}
              onClick={() => setPlan(p)}
            >
              <span className="subscribe-plan__check" aria-hidden="true">{plan === p && <Check size={14} />}</span>
              <span className="subscribe-plan__title">{PLAN_TEXT[p].title}</span>
              <span className="subscribe-plan__price">
                {money(prices[p])}<small>{PLAN_TEXT[p].per}</small>
              </span>
              {p === 'yearly' && saving > 0 && (
                <span className="subscribe-plan__saving">
                  {t('subscription.saving', { percent: saving, defaultValue: 'Ahorras un {{percent}}%' })}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="subscribe-modal__cta"
          onClick={() => startCheckout(plan)}
          disabled={!plan || busy}
        >
          {busy ? t('subscription.redirecting', 'Abriendo el pago…') : t('subscription.continue', 'Continuar al pago')}
        </button>
        <p className="subscribe-modal__note">
          <Lock size={14} />
          {t('subscription.secure', 'Pago seguro con Stripe. Puedes cancelar cuando quieras.')}
        </p>
      </div>
    </div>,
    document.body
  );
}

export default SubscribeModal;
