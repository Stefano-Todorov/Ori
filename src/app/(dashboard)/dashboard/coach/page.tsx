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
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">AI Coach</h1>
        <p className="text-muted-foreground text-[15px] mt-1">
          Your AI marketing manager — strategy, content ideas, competitor analysis, and growth.
        </p>
      </div>
      <CoachChat initialHistory={history ?? []} />
    </div>
  )
}
