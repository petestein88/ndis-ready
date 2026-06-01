const Stripe = require('stripe');

const PRICE_IDS = {
  registration_kit: 'price_1Tc2doP7sgWyDZVxHk1HMjkm',
  value_bundle: 'price_1Tc2eYP7sgWyDZVxOiYJYuso',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return res.status(500).json({ error: 'Stripe key not configured' });
    }

    const stripe = new Stripe(stripeKey);
    const { tier, email, quiz_params } = req.body;

    const priceId = PRICE_IDS[tier];
    if (!priceId) return res.status(400).json({ error: 'Invalid tier: ' + tier });

    const origin = req.headers.origin || 'https://ndis-ready.com.au';
    const successUrl = `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}${quiz_params ? '&' + quiz_params : ''}`;
    const cancelUrl = `${origin}/results.html${quiz_params ? '?' + quiz_params : ''}`;

    const sessionParams = {
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tier, quiz_params: quiz_params || '' },
    };

    if (email) sessionParams.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message, err.type, err.code);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      detail: err.message,
      type: err.type,
      code: err.code,
    });
  }
};
