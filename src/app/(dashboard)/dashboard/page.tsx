import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Lightbulb, MessageSquare } from 'lucide-react'
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

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const [
    { data: followerSnapshots },
    { data: productionIdeas },
    { data: scheduledPosts },
    { data: recordingDays },
    { data: recentIdeas },
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
      .in('production_status', ['recording', 'editing', 'posted'])
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
      .select('id, idea, difficulty, status')
      .eq('user_id', user.id)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(3),
  ])

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
          <Link
            href="/dashboard/coach"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-500/20 hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Sparkles size={14} />
            Ask Orianna
          </Link>
        </div>
      </div>

      {/* ─── Quick Actions + Next to Film ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="md:col-span-2 bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-5 space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Quick actions</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/scripts"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-500/20 hover:brightness-110 transition-all duration-150"
            >
              <Sparkles size={14} /> Generate Script
            </Link>
            <Link
              href="/dashboard/ideas"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border dark:border-white/10 text-foreground text-sm font-medium hover:bg-muted dark:hover:bg-white/5 transition-all duration-150"
            >
              <Lightbulb size={14} className="text-amber-500" /> Add Idea
            </Link>
            <Link
              href="/dashboard/coach"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border dark:border-white/10 text-foreground text-sm font-medium hover:bg-muted dark:hover:bg-white/5 transition-all duration-150"
            >
              <MessageSquare size={14} className="text-teal-500" /> Ask Coach
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Follower Tracking ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <FollowerChart snapshots={followerSnapshots ?? []} />
        </div>
        <AddFollowersForm />
      </div>

      {/* ─── Kanban Board ─── */}
      <KanbanBoard ideas={productionIdeas ?? []} />

      {/* ─── Calendar ─── */}
      <ScheduleCalendar
        scheduledPosts={scheduledPosts ?? []}
        recordingDays={recordingDays ?? []}
      />
    </div>
  )
}
