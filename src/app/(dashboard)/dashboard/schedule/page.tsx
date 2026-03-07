import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleForm } from '@/components/schedule/schedule-form'
import { ScheduleQueue } from '@/components/schedule/schedule-queue'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accounts }, { data: scheduledPosts }] = await Promise.all([
    supabase.from('social_accounts').select('*').eq('user_id', user.id),
    supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-muted-foreground mt-1">Upload videos and schedule posts to your connected accounts</p>
      </div>

      <ScheduleForm accounts={accounts ?? []} />
      <ScheduleQueue posts={scheduledPosts ?? []} />
    </div>
  )
}
