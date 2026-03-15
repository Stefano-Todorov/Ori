import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import type { TierSlug } from '@/lib/tiers'

// Map Stripe price IDs to tier slugs
function tierFromPriceId(priceId: string): TierSlug {
  const map: Record<string, TierSlug> = {
    [process.env.STRIPE_PRICE_CREATOR ?? '']: 'creator',
    [process.env.STRIPE_PRICE_PRO ?? '']: 'pro',
    [process.env.STRIPE_PRICE_STUDIO ?? '']: 'studio',
  }
  return map[priceId] ?? 'explorer'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      if (!userId) break

      // Get subscription to find price ID
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
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

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const priceId = subscription.items.data[0]?.price.id ?? ''
      const tier = tierFromPriceId(priceId)
      const customerId = subscription.customer as string

      // Update tier based on new price
      if (subscription.status === 'active') {
        await supabase
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      // Downgrade to free
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'explorer',
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const customerId = invoice.customer as string

      // Downgrade to free on payment failure
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'explorer' })
        .eq('stripe_customer_id', customerId)

      break
    }
  }

  return NextResponse.json({ received: true })
}
