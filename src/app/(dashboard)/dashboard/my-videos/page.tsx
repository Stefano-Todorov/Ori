import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyVideosList } from '@/components/my-videos/my-videos-list'

export default async function MyVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: posts }, { data: ideas }, { data: scripts }, { data: profile }] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .eq('is_trending', false)
      .order('posted_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('content_ideas')
      .select('id, idea, hook_idea, status, linked_post_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('scripts')
      .select('id, topic, hook, body, cta, eval_score, eval_tags, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('profiles')
      .select('last_synced_at')
      .eq('user_id', user.id)
      .single(),
  ])

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <MyVideosList
        posts={posts ?? []}
        ideas={ideas ?? []}
        scripts={scripts ?? []}
        lastSyncedAt={(profile?.last_synced_at as Record<string, string>) ?? {}}
      />
    </div>
  )
}
