import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { SchedulePlanner } from '@/components/schedule/schedule-planner'

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
      .order('sort_order', { ascending: true })
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
  // All ideas across every pipeline stage (the New column holds the
  // not-yet-started backlog), excluding archived ones.
  const pipelineIdeas = ideas.filter(i => i.status !== 'archived')

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          Schedule
          <InfoTooltip text="Plan your posting calendar and track ideas through production. Drag a pipeline card onto a calendar day to schedule it." />
        </h1>
        <p className="text-muted-foreground mt-1">Plan your posts and track production</p>
      </div>

      <SchedulePlanner
        scheduledPosts={scheduledPosts ?? []}
        pipelineIdeas={pipelineIdeas}
        availableIdeas={availableIdeas}
        allIdeas={ideas}
        batchSize={batchSize}
      />
    </div>
  )
}
