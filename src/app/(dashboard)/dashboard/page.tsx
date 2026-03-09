import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { TopPosts } from '@/components/dashboard/top-posts'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { ImportCsvButton } from '@/components/posts/import-csv-button'
import Link from 'next/link'
import { Sparkles, Lightbulb, MessageSquare, Upload } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const [{ data: posts }, { data: recentIdeas }, { data: draftScripts }] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .order('views', { ascending: false }),
    supabase
      .from('content_ideas')
      .select('id, idea, difficulty, status')
      .eq('user_id', user.id)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('scripts')
      .select('id, topic, status')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const totalPosts = posts?.length ?? 0
  const totalViews = posts?.reduce((sum, p) => sum + (p.views ?? 0), 0) ?? 0
  const totalLikes = posts?.reduce((sum, p) => sum + (p.likes ?? 0), 0) ?? 0
  const avgEngagement = posts && posts.length > 0
    ? posts.reduce((sum, p) => sum + (p.engagement_rate ?? 0), 0) / posts.length
    : 0

  const topPosts = posts?.slice(0, 5) ?? []

  const postsThisWeek = posts?.filter(
    (p) => p.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  ).length ?? 0

  const postingTarget = profile?.posting_target ?? 3
  const weeklyProgress = Math.min(postsThisWeek / postingTarget, 1)
  const isOnTrack = postsThisWeek >= Math.ceil(postingTarget / 2)

  const isNewUser = totalPosts === 0 && !recentIdeas?.length && !draftScripts?.length

  return (
    <div className="p-8 space-y-8">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{profile?.name ? `, ${profile.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.niche ? `${profile.niche} creator` : 'Your content overview'}
          </p>
        </div>
        <div className="flex gap-3">
          <ImportCsvButton />
          <Link
            href="/dashboard/coach"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-500/20 hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Sparkles size={14} />
            Ask Orianna
          </Link>
        </div>
      </div>

      {/* ─── Today's Focus ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekly goal */}
        <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-5 space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Weekly goal</p>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold text-foreground">{postsThisWeek}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {postingTarget} posts</span>
          </div>
          <div className="w-full bg-muted dark:bg-white/[0.06] rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${isOnTrack ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
              style={{ width: `${weeklyProgress * 100}%` }}
            />
          </div>
          <p className={`text-xs font-medium ${isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {isOnTrack ? 'On track this week' : 'Behind — keep pushing!'}
          </p>
        </div>

        {/* Next to film */}
        <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-5 space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Next to film</p>
          {recentIdeas && recentIdeas.length > 0 ? (
            <div className="space-y-1.5">
              {recentIdeas.map((idea) => (
                <Link key={idea.id} href="/dashboard/ideas">
                  <div className="text-sm font-medium truncate text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer py-1 px-2.5 -mx-2.5 rounded-lg hover:bg-purple-500/5">
                    {idea.idea}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Link href="/dashboard/ideas" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
              Add your first idea &rarr;
            </Link>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-5 space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Quick actions</p>
          <div className="space-y-2">
            <Link
              href="/dashboard/scripts"
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-500/20 hover:brightness-110 transition-all duration-150"
            >
              <Sparkles size={14} /> Generate Script
            </Link>
            <Link
              href="/dashboard/ideas"
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-white/10 text-foreground text-sm font-medium hover:bg-muted dark:hover:bg-white/5 transition-all duration-150"
            >
              <Lightbulb size={14} className="text-amber-500" /> Add Idea
            </Link>
            <Link
              href="/dashboard/coach"
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-white/10 text-foreground text-sm font-medium hover:bg-muted dark:hover:bg-white/5 transition-all duration-150"
            >
              <MessageSquare size={14} className="text-teal-500" /> Ask Coach
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Getting started — only for brand new users ─── */}
      {isNewUser && (
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/[0.03] border border-purple-500/20 rounded-2xl p-6 space-y-4">
          <p className="text-sm font-bold text-foreground">Getting started</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: 'Import your posts', href: '/dashboard', icon: Upload },
              { label: 'Add your first idea', href: '/dashboard/ideas', icon: Lightbulb },
              { label: 'Generate a script', href: '/dashboard/scripts', icon: Sparkles },
              { label: 'Ask the Coach', href: '/dashboard/coach', icon: MessageSquare },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={item.href} className="flex items-center gap-3 p-3 rounded-xl border border-border dark:border-white/8 text-sm font-medium text-foreground hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-150 group">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-purple-600 dark:text-purple-400" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <MetricsCards
        totalPosts={totalPosts}
        totalViews={totalViews}
        totalLikes={totalLikes}
        avgEngagement={avgEngagement}
      />

      <AnalyticsCharts posts={posts ?? []} />

      {totalPosts === 0 ? (
        <div className="border-2 border-dashed border-border dark:border-white/10 rounded-2xl p-12 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">No posts yet</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Import your content analytics from TikTok, Instagram, or YouTube to get started.
          </p>
          <ImportCsvButton />
        </div>
      ) : (
        <TopPosts posts={topPosts} />
      )}
    </div>
  )
}
