import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddCompetitorButton } from '@/components/posts/add-competitor-button'
import { CompetitorsClient } from '@/components/competitors/competitors-client'
import type { Post } from '@/lib/types'

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  const postsByHandle: Record<string, Post[]> = {}
  for (const post of (competitorPosts ?? [])) {
    const key = (post.competitor_handle ?? '__unknown__').toLowerCase()
    if (!postsByHandle[key]) postsByHandle[key] = []
    postsByHandle[key].push(post)
  }

  const trackedHandles = new Set((competitors ?? []).map((c: { handle: string }) => c.handle.toLowerCase()))
  const orphanedHandles = Object.keys(postsByHandle).filter(
    h => h !== '__unknown__' && !trackedHandles.has(h)
  )

  const totalPosts = competitorPosts?.length ?? 0

  return (
    <div className="relative">
      {/* Add competitor button floats in the header area */}
      <div className="absolute top-8 right-8 z-10">
        <AddCompetitorButton />
      </div>
      <CompetitorsClient
        competitors={competitors ?? []}
        postsByHandle={postsByHandle}
        orphanedHandles={orphanedHandles}
        totalPosts={totalPosts}
      />
    </div>
  )
}
