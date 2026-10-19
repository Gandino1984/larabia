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
//
// Super admins can also give a complimentary subscription (no Stripe): the
// reader is a subscriber like a paying one — same badge, workshops.
import Stripe from 'stripe';
import { getRequestUser, roleSnapshot } from '../../utils/authHelper.js';
import user_model from '../../models/user_model.js';
import reader_subscription_model, {
    ACTIVE_STATUSES, isPaid, isLiveSubscription, liveSubscriptionWhere
} from '../../models/reader_subscription_model.js';

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

// Paying or complimentary.
const isActive = (row) => isLiveSubscription(row);
const serialize = (row) => {
    const paid = isPaid(row);
    const complimentary = !!row?.complimentary;
    return {
        active: isActive(row),
        paid,
        complimentary,
        status: row?.status || null,
        plan: row?.plan || null,
        current_period_end: paid ? row?.current_period_end || null : null,
        cancel_at_period_end: !!row?.cancel_at_period_end,
        since: (!paid && complimentary ? row?.complimentary_at : null) || row?.created_at || null
    };
};

// ── Keeping `reader_subscriptions` in step with Stripe ──
//
// A reader has one row but can have several Stripe subscriptions (the
// customer is reused across checkouts — e.g. an abandoned first checkout left
// `incomplete`, then a second one that was paid). And Stripe's events arrive
// — and finish — in any order: a checkout sends `created` (incomplete) and
// `updated` (active) almost together. So the payload of an event is never
// written as is: for every event we read the customer's subscriptions as
// Stripe has them NOW and store the best one (the newest live one, else the
// one the event is about), one event at a time per customer.

// The subscription to store: the newest live one, else `preferredId`, else
// the newest.
function pickSubscription(subs, preferredId) {
    const newestFirst = [...subs].sort((a, b) => b.created - a.created);
    return newestFirst.find((s) => ACTIVE_STATUSES.includes(s.status))
        || newestFirst.find((s) => s.id === preferredId)
        || newestFirst[0]
        || null;
}

// Events for the same customer are handled one after another.
const customerQueues = new Map();
function inCustomerQueue(customerId, task) {
    const previous = customerQueues.get(customerId) || Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    customerQueues.set(customerId, next);
    next.finally(() => { if (customerQueues.get(customerId) === next) customerQueues.delete(customerId); }).catch(() => {});
    return next;
}

// Copy the customer's current subscription (as Stripe has it now) onto the
// reader's row. `userIdHint` / `preferredId` come from the event.
async function syncCustomer(customerId, userIdHint, preferredId) {
    const list = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    const sub = pickSubscription(list.data, preferredId);
    if (!sub) return null;
    const userId = Number(sub.metadata?.user_id || userIdHint) || null;
    let row = userId
        ? await reader_subscription_model.findOne({ where: { user_id: userId } })
        : null;
    if (!row) row = await reader_subscription_model.findOne({ where: { stripe_customer_id: customerId } });
    if (!row && !userId) {
        console.warn('[subscription] event for an unknown customer:', customerId);
        return null;
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
    else row = await reader_subscription_model.create({ user_id: userId, ...values });
    subscribersCache = null;
    console.log(`[subscription] customer ${customerId} → ${sub.id} ${sub.status} (user ${row.user_id})`);
    return row;
}

// An event about `sub` (only its id, customer and metadata are used).
function syncSubscription(sub, userIdHint) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) return Promise.resolve(null);
    const userId = Number(sub.metadata?.user_id || userIdHint) || null;
    return inCustomerQueue(customerId, () => syncCustomer(customerId, userId, sub.id));
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

