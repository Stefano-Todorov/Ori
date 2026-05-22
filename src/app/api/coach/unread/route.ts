import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Read-only: returns the unread proactive-message count.
// Unlike /api/coach/history, this does NOT mark messages as read.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('last_coach_read_at')
    .eq('user_id', user.id)
    .single()

  const lastReadAt = profile?.last_coach_read_at ?? '1970-01-01T00:00:00Z'

  const { count } = await supabase
    .from('coach_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('proactive', true)
    .gt('created_at', lastReadAt)

  return NextResponse.json({ count: count ?? 0 })
}
