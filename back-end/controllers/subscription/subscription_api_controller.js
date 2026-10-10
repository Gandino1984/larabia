// back-end/controllers/subscription/subscription_api_controller.js
//
// Paid reader subscriptions with Stripe (monthly / yearly). Payment happens on
// Stripe's hosted Checkout page — card data never touches this server. Stripe
// reports every change (created, renewed, cancelled, payment failed) through
// the webhook, which keeps `reader_subscriptions` in sync.
//
// Configuration (.env):
//   STRIPE_SECRET_KEY       sk_test_… / sk_live_…
//   STRIPE_WEBHOOK_SECRET   whsec_… (from the webhook endpoint in Stripe)
//   STRIPE_PRICE_MONTHLY    price_… (recurring monthly price)
//   STRIPE_PRICE_YEARLY     price_… (recurring yearly price)
//   FRONTEND_URL            where Stripe sends the reader back
// Until STRIPE_SECRET_KEY and at least one price are set, the feature reports
// itself as disabled and the front-end hides the subscribe button.
import Stripe from 'stripe';
import { getRequestUser } from '../../utils/authHelper.js';
import reader_subscription_model, { ACTIVE_STATUSES } from '../../models/reader_subscription_model.js';

const PLANS = {
    monthly: process.env.STRIPE_PRICE_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_YEARLY || ''
};
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const frontendUrl = () => (process.env.FRONTEND_URL || 'https://larabiamag.com').split(',')[0].trim().replace(/\/$/, '');

const isEnabled = () => !!stripe && (!!PLANS.monthly || !!PLANS.yearly);
const planForPrice = (priceId) => Object.keys(PLANS).find((k) => PLANS[k] && PLANS[k] === priceId) || null;

// Price amounts are read from Stripe once and cached (they rarely change).
let pricesCache = null;
let pricesCachedAt = 0;
async function getPrices() {
    if (pricesCache && Date.now() - pricesCachedAt < 10 * 60 * 1000) return pricesCache;
    const result = {};
    for (const [plan, priceId] of Object.entries(PLANS)) {
        if (!priceId) continue;
        const price = await stripe.prices.retrieve(priceId);
        result[plan] = {
            amount: price.unit_amount,      // in cents
            currency: price.currency,
            interval: price.recurring?.interval || null
        };
    }
    pricesCache = result;
    pricesCachedAt = Date.now();
    return result;
}

const isActive = (row) => !!row && ACTIVE_STATUSES.includes(row.status);
const serialize = (row) => ({
    active: isActive(row),
    status: row?.status || null,
    plan: row?.plan || null,
    current_period_end: row?.current_period_end || null,
    cancel_at_period_end: !!row?.cancel_at_period_end,
    since: row?.created_at || null
});

// Copy a Stripe subscription onto the user's row.
async function syncSubscription(sub, userIdHint) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    const userId = Number(sub.metadata?.user_id || userIdHint) || null;
    let row = userId
        ? await reader_subscription_model.findOne({ where: { user_id: userId } })
        : null;
    if (!row && customerId) row = await reader_subscription_model.findOne({ where: { stripe_customer_id: customerId } });
    if (!row && !userId) {
        console.warn('[subscription] webhook for an unknown customer:', customerId);
        return;
    }
    const item = sub.items?.data?.[0];
    const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;
    const values = {
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        status: sub.status,
        plan: planForPrice(item?.price?.id) || row?.plan || null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000) : null,
        cancel_at_period_end: !!sub.cancel_at_period_end
    };
    if (row) await row.update(values);
    else await reader_subscription_model.create({ user_id: userId, ...values });
    subscribersCache = null;
}

// GET /subscription/config — is it on, and the plan prices.
async function getConfig(req, res) {
    if (!isEnabled()) return res.json({ error: null, data: { enabled: false } });
    try {
        res.json({ error: null, data: { enabled: true, prices: await getPrices() } });
    } catch (err) {
        console.error('[subscription] config error:', err.message);
        res.json({ error: null, data: { enabled: false } });
    }
}

// GET /subscription/me — the caller's subscription.
async function getMine(req, res) {
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
    const row = await reader_subscription_model.findOne({ where: { user_id: user.id_user } });
    res.json({ error: null, data: serialize(row) });
}

