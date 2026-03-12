import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddSwipeButton } from '@/components/trending/add-swipe-button'
import { InspoList } from '@/components/trending/swipe-list'

export default async function InspoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: activePosts }, { data: archivedPosts }] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_trending', true)
      .neq('status', 'archived')
      .order('created_at', { ascending: false }),
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_trending', true)
      .eq('status', 'archived')
      .order('created_at', { ascending: false }),
  ])

  const posts = activePosts ?? []
  const archived = archivedPosts ?? []
  const allTags = [...new Set([...posts, ...archived].flatMap(p => p.tags ?? []))].sort()

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspo</h1>
          <p className="text-muted-foreground mt-1">
            Save videos that inspire you. Study what works, then turn the best ones into your own ideas.
          </p>
        </div>
        <AddSwipeButton allTags={allTags} />
      </div>

      <div className="bg-purple-500/[0.04] border border-purple-500/15 rounded-2xl p-5 text-sm">
        <p className="font-bold text-foreground mb-1.5">How Inspo works</p>
        <p className="text-muted-foreground leading-relaxed">
          Save videos that catch your eye — great hooks, clever angles, high engagement. Add notes on <em>why</em> they work.
          Use AI to analyze what made them perform. When you&apos;re ready, hit <strong>&ldquo;Create idea&rdquo;</strong> to turn any inspo into your own video concept on the Ideas board.
        </p>
      </div>

      <InspoList posts={posts} archivedPosts={archived} allTags={allTags} />
    </div>
  )
}
