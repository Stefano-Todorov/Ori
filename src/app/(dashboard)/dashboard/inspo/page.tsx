import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddSwipeButton } from '@/components/trending/add-swipe-button'
import { InspoList } from '@/components/trending/swipe-list'

export default async function InspoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: inspoPosts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_trending', true)
    .order('created_at', { ascending: false })

  const posts = inspoPosts ?? []
  const platforms = [...new Set(posts.map(p => p.platform))]

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspo</h1>
          <p className="text-muted-foreground mt-1">
            Save videos that inspire you. Study what works, then turn the best ones into your own ideas.
          </p>
        </div>
        <AddSwipeButton />
      </div>

      {posts.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/8">
            <span className="text-xs font-bold text-foreground">{posts.length}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Saved</span>
          </div>
          {platforms.map(p => (
            <div key={p} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/8">
              <span className="text-xs font-bold text-foreground capitalize">{p}</span>
              <span className="text-[10px] text-muted-foreground">{posts.filter(post => post.platform === p).length}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-purple-500/[0.04] border border-purple-500/15 rounded-2xl p-5 text-sm">
        <p className="font-bold text-foreground mb-1.5">How Inspo works</p>
        <p className="text-muted-foreground leading-relaxed">
          Save videos that catch your eye — great hooks, clever angles, high engagement. Add notes on <em>why</em> they work.
          Use AI to analyze what made them perform. When you&apos;re ready, hit <strong>&ldquo;Create idea&rdquo;</strong> to turn any inspo into your own video concept on the Ideas board.
        </p>
      </div>

      <InspoList posts={posts} />
    </div>
  )
}
