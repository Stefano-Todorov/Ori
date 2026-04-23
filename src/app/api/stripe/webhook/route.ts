import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import type { TierSlug } from '@/lib/tiers'
import type { SupabaseClient } from '@supabase/supabase-js'

const UPGRADE_MESSAGE = `Welcome to your upgraded coaching experience! Now that we're working together more closely, I want to make sure I really understand you and your content so I can give you the best advice possible.

I'd love to dig a bit deeper — what's been your biggest challenge or frustration with creating content so far? And is there anything specific you're hoping to achieve now that you've upgraded?`

async function sendUpgradeCoachMessage(supabase: SupabaseClient, userId: string) {
  // Check if the user was previously on starter (or had no tier)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, creator_context')
    .eq('user_id', userId)
    .single()

  // Only send if upgrading FROM starter/null (the tier is already updated at this point,
  // so we check if creator_context is shallow — indicating they had a free onboarding)
  const creatorContext = profile?.creator_context ?? ''
  if (creatorContext.length > 300) return // Already has deep context, no need

  await supabase.from('coach_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: UPGRADE_MESSAGE,
    proactive: true,
  })
}

// Map Stripe price IDs to tier slugs (monthly + yearly)
function tierFromPriceId(priceId: string): TierSlug {
  const map: Record<string, TierSlug> = {
    [process.env.STRIPE_PRICE_PLUS ?? '']: 'plus',
    [process.env.STRIPE_PRICE_PLUS_YEARLY ?? '']: 'plus',
    [process.env.STRIPE_PRICE_PRO ?? '']: 'pro',
    [process.env.STRIPE_PRICE_PRO_YEARLY ?? '']: 'pro',
    [process.env.STRIPE_PRICE_MAX ?? '']: 'max',
    [process.env.STRIPE_PRICE_MAX_YEARLY ?? '']: 'max',
  }
  return map[priceId] ?? 'starter'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    // ── Checkout ──────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      if (!userId) break

      // Get subscription to find price ID
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price.id ?? ''
      const tier = tierFromPriceId(priceId)

      await supabase
        .from('profiles')
        .update({
          subscription_tier: tier,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq('user_id', userId)

      // Send a proactive coach message if upgrading from free
      if (tier !== 'starter') {
        await sendUpgradeCoachMessage(supabase, userId)
      }

      break
    }

    case 'checkout.session.expired': {
      // Session expired before payment — no action needed, user can retry
      break
    }

    // ── Subscription lifecycle ────────────────────────────
    case 'customer.subscription.created': {
      // Initial subscription created — tier is set via checkout.session.completed
      // but handle edge case where checkout event arrives late
      const subscription = event.data.object
      const customerId = subscription.customer as string
      const priceId = subscription.items.data[0]?.price.id ?? ''
      const tier = tierFromPriceId(priceId)

      if (subscription.status === 'active') {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: tier,
            stripe_subscription_id: subscription.id,
          })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const priceId = subscription.items.data[0]?.price.id ?? ''
      const tier = tierFromPriceId(priceId)
      const customerId = subscription.customer as string

      if (subscription.status === 'active') {
        await supabase
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('stripe_customer_id', customerId)
      } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
        // Keep current tier but could notify user — for now just log
        console.warn(`Subscription ${subscription.id} is ${subscription.status}`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'starter',
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'customer.subscription.trial_will_end': {
      // Trial ending in 3 days — could send notification in future
      break
    }

    // ── Invoice / Payment ────────────────────────────────
    case 'invoice.paid': {
      // Recurring payment succeeded — ensure tier is current
      const invoice = event.data.object
      const customerId = invoice.customer as string
      const subscriptionId = (invoice as unknown as { subscription: string | null }).subscription

      if (subscriptionId) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = tierFromPriceId(priceId)

        await supabase
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const customerId = invoice.customer as string

      // Downgrade to free on payment failure
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'starter' })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'invoice.payment_action_required': {
      // User needs to authenticate payment (3D Secure etc) — log for now
      const invoice = event.data.object
      console.warn(`Payment action required for invoice ${invoice.id}`)
      break
    }

    case 'invoice.upcoming': {
      // Upcoming invoice notification — could notify user in future
      break
    }

    // ── Customer lifecycle ────────────────────────────────
    case 'customer.created': {
      // Customer created in Stripe — store customer ID if we can match by email
      const customer = event.data.object
      if (customer.email) {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('email', customer.email)
          .is('stripe_customer_id', null)
      }
      break
    }

    case 'customer.updated': {
      // Customer info changed in Stripe — no action needed
      break
    }

    case 'customer.deleted': {
      // Customer deleted in Stripe — reset subscription
      const customer = event.data.object
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'starter',
          stripe_customer_id: null,
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customer.id)

      break
    }

    // ── Charges (refunds & disputes) ─────────────────────
    case 'charge.refunded': {
      // Refund issued — downgrade to free
      const charge = event.data.object
      const customerId = charge.customer as string
      if (customerId) {
        await supabase
          .from('profiles')
          .update({ subscription_tier: 'starter' })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'charge.dispute.created': {
      // Chargeback opened — downgrade immediately
      const dispute = event.data.object
      const chargeId = dispute.charge as string
      if (chargeId) {
        const charge = await getStripe().charges.retrieve(chargeId)
        const customerId = charge.customer as string
        if (customerId) {
          await supabase
            .from('profiles')
            .update({ subscription_tier: 'starter' })
            .eq('stripe_customer_id', customerId)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
