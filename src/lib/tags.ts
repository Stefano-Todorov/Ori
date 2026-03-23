import { createClient } from '@/lib/supabase/server'

/**
 * Fetch all tags used anywhere in the app for a given user.
 * Merges tags from: content_ideas, inspo posts (is_trending), and profile.inspo_tags.
 */
export async function getAllUserTags(userId: string): Promise<string[]> {
  const supabase = await createClient()

  const [{ data: ideas }, { data: posts }, { data: profile }] = await Promise.all([
    supabase
      .from('content_ideas')
      .select('tags')
      .eq('user_id', userId),
    supabase
      .from('posts')
      .select('tags')
      .eq('user_id', userId)
      .eq('is_trending', true),
    supabase
      .from('profiles')
      .select('inspo_tags')
      .eq('user_id', userId)
      .single(),
  ])

  const ideaTags = (ideas ?? []).flatMap(i => i.tags ?? [])
  const postTags = (posts ?? []).flatMap(p => p.tags ?? [])
  const savedTags: string[] = profile?.inspo_tags ?? []

  return [...new Set([...ideaTags, ...postTags, ...savedTags])].sort()
}
