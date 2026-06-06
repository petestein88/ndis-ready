const Stripe = require('stripe');
const { applyCors } = require('./_lib/security');

const PRICE_IDS = {
  registration_kit: 'price_1Tc2doP7sgWyDZVxHk1HMjkm',
  value_bundle: 'price_1Tc2eYP7sgWyDZVxOiYJYuso',
};

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('MISSING: STRIPE_SECRET_KEY env var is not set');
      return res.status(500).json({ error: 'Stripe key not configured on server' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });
    const { tier, email, quiz_params } = req.body;

    console.log('Checkout requested for tier:', tier);

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      console.error('Invalid tier requested:', tier);
      return res.status(400).json({ error: 'Invalid tier: ' + tier });
    }

    console.log('Using price ID:', priceId);

    const origin = req.headers.origin || 'https://ndis-ready.com.au';
    const successUrl = `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}${quiz_params ? '&' + quiz_params : ''}`;
    const cancelUrl = `${origin}/#pricing`;

    const sessionParams = {
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tier, quiz_params: quiz_params || '' },
    };

    if (email) sessionParams.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('Checkout session created:', session.id);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error type:', err.type);
    console.error('Stripe error code:', err.code);
    console.error('Stripe error message:', err.message);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      detail: err.message,
      type: err.type || null,
      code: err.code || null,
    });
  }
};
