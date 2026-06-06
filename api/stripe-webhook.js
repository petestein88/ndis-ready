// =============================================================
// NDIS Ready — Stripe Webhook Handler
// POST /api/stripe-webhook
// Verifies Stripe signature, routes events to handlers
// =============================================================

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { internalHeaders } = require('./_lib/security');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Vercel — disable body parsing so we get raw buffer for signature verification
module.exports.config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await handleCheckoutCompleted(session, req);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        if (!pi.metadata?.checkout_session_id) {
          await handlePaymentIntentSucceeded(pi);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await handlePaymentFailed(pi, req);
        break;
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object;
        await logEvent('payment_canceled', pi.id, pi.metadata?.customer_email || null);
        break;
      }

      case 'customer.subscription.created': {
        const sub = event.data.object;
        await handleSubscriptionCreated(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await handleSubscriptionCanceled(sub);
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object;
        await handleInvoicePaid(inv);
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object;
        await handleInvoiceFailed(inv);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error(`Error handling event ${event.type}:`, err);
    // Always return 200 to Stripe so it doesn't retry indefinitely
    return res.status(200).json({ received: true, warning: err.message });
  }
};

// =============================================================
// EVENT HANDLERS
// =============================================================

async function handleCheckoutCompleted(session, req) {
  const email      = session.customer_details?.email || session.customer_email;
  const name       = session.customer_details?.name  || '';
  const amountPaid = session.amount_total;
  const productTier = amountPaid >= 49900 ? 'value_bundle' : 'registration_kit';

  console.log(`Payment confirmed: ${email} — ${productTier} ($${amountPaid / 100})`);

  // 1. Upsert order in Supabase
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .upsert({
      stripe_session_id:     session.id,
      stripe_payment_intent: session.payment_intent,
      email,
      name,
      amount_cents:  amountPaid,
      product_tier:  productTier,
      status:        'paid',
      paid_at:       new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' })
    .select()
    .single();

  if (orderError) {
    console.error('Failed to save order:', orderError);
    throw orderError;
  }

  // 2. Fetch the best lead record for this email.
  // Prefer the most recent lead that actually has a profile (filled via the
  // doc-builder), so paid docs get the full personalised data. Fall back to
  // the most recent lead of any kind (quiz-only) if none has a profile.
  let lead = null;
  const { data: profileLead } = await supabase
    .from('leads')
    .select('*')
    .eq('email', email)
    .not('profile', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  lead = profileLead;
  if (!lead) {
    const { data: anyLead } = await supabase
      .from('leads')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = anyLead;
  }

  // 3. Trigger document generation
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://ndis-ready.com.au';

  const generateRes = await fetch(`${baseUrl}/api/generate-documents`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({
      orderId:     order.id,
      email,
      name,
      productTier,
      quizAnswers: lead?.quiz_answers || null,
      orgName:     lead?.org_name    || name,
      // Full org profile captured during the doc-builder preview — ensures
      // EVERY paid doc is AI-populated with the customer's real details
      // (ABN, addresses, key people, insurance, etc.), not just org name.
      profile:     lead?.profile     || null,
    }),
  });

  if (!generateRes.ok) {
    const errText = await generateRes.text();
    console.error('Document generation failed:', errText);
    // Non-fatal — order is saved, can retry manually via Vercel logs
  }
}

async function handlePaymentIntentSucceeded(pi) {
  await logEvent('payment_intent_succeeded', pi.id, pi.receipt_email);
}

async function handlePaymentFailed(pi, req) {
  const email = pi.receipt_email
    || pi.last_payment_error?.payment_method?.billing_details?.email;

  console.log(`Payment failed for: ${email}`);
  await logEvent('payment_failed', pi.id, email);

  if (email) {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://ndis-ready.com.au';

    await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: internalHeaders(),
      body: JSON.stringify({
        type:  'payment_failed',
        email,
        data:  { retryUrl: 'https://ndis-ready.com.au/#pricing' },
      }),
    }).catch(err => console.warn('payment_failed email send error:', err));
  }
}

async function handleSubscriptionCreated(sub) {
  await logEvent('subscription_created', sub.id, null, {
    plan: sub.items?.data?.[0]?.price?.nickname,
  });
}

async function handleSubscriptionCanceled(sub) {
  await supabase
    .from('orders')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', sub.id);

  await logEvent('subscription_canceled', sub.id, null);
}

async function handleInvoicePaid(inv) {
  await logEvent('invoice_paid', inv.id, inv.customer_email, {
    amount: inv.amount_paid,
  });
}

async function handleInvoiceFailed(inv) {
  console.log(`Invoice payment failed: ${inv.customer_email}`);
  await logEvent('invoice_failed', inv.id, inv.customer_email);
}

async function handleRefund(charge) {
  await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: new Date().toISOString() })
    .eq('stripe_payment_intent', charge.payment_intent);

  await logEvent('charge_refunded', charge.id, charge.billing_details?.email);
  console.log(`Refund processed for payment intent: ${charge.payment_intent}`);
}

async function logEvent(type, stripeId, customerEmail, metadata = {}) {
  await supabase.from('webhook_log').insert({
    event_type:     type,
    stripe_id:      stripeId,
    customer_email: customerEmail,
    metadata:       metadata,
    received_at:    new Date().toISOString(),
  }).catch(err => console.warn('webhook_log insert failed (non-fatal):', err));
}
