import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserUsage, getUserTier } from '@/lib/usage'
import { getTier } from '@/lib/tiers'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tierSlug = await getUserTier(user.id)
  const tier = getTier(tierSlug)
  const usage = await getUserUsage(user.id)

  return NextResponse.json({ tier: tierSlug, limits: tier.limits, usage })
}
