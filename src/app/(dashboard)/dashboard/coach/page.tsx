import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CoachChat } from '@/components/coach/coach-chat'

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: history } = await supabase
    .from('coach_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">AI Coach</h1>
        <p className="text-muted-foreground mt-1">
          Your personal content strategist — ask anything about your niche, scripts, or growth strategy.
        </p>
      </div>
      <CoachChat initialHistory={history ?? []} />
    </div>
  )
}
