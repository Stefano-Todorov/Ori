import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleCalendar } from '@/components/dashboard/schedule-calendar'
import { PlanPostForm } from '@/components/schedule/plan-post-form'
import { ProductionTracker } from '@/components/schedule/production-tracker'
import { ScheduledPostsList } from '@/components/schedule/scheduled-posts-list'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: scheduledPosts },
    { data: allIdeas },
    { data: profileData },
  ] = await Promise.all([
    supabase
      .from('scheduled_posts')
      .select('*, content_idea:content_ideas(id, idea, tags, hook_idea, cta)')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('posting_target, batch_size')
      .eq('user_id', user.id)
      .single(),
  ])

  const batchSize = profileData?.batch_size ?? profileData?.posting_target ?? 3
  const ideas = allIdeas ?? []
  const availableIdeas = ideas.filter(i => i.status === 'new' || i.status === 'in_progress')
  const pipelineIdeas = ideas.filter(i => i.production_status !== 'new' || i.status !== 'new')

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="text-muted-foreground mt-1">Plan your posts and track production</p>
      </div>

      {/* Calendar + Plan form side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ScheduleCalendar scheduledPosts={scheduledPosts ?? []} />
        </div>
        <PlanPostForm ideas={availableIdeas} />
      </div>

      {/* Scheduled posts list */}
      <ScheduledPostsList posts={scheduledPosts ?? []} />

      {/* Production pipeline */}
      <ProductionTracker ideas={pipelineIdeas} batchSize={batchSize} />
    </div>
  )
}
