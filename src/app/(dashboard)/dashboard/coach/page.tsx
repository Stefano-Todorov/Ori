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
    <div className="flex flex-col h-full" style={{ background: '#0a0a0f' }}>
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white' }}>AI Coach</h1>
        <p style={{ color: '#9ca3af', fontSize: 15, marginTop: 4 }}>
          Your AI marketing manager — strategy, content ideas, competitor analysis, and growth.
        </p>
      </div>
      <CoachChat initialHistory={history ?? []} />
    </div>
  )
}
