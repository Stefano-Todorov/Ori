import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddSwipeButton } from '@/components/trending/add-swipe-button'
import { InspoList } from '@/components/trending/swipe-list'
import { DismissibleTip } from '@/components/ui/dismissible-tip'
import { getAllUserTags } from '@/lib/tags'

export default async function InspoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: activePosts }, { data: archivedPosts }, allTags] = await Promise.all([
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
    getAllUserTags(user.id),
  ])

  const posts = activePosts ?? []
  const archived = archivedPosts ?? []

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspo</h1>
          <p className="text-muted-foreground mt-1">
            Save videos that inspire you. Study what works, then turn the best ones into your own ideas.
          </p>
        </div>
        <AddSwipeButton allTags={allTags} />
      </div>

      <DismissibleTip storageKey="inspo-how-it-works" title="How Inspo works">
        Save videos that catch your eye — great hooks, clever angles, high engagement. Add notes on <em>why</em> they work.
        Use AI to analyze what made them perform. When you&apos;re ready, hit <strong>&ldquo;Create idea&rdquo;</strong> to turn any inspo into your own video concept on the Ideas board.
      </DismissibleTip>

      <InspoList posts={posts} archivedPosts={archived} allTags={allTags} />
    </div>
  )
}
