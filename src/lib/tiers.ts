// ─── Subscription Tiers ──────────────────────────────
// Single source of truth for all tier limits and features.
// Every route that needs to check limits imports from here.

export type TierSlug = 'starter' | 'plus' | 'pro' | 'max'

export interface TierConfig {
  slug: TierSlug
  name: string
  price: number // monthly USD, 0 = free
  yearlyPrice: number // yearly USD total, 0 = free (equals ~10 months)
  stripePriceId: string | null // set after creating Stripe products
  stripePriceYearlyId: string | null // yearly Stripe price
  limits: {
    coach_messages: number    // per month, 0 = disabled
    script_generations: number
    competitors: number       // max tracked competitors
    downloads: number         // per month
    swipe_saves: number       // saved inspo videos per month
  }
  features: {
    ai_enabled: boolean
    extension_full: boolean   // full extension features vs save-only
    scheduling: boolean
  }
}

export const TIERS: Record<TierSlug, TierConfig> = {
  starter: {
    slug: 'starter',
    name: 'Starter',
    price: 0,
    yearlyPrice: 0,
    stripePriceId: null,
    stripePriceYearlyId: null,
    limits: {
      coach_messages: 3,
      script_generations: 1,
      competitors: 5,
      downloads: 0,
      swipe_saves: -1, // unlimited
    },
    features: {
      ai_enabled: true,
      extension_full: true,
      scheduling: true,
    },
  },
  plus: {
    slug: 'plus',
    name: 'Plus',
    price: 5.99,
    yearlyPrice: 49.99,
    stripePriceId: process.env.STRIPE_PRICE_PLUS ?? null,
    stripePriceYearlyId: process.env.STRIPE_PRICE_PLUS_YEARLY ?? null,
    limits: {
      coach_messages: 25,
      script_generations: 10,
      competitors: 10,
      downloads: 30,
      swipe_saves: -1,
    },
    features: {
      ai_enabled: true,
      extension_full: true,
      scheduling: true,
    },
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    price: 14.99,
    yearlyPrice: 149.99,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    stripePriceYearlyId: process.env.STRIPE_PRICE_PRO_YEARLY ?? null,
    limits: {
      coach_messages: 100,
      script_generations: 40,
      competitors: 30,
      downloads: 75,
      swipe_saves: -1,
    },
    features: {
      ai_enabled: true,
      extension_full: true,
      scheduling: true,
    },
  },
  max: {
    slug: 'max',
    name: 'Max',
    price: 39.99,
    yearlyPrice: 399.99,
    stripePriceId: process.env.STRIPE_PRICE_MAX ?? null,
    stripePriceYearlyId: process.env.STRIPE_PRICE_MAX_YEARLY ?? null,
    limits: {
      coach_messages: 300,
      script_generations: 125,
      competitors: 100,
      downloads: 300,
      swipe_saves: -1,
    },
    features: {
      ai_enabled: true,
      extension_full: true,
      scheduling: true,
    },
  },
}

// Usage feature keys that map to tier limits
export type UsageFeature = keyof TierConfig['limits']

// Helper to get tier by slug (defaults to starter)
export function getTier(slug: string | null | undefined): TierConfig {
  if (slug && slug in TIERS) return TIERS[slug as TierSlug]
  return TIERS.starter
}

// Helper to check if a limit is unlimited
export function isUnlimited(limit: number): boolean {
  return limit === -1
}

// Get all tiers as sorted array (for pricing page)
export const TIER_LIST: TierConfig[] = [
  TIERS.starter,
  TIERS.plus,
  TIERS.pro,
  TIERS.max,
]
