// ─── Subscription Tiers ──────────────────────────────
// Single source of truth for all tier limits and features.
// Every route that needs to check limits imports from here.

export type TierSlug = 'starter' | 'plus' | 'pro' | 'max'

export interface TierConfig {
  slug: TierSlug
  name: string
  price: number // monthly USD, 0 = free
  stripePriceId: string | null // set after creating Stripe products
  limits: {
    coach_messages: number    // per month, 0 = disabled
    script_generations: number
    idea_generations: number
    competitor_analyze: number
    competitor_ideas: number
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
    stripePriceId: null,
    limits: {
      coach_messages: 0,
      script_generations: 0,
      idea_generations: 0,
      competitor_analyze: 0,
      competitor_ideas: 0,
      competitors: 5,
      downloads: 0,
      swipe_saves: -1, // unlimited
    },
    features: {
      ai_enabled: false,
      extension_full: false,
      scheduling: true,
    },
  },
  plus: {
    slug: 'plus',
    name: 'Plus',
    price: 5.99,
    stripePriceId: process.env.STRIPE_PRICE_PLUS ?? null,
    limits: {
      coach_messages: 10,
      script_generations: 3,
      idea_generations: 5,
      competitor_analyze: 3,
      competitor_ideas: 3,
      competitors: 10,
      downloads: 30,
      swipe_saves: -1,
    },
    features: {
      ai_enabled: true,
      extension_full: false,
      scheduling: true,
    },
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    price: 14.99,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    limits: {
      coach_messages: 150,
      script_generations: 40,
      idea_generations: 40,
      competitor_analyze: 40,
      competitor_ideas: 40,
      competitors: 30,
      downloads: 100,
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
    stripePriceId: process.env.STRIPE_PRICE_MAX ?? null,
    limits: {
      coach_messages: 400,
      script_generations: 150,
      idea_generations: 150,
      competitor_analyze: 100,
      competitor_ideas: 100,
      competitors: 100,
      downloads: 500,
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
