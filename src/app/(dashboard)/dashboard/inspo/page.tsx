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

      {posts.length > 0 && (() => {
        const avgViews = posts.reduce((s, p) => s + p.views, 0) / posts.length
        const avgLikes = posts.reduce((s, p) => s + p.likes, 0) / posts.length
        const avgEng = posts.reduce((s, p) => s + (p.views > 0 ? ((p.likes + p.comments + p.shares) / p.views) * 100 : 0), 0) / posts.length
        const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : Math.round(n).toString()
        return (
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/8 text-xs">
              <span>📌</span>
              <span className="font-bold text-foreground">{posts.length}</span>
              <span className="text-muted-foreground">saved</span>
            </span>
            {avgViews > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/8 text-xs">
                <span>👁</span>
                <span className="font-bold text-foreground">{fmt(Math.round(avgViews))}</span>
                <span className="text-muted-foreground">avg views</span>
              </span>
            )}
            {avgLikes > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/8 text-xs">
                <span>❤️</span>
                <span className="font-bold text-foreground">{fmt(Math.round(avgLikes))}</span>
                <span className="text-muted-foreground">avg likes</span>
              </span>
            )}
            {avgEng > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card dark:bg-[#1a1a2e] border border-border dark:border-white/8 text-xs">
                <span>⚡</span>
                <span className="font-bold text-foreground">{avgEng.toFixed(1)}%</span>
                <span className="text-muted-foreground">avg eng.</span>
              </span>
            )}
          </div>
        )
      })()}

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
