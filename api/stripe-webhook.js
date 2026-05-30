// =============================================================
// NDIS Ready — Stripe Webhook Handler
// POST /api/stripe-webhook
// Verifies Stripe signature, routes events to handlers
// =============================================================

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.STRIPE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Vercel — disable body parsing so we get raw buffer for signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
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

      // ── One-time payment succeeded ──────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await handleCheckoutCompleted(session);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Backup handler — checkout.session.completed is primary
        // Only process if not already handled via checkout session
        const pi = event.data.object;
        if (!pi.metadata?.checkout_session_id) {
          await handlePaymentIntentSucceeded(pi);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await handlePaymentFailed(pi);
        break;
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object;
        await logEvent('payment_canceled', pi.id, pi.metadata?.customer_email || null);
        break;
      }

      // ── Subscriptions ───────────────────────────────────────
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
    // Still return 200 to Stripe so it doesn't retry — we log the error
    return res.status(200).json({ received: true, warning: err.message });
  }
}

// =============================================================
// EVENT HANDLERS
// =============================================================

async function handleCheckoutCompleted(session) {
  const email = session.customer_details?.email || session.customer_email;
  const name  = session.customer_details?.name  || '';
  const amountPaid = session.amount_total; // in cents
  const productTier = amountPaid >= 49900 ? 'value_bundle' : 'registration_kit';

  console.log(`Payment confirmed: ${email} — ${productTier} ($${amountPaid / 100})`);

  // 1. Upsert order in Supabase
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .upsert({
      stripe_session_id:    session.id,
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

  // 2. Fetch quiz answers for this lead (if they came through the quiz)
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('email', email)
    .single();

  // 3. Trigger document generation
  const generateRes = await fetch(
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ndis-ready.com.au'}/api/generate-documents`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:     order.id,
        email,
        name,
        productTier,
        quizAnswers: lead?.quiz_answers || null,
        orgName:     lead?.org_name    || name,
      }),
    }
  );

  if (!generateRes.ok) {
    const errText = await generateRes.text();
    console.error('Document generation failed:', errText);
    // Don't throw — we'll retry manually. Order is saved.
  }
}

async function handlePaymentIntentSucceeded(pi) {
  // Fallback for direct PaymentIntent payments (not via Checkout)
  await logEvent('payment_intent_succeeded', pi.id, pi.receipt_email);
}

async function handlePaymentFailed(pi) {
  const email = pi.receipt_email || pi.last_payment_error?.payment_method?.billing_details?.email;
  console.log(`Payment failed for: ${email}`);

  await logEvent('payment_failed', pi.id, email);

  // Send failure email via Resend
  if (email) {
    await fetch(
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ndis-ready.com.au'}/api/send-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:  'payment_failed',
          email,
          data:  { retryUrl: 'https://ndis-ready.com.au/#pricing' },
        }),
      }
    );
  }
}

async function handleSubscriptionCreated(sub) {
  await logEvent('subscription_created', sub.id, null, { plan: sub.items?.data?.[0]?.price?.nickname });
}

async function handleSubscriptionCanceled(sub) {
  // Mark user as inactive in orders table
  await supabase
    .from('orders')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', sub.id);

  await logEvent('subscription_canceled', sub.id, null);
}

async function handleInvoicePaid(inv) {
  await logEvent('invoice_paid', inv.id, inv.customer_email, { amount: inv.amount_paid });
}

async function handleInvoiceFailed(inv) {
  console.log(`Invoice payment failed: ${inv.customer_email}`);
  await logEvent('invoice_failed', inv.id, inv.customer_email);
}

async function handleRefund(charge) {
  // Mark order as refunded — this will disable document access
  await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: new Date().toISOString() })
    .eq('stripe_payment_intent', charge.payment_intent);

  await logEvent('charge_refunded', charge.id, charge.billing_details?.email);
  console.log(`Refund processed for payment intent: ${charge.payment_intent}`);
}

async function logEvent(type, stripeId, email, metadata = {}) {
  await supabase.from('webhook_log').insert({
    event_type:  type,
    stripe_id:   stripeId,
    email:       email,
    metadata:    metadata,
    received_at: new Date().toISOString(),
  });
}