// GET /subscription/status/:userId — public: is this user a subscriber (badge).
async function getStatus(req, res) {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Usuario no válido' });
    const row = await reader_subscription_model.findOne({ where: { user_id: userId } });
    res.json({ error: null, data: { active: isActive(row) } });
}

// GET /subscription/subscribers — public: ids of the users with an active
// subscription (to mark their profile photos). Briefly cached.
let subscribersCache = null;
let subscribersCachedAt = 0;
async function getSubscribers(req, res) {
    try {
        if (!subscribersCache || Date.now() - subscribersCachedAt > 60 * 1000) {
            const rows = await reader_subscription_model.findAll({
                where: { status: ACTIVE_STATUSES },
                attributes: ['user_id']
            });
            subscribersCache = rows.map((r) => r.user_id);
            subscribersCachedAt = Date.now();
        }
        res.json({ error: null, data: subscribersCache });
    } catch (err) {
        console.error('[subscription] subscribers error:', err.message);
        res.json({ error: null, data: [] });
    }
}

// POST /subscription/checkout { plan } — start Stripe Checkout; returns its URL.
async function createCheckout(req, res) {
    if (!isEnabled()) return res.status(503).json({ error: 'Las suscripciones no están disponibles todavía' });
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Inicia sesión para suscribirte' });
    const plan = req.body?.plan;
    const priceId = PLANS[plan];
    if (!priceId) return res.status(400).json({ error: 'Plan no válido' });

    try {
        let row = await reader_subscription_model.findOne({ where: { user_id: user.id_user } });
        if (isActive(row)) return res.status(409).json({ error: 'Ya tienes una suscripción activa' });

        // One Stripe customer per user, reused across checkouts.
        let customerId = row?.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email_user || undefined,
                name: user.name_user || undefined,
                metadata: { user_id: String(user.id_user) }
            });
            customerId = customer.id;
            if (row) await row.update({ stripe_customer_id: customerId });
            else row = await reader_subscription_model.create({ user_id: user.id_user, stripe_customer_id: customerId });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            client_reference_id: String(user.id_user),
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: { metadata: { user_id: String(user.id_user), plan } },
            allow_promotion_codes: true,
            success_url: `${frontendUrl()}/?subscription=success`,
            cancel_url: `${frontendUrl()}/?subscription=cancel`
        });
        res.json({ error: null, data: { url: session.url } });
    } catch (err) {
        console.error('[subscription] checkout error:', err.message);
        res.status(500).json({ error: 'No se pudo iniciar el pago. Inténtalo de nuevo.' });
    }
}

// POST /subscription/portal — Stripe's customer portal (change card, cancel).
async function createPortal(req, res) {
    if (!stripe) return res.status(503).json({ error: 'Las suscripciones no están disponibles todavía' });
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
    const row = await reader_subscription_model.findOne({ where: { user_id: user.id_user } });
    if (!row?.stripe_customer_id) return res.status(404).json({ error: 'No tienes ninguna suscripción' });
    try {
        const portal = await stripe.billingPortal.sessions.create({
            customer: row.stripe_customer_id,
            return_url: `${frontendUrl()}/`
        });
        res.json({ error: null, data: { url: portal.url } });
    } catch (err) {
        console.error('[subscription] portal error:', err.message);
        res.status(500).json({ error: 'No se pudo abrir la gestión de la suscripción' });
    }
}

// POST /subscription/webhook — Stripe events (raw body, signature-checked).
async function handleWebhook(req, res) {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).end();
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.warn('[subscription] webhook signature failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.mode === 'subscription' && session.subscription) {
                    const sub = await stripe.subscriptions.retrieve(session.subscription);
                    await syncSubscription(sub, session.client_reference_id);
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await syncSubscription(event.data.object);
                break;
            default:
                break;
        }
        res.json({ received: true });
    } catch (err) {
        console.error('[subscription] webhook handling error:', err);
        res.status(500).end();
    }
}

export default { getConfig, getMine, getStatus, getSubscribers, createCheckout, createPortal, handleWebhook };
