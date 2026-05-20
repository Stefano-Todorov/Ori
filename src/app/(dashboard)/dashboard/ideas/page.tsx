import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IdeasBoard } from '@/components/ideas/ideas-board'
import { getAllUserTags } from '@/lib/tags'

export default async function IdeasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: ideas }, allTags, { data: scheduled }, { data: profile }] = await Promise.all([
    supabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getAllUserTags(user.id),
    supabase
      .from('scheduled_posts')
      .select('content_idea_id, scheduled_date')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('profiles')
      .select('platforms')
      .eq('user_id', user.id)
      .single(),
  ])

  const platform = profile?.platforms?.[0] ?? 'tiktok'

  // Earliest scheduled date per idea (matches scheduleIdea's update target)
  const scheduledDates: Record<string, string> = {}
  for (const s of scheduled ?? []) {
    if (s.content_idea_id && !(s.content_idea_id in scheduledDates)) {
      scheduledDates[s.content_idea_id] = s.scheduled_date
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <IdeasBoard ideas={ideas ?? []} allTags={allTags} scheduledDates={scheduledDates} platform={platform} />
    </div>
  )
}
