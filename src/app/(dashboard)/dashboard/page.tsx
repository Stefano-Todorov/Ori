import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { FollowerChart } from '@/components/dashboard/follower-chart'
import { AddFollowersForm } from '@/components/dashboard/add-followers-form'
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import { ScheduleCalendar } from '@/components/dashboard/schedule-calendar'

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
  ])

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
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
          <Link
            href="/dashboard/coach"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            <Sparkles size={14} />
            Ask Orianna
          </Link>
        </div>
      </div>

      {/* ─── Follower Tracking ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <FollowerChart snapshots={followerSnapshots ?? []} activePlatforms={profile?.platforms} />
        </div>
        <AddFollowersForm activePlatforms={profile?.platforms} snapshots={followerSnapshots ?? []} />
      </div>

      {/* ─── Kanban Board ─── */}
      <KanbanBoard ideas={productionIdeas ?? []} batchSize={profile?.batch_size ?? profile?.posting_target ?? 3} />

      {/* ─── Calendar ─── */}
      <ScheduleCalendar
        scheduledPosts={scheduledPosts ?? []}
        recordingDays={recordingDays ?? []}
      />
    </div>
  )
}
