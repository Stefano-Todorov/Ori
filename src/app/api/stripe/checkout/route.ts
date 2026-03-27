import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { TIERS, TIER_LIST, type TierSlug } from '@/lib/tiers'

const VALID_PRICE_IDS = new Set(
  TIER_LIST.flatMap(t => [t.stripePriceId, t.stripePriceYearlyId]).filter(Boolean) as string[]
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tierSlug, yearly, priceId: directPriceId } = await req.json()

  // Resolve price ID: either from tierSlug (new) or direct priceId (legacy)
  let priceId = directPriceId
  if (tierSlug && !priceId) {
    const tier = TIERS[tierSlug as TierSlug]
    if (!tier || tier.price === 0) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    priceId = yearly ? tier.stripePriceYearlyId : tier.stripePriceId
  }

  if (!priceId) {
    return NextResponse.json({ error: 'Missing priceId — check STRIPE_PRICE_* env vars are set' }, { status: 400 })
  }

  if (!VALID_PRICE_IDS.has(priceId)) {
    return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
  }

  // Check if user already has a Stripe customer ID
  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    // Create Stripe customer
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id

    await serviceClient
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/settings?billing=success`,
    cancel_url: `${baseUrl}/dashboard/settings?billing=cancelled`,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
