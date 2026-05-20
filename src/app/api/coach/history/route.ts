import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: history }] = await Promise.all([
    supabase
      .from('coach_messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50),
    supabase
      .from('profiles')
      .update({ last_coach_read_at: new Date().toISOString() })
      .eq('user_id', user.id),
  ])

  return NextResponse.json({ history: history ?? [] })
}
