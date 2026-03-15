import { createServiceClient } from '@/lib/supabase/service'
import { getTier, isUnlimited, type UsageFeature, type TierSlug } from '@/lib/tiers'

// Current billing period in YYYY-MM format
function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export interface UsageCheckResult {
  allowed: boolean
  current: number
  limit: number
  unlimited: boolean
  tier: TierSlug
  feature: UsageFeature
}

// Check if a user can use a feature (does NOT increment)
export async function checkUsage(
  userId: string,
  feature: UsageFeature,
): Promise<UsageCheckResult> {
  const supabase = createServiceClient()
  const period = currentPeriod()

  // Get user tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('user_id', userId)
    .single()

  const tier = getTier(profile?.subscription_tier)
  const limit = tier.limits[feature]

  // Unlimited
  if (isUnlimited(limit)) {
    return { allowed: true, current: 0, limit: -1, unlimited: true, tier: tier.slug, feature }
  }

  // Disabled (limit = 0)
  if (limit === 0) {
    return { allowed: false, current: 0, limit: 0, unlimited: false, tier: tier.slug, feature }
  }

  // Get current count
  const { data: usage } = await supabase
    .from('usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period', period)
    .single()

  const current = usage?.count ?? 0

  return {
    allowed: current < limit,
    current,
    limit,
    unlimited: false,
    tier: tier.slug,
    feature,
  }
}

// Increment usage count after a successful action
export async function incrementUsage(
  userId: string,
  feature: UsageFeature,
): Promise<number> {
  const supabase = createServiceClient()
  const period = currentPeriod()

  const { data } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
  })

  return data ?? 0
}

// Get all usage for a user in the current period (for the usage bar)
export async function getUserUsage(userId: string): Promise<Record<UsageFeature, number>> {
  const supabase = createServiceClient()
  const period = currentPeriod()

  const { data } = await supabase
    .from('usage')
    .select('feature, count')
    .eq('user_id', userId)
    .eq('period', period)

  const usage: Record<string, number> = {}
  for (const row of data ?? []) {
    usage[row.feature] = row.count
  }

  return usage as Record<UsageFeature, number>
}

// Get user's tier slug from profile
export async function getUserTier(userId: string): Promise<TierSlug> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('user_id', userId)
    .single()

  return (data?.subscription_tier as TierSlug) ?? 'explorer'
}
