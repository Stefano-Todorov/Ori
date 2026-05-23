import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FollowerChart } from '@/components/dashboard/follower-chart'
import { AddFollowersForm } from '@/components/dashboard/add-followers-form'
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import { ScheduleCalendar } from '@/components/dashboard/schedule-calendar'
import { NextActionHero } from '@/components/dashboard/next-action-hero'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const [
    { data: followerSnapshots },
    { data: productionIdeas },
    { data: scheduledPosts },
    { data: recordingDays },
    { count: ideaCount },
  ] = await Promise.all([
    supabase
      .from('follower_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: true }),
    supabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', user.id)
      .in('production_status', ['recording', 'editing', 'ready', 'posted'])
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('recording_days')
      .select('*')
      .eq('user_id', user.id)
      .order('recording_date', { ascending: true }),
    supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  // Next-action stage: 'start' (no ideas) → 'plan' (ideas, nothing scheduled) → 'active'
  const totalIdeas = ideaCount ?? 0
  const scheduledCount = scheduledPosts?.length ?? 0
  const stage: 'start' | 'plan' | 'active' =
    totalIdeas === 0 ? 'start' : scheduledCount === 0 ? 'plan' : 'active'

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{profile?.name ? `, ${profile.name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          {profile?.niche ? `${profile.niche} creator` : 'Your content overview'}
        </p>
      </div>

      {/* ─── Next-action hero (beginner stages only) ─── */}
      {stage !== 'active' && <NextActionHero stage={stage} ideaCount={totalIdeas} />}

      {/* ─── Widgets — hidden entirely until the user has at least one idea ─── */}
      {stage !== 'start' && (
        <>
          {/* Follower Tracking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <FollowerChart snapshots={followerSnapshots ?? []} activePlatforms={profile?.platforms} />
            </div>
            <AddFollowersForm activePlatforms={profile?.platforms} snapshots={followerSnapshots ?? []} />
          </div>

          {/* Kanban Board */}
          <KanbanBoard ideas={productionIdeas ?? []} batchSize={profile?.batch_size ?? profile?.posting_target ?? 3} />

          {/* Calendar */}
          <ScheduleCalendar
            scheduledPosts={scheduledPosts ?? []}
            recordingDays={recordingDays ?? []}
          />
        </>
      )}
    </div>
  )
}
