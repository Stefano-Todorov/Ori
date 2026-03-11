import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleCalendar } from '@/components/dashboard/schedule-calendar'
import { PlanPostForm } from '@/components/schedule/plan-post-form'
import { RecordingDaysManager } from '@/components/schedule/recording-days-manager'
import { ProductionTracker } from '@/components/schedule/production-tracker'
import { ScheduledPostsList } from '@/components/schedule/scheduled-posts-list'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: scheduledPosts },
    { data: recordingDaysRaw },
    { data: allIdeas },
  ] = await Promise.all([
    supabase
      .from('scheduled_posts')
      .select('*, content_idea:content_ideas(id, idea)')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('recording_days')
      .select('*, recording_day_ideas(content_idea_id, content_idea:content_ideas(*))')
      .eq('user_id', user.id)
      .order('recording_date', { ascending: true }),
    supabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  // Transform recording days to include ideas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingDays = (recordingDaysRaw ?? []).map((day: any) => ({
    id: day.id as string,
    recording_date: day.recording_date as string,
    notes: day.notes as string | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ideas: (day.recording_day_ideas ?? []).map((rdi: any) => rdi.content_idea).filter(Boolean),
  }))

  const ideas = allIdeas ?? []
  const availableIdeas = ideas.filter(i => i.status === 'new' || i.status === 'in_progress')
  const pipelineIdeas = ideas.filter(i => i.production_status !== 'new' || i.status !== 'new')

  // Transform recording days for calendar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingDaysForCalendar = (recordingDaysRaw ?? []).map((d: any) => ({
    id: d.id as string,
    user_id: user.id,
    recording_date: d.recording_date as string,
    notes: d.notes as string | null,
    created_at: d.created_at as string,
  }))

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="text-muted-foreground mt-1">Plan your posts, manage recording days, and track production</p>
      </div>

      {/* Calendar + Plan form side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ScheduleCalendar
            scheduledPosts={scheduledPosts ?? []}
            recordingDays={recordingDaysForCalendar}
          />
        </div>
        <PlanPostForm ideas={availableIdeas} />
      </div>

      {/* Scheduled posts list */}
      <ScheduledPostsList posts={scheduledPosts ?? []} />

      {/* Recording days */}
      <RecordingDaysManager
        recordingDays={recordingDays}
        availableIdeas={availableIdeas}
      />

      {/* Production pipeline */}
      <ProductionTracker ideas={pipelineIdeas} />
    </div>
  )
}
