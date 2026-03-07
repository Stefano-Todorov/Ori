import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IdeasBoard } from '@/components/ideas/ideas-board'

export default async function IdeasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ideas } = await supabase
    .from('content_ideas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Ideas</h1>
        <p className="text-muted-foreground mt-1">Capture and track ideas before they slip away</p>
      </div>
      <IdeasBoard ideas={ideas ?? []} />
    </div>
  )
}
