// ─── Subscription Tiers ──────────────────────────────
// Single source of truth for all tier limits and features.
// Every route that needs to check limits imports from here.

export type TierSlug = 'explorer' | 'creator' | 'pro' | 'studio'

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
  explorer: {
    slug: 'explorer',
    name: 'Explorer',
    price: 0,
    stripePriceId: null,
    limits: {
      coach_messages: 0,
      script_generations: 0,
      idea_generations: 0,
      competitor_analyze: 0,
      competitor_ideas: 0,
      competitors: 5,
      downloads: 15,
      swipe_saves: 10,
    },
    features: {
      ai_enabled: false,
      extension_full: false,
      scheduling: true,
    },
  },
  creator: {
    slug: 'creator',
    name: 'Creator',
    price: 3.99,
    stripePriceId: process.env.STRIPE_PRICE_CREATOR ?? null,
    limits: {
      coach_messages: 15,
      script_generations: 5,
      idea_generations: 5,
      competitor_analyze: 5,
      competitor_ideas: 5,
      competitors: 15,
      downloads: 30,
      swipe_saves: 30,
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
    price: 9.99,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    limits: {
      coach_messages: 100,
      script_generations: 30,
      idea_generations: 30,
      competitor_analyze: 30,
      competitor_ideas: 30,
      competitors: 30,
      downloads: 100,
      swipe_saves: -1, // -1 = unlimited
    },
    features: {
      ai_enabled: true,
      extension_full: true,
      scheduling: true,
    },
  },
  studio: {
    slug: 'studio',
    name: 'Studio',
    price: 29.99,
    stripePriceId: process.env.STRIPE_PRICE_STUDIO ?? null,
    limits: {
      coach_messages: -1,
      script_generations: -1,
      idea_generations: -1,
      competitor_analyze: -1,
      competitor_ideas: -1,
      competitors: -1,
      downloads: -1,
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

// Helper to get tier by slug (defaults to explorer)
export function getTier(slug: string | null | undefined): TierConfig {
  if (slug && slug in TIERS) return TIERS[slug as TierSlug]
  return TIERS.explorer
}

// Helper to check if a limit is unlimited
export function isUnlimited(limit: number): boolean {
  return limit === -1
}

// Get all tiers as sorted array (for pricing page)
export const TIER_LIST: TierConfig[] = [
  TIERS.explorer,
  TIERS.creator,
  TIERS.pro,
  TIERS.studio,
]
