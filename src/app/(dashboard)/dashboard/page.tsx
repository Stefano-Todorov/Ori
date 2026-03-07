import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { TopPosts } from '@/components/dashboard/top-posts'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { ImportCsvButton } from '@/components/posts/import-csv-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{profile?.name ? `, ${profile.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.niche ? `${profile.niche} creator` : 'Your content overview'}
          </p>
        </div>
        <div className="flex gap-3">
          <ImportCsvButton />
          <Button asChild>
            <Link href="/dashboard/coach">Ask Orianna</Link>
          </Button>
        </div>
      </div>

      {/* Today's Focus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekly goal */}
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Weekly goal</p>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-bold">{postsThisWeek}</span>
              <span className="text-sm text-muted-foreground mb-0.5">/ {postingTarget} posts</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-1">
              <div
                className={`h-2 rounded-full transition-all ${isOnTrack ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${weeklyProgress * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isOnTrack ? 'On track this week' : 'Behind — keep pushing!'}
            </p>
          </CardContent>
        </Card>

        {/* Next to film */}
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Next to film</p>
            {recentIdeas && recentIdeas.length > 0 ? (
              <div className="space-y-2">
                {recentIdeas.map((idea) => (
                  <Link key={idea.id} href="/dashboard/ideas">
                    <div className="text-sm font-medium truncate hover:text-primary transition-colors cursor-pointer py-0.5">
                      {idea.idea}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Link href="/dashboard/ideas" className="text-sm text-primary hover:underline">
                Add your first idea →
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick actions</p>
            <div className="space-y-2">
              <Button asChild size="sm" className="w-full justify-start">
                <Link href="/dashboard/scripts">Generate Script</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href="/dashboard/ideas">Add Idea</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href="/dashboard/coach">Ask Coach</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting started — only for brand new users */}
      {isNewUser && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5">
            <p className="text-sm font-semibold mb-3">Getting started</p>
            <div className="space-y-2">
              {[
                { label: 'Import your posts', href: '/dashboard' },
                { label: 'Add your first idea', href: '/dashboard/ideas' },
                { label: 'Generate a script', href: '/dashboard/scripts' },
                { label: 'Ask the Coach', href: '/dashboard/coach' },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 text-sm hover:text-primary transition-colors group">
                  <span className="w-4 h-4 rounded border border-current flex items-center justify-center shrink-0 text-muted-foreground group-hover:border-primary" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <MetricsCards
        totalPosts={totalPosts}
        totalViews={totalViews}
        totalLikes={totalLikes}
        avgEngagement={avgEngagement}
      />

      <AnalyticsCharts posts={posts ?? []} />

      {totalPosts === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-4">
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
