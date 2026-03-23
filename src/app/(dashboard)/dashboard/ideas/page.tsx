import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IdeasBoard } from '@/components/ideas/ideas-board'
import { getAllUserTags } from '@/lib/tags'

export default async function IdeasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: ideas }, allTags] = await Promise.all([
    supabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getAllUserTags(user.id),
  ])

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <IdeasBoard ideas={ideas ?? []} allTags={allTags} />
    </div>
  )
}