// GET /subscription/me — the caller's subscription. When it isn't live but
// the reader has been through Checkout, ask Stripe again (at most every 15 s
// per reader): a missed or late event can't leave a paying reader without
// their subscription.
const lastSelfCheck = new Map();
async function getMine(req, res) {
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
    let row = await reader_subscription_model.findOne({ where: { user_id: user.id_user } });
    if (stripe && row?.stripe_customer_id && !isActive(row)
        && Date.now() - (lastSelfCheck.get(user.id_user) || 0) > 15 * 1000) {
        lastSelfCheck.set(user.id_user, Date.now());
        try {
            const customerId = row.stripe_customer_id;
            row = (await inCustomerQueue(customerId, () => syncCustomer(customerId, user.id_user, row.stripe_subscription_id))) || row;
        } catch (err) {
            console.warn('[subscription] self-check failed:', err.message);
        }
    }
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
                where: liveSubscriptionWhere(),
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
    if (!isEnabled()) return res.status(503).json({ error: 'Todavía no es posible hacerse socio/a' });
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Inicia sesión para hacerte socio/a' });
    const plan = req.body?.plan;
    const priceId = PLANS[plan];
    if (!priceId) return res.status(400).json({ error: 'Plan no válido' });

    try {
        let row = await reader_subscription_model.findOne({ where: { user_id: user.id_user } });
        if (isActive(row)) return res.status(409).json({ error: 'Ya eres socio/a' });

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
    if (!stripe) return res.status(503).json({ error: 'Todavía no es posible hacerse socio/a' });
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
    const row = await reader_subscription_model.findOne({ where: { user_id: user.id_user } });
    if (!row?.stripe_customer_id) return res.status(404).json({ error: 'No eres socio/a' });
    try {
        const portal = await stripe.billingPortal.sessions.create({
            customer: row.stripe_customer_id,
            return_url: `${frontendUrl()}/`
        });
        res.json({ error: null, data: { url: portal.url } });
    } catch (err) {
        console.error('[subscription] portal error:', err.message);
        res.status(500).json({ error: 'No se pudo abrir la gestión de tu cuota de socio/a' });
    }
}

// ── Complimentary subscriptions (super admins) ──

/** The super admin making the request, or null after answering 403. */
async function requireSuperAdmin(req, res) {
    const user = await getRequestUser(req);
    if (user && roleSnapshot(user).isSuperAdmin) return user;
    res.status(403).json({ error: 'Solo el super-administrador puede gestionar los socios/as de cortesía', code: 'forbidden' });
    return null;
}

// GET /subscription/admin — every reader with a subscription row: paying
// and/or complimentary (Admin › Usuarios).
async function getAdminList(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const rows = await reader_subscription_model.findAll();
        res.json({
            error: null,
            data: rows.map((r) => ({ user_id: r.user_id, paid: isPaid(r), complimentary: !!r.complimentary }))
        });
    } catch (err) {
        console.error('[subscription] admin list error:', err.message);
        res.status(500).json({ error: 'Error al cargar los socios/as' });
    }
}

// PATCH /subscription/complimentary/:userId { complimentary } — give or take
// back a complimentary subscription. A Stripe subscription isn't touched.
async function setComplimentary(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const userId = parseInt(req.params.userId, 10);
        const target = Number.isFinite(userId) ? await user_model.findByPk(userId) : null;
        if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
        const on = req.body?.complimentary === true;
        let row = await reader_subscription_model.findOne({ where: { user_id: userId } });
        const values = { complimentary: on, complimentary_at: on ? new Date() : null };
        if (row) await row.update(values);
        else if (on) row = await reader_subscription_model.create({ user_id: userId, ...values });
        subscribersCache = null;
        console.log(`[subscription] complimentary ${on ? 'on' : 'off'} for user ${userId}`);
        res.json({
            error: null,
            data: { user_id: userId, paid: isPaid(row), complimentary: on },
            success: on ? 'Ahora es socio/a de cortesía' : 'Ya no es socio/a de cortesía'
        });
    } catch (err) {
        console.error('[subscription] complimentary error:', err.message);
        res.status(500).json({ error: 'No se pudo guardar el cambio' });
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
        const obj = event.data?.object || {};
        console.log(`[subscription] webhook ${event.type} ${obj.id || ''} ${obj.status || ''}`.trim());
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.mode === 'subscription' && session.subscription && session.customer) {
                    await syncSubscription(
                        { id: session.subscription, customer: session.customer, metadata: {} },
                        session.client_reference_id
                    );
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

export default { getConfig, getMine, getStatus, getSubscribers, createCheckout, createPortal, handleWebhook, getAdminList, setComplimentary };
