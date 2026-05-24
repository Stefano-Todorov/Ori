import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddCompetitorButton } from '@/components/posts/add-competitor-button'
import { CompetitorsClient } from '@/components/competitors/competitors-client'
import { getUserTier } from '@/lib/usage'
import type { Competitor, Post } from '@/lib/types'

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tierSlug = await getUserTier(user.id)
  const isPaid = tierSlug !== 'starter'

  const [{ data: competitors }, { data: competitorPosts }] = await Promise.all([
    supabase
      .from('competitors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_competitor', true)
      .order('views', { ascending: false }),
  ])

  const allCompetitors: Competitor[] = competitors ?? []

  // Group competitors by group_id
  const groupMap = new Map<string, Competitor[]>()
  for (const c of allCompetitors) {
    const existing = groupMap.get(c.group_id) ?? []
    existing.push(c)
    groupMap.set(c.group_id, existing)
  }

  // Build handle → group_id lookup
  const handleToGroup = new Map<string, string>()
  for (const c of allCompetitors) {
    handleToGroup.set(c.handle.toLowerCase(), c.group_id)
  }

  // Group posts by group_id
  const postsByGroup: Record<string, Post[]> = {}
  const trackedHandles = new Set(allCompetitors.map(c => c.handle.toLowerCase()))
  const orphanedPostsByHandle: Record<string, Post[]> = {}

  for (const post of (competitorPosts ?? [])) {
    const key = (post.competitor_handle ?? '__unknown__').toLowerCase()
    const groupId = handleToGroup.get(key)
    if (groupId) {
      if (!postsByGroup[groupId]) postsByGroup[groupId] = []
      postsByGroup[groupId].push(post)
    } else if (key !== '__unknown__') {
      if (!orphanedPostsByHandle[key]) orphanedPostsByHandle[key] = []
      orphanedPostsByHandle[key].push(post)
    }
  }

  // Build groups array for the client
  const groups = Array.from(groupMap.entries()).map(([groupId, comps]) => ({
    groupId,
    competitors: comps,
    posts: postsByGroup[groupId] ?? [],
  }))

  const orphanedHandles = Object.keys(orphanedPostsByHandle)
  const totalPosts = competitorPosts?.length ?? 0

  return (
    <div className="relative">
      {/* Add competitor button floats in the header area */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <AddCompetitorButton />
      </div>
      <CompetitorsClient
        groups={groups}
        allCompetitors={allCompetitors}
        orphanedHandles={orphanedHandles}
        orphanedPostsByHandle={orphanedPostsByHandle}
        totalPosts={totalPosts}
        isPaid={isPaid}
      />
    </div>
  )
}
