import { NextRequest } from 'next/server'
import { authenticateExtensionRequest, optionsResponse, jsonResponse } from '@/lib/extension-auth'

export async function OPTIONS() {
  return optionsResponse()
}

// Called by Chrome extension — auth via Bearer token (Supabase JWT)
export async function GET(req: NextRequest) {
  const auth = await authenticateExtensionRequest(req, 'extension-context')
  if ('status' in auth) return auth
  const { user, supabase } = auth

  // Fetch profile first — needed to look up social_accounts by profiles.id (FK target)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, niche, sub_niche, goals, auto_sync_own_profile, last_synced_at')
    .eq('user_id', user.id)
    .single()

  const [{ data: competitors }, { data: competitorPosts }, { data: tagPosts }, { data: socialAccounts }] = await Promise.all([
    supabase
      .from('competitors')
      .select('id, handle, platform, display_name, group_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('posts')
      .select('competitor_handle')
      .eq('user_id', user.id)
      .eq('is_competitor', true),
    supabase
      .from('posts')
      .select('tags')
      .eq('user_id', user.id)
      .not('tags', 'eq', '{}'),
    profile
      ? supabase.from('social_accounts').select('platform, username').eq('user_id', profile.id)
      : Promise.resolve({ data: [] }),
  ])

  // Group competitors by group_id (cross-platform account linking)
  const groupMap = new Map<string, { handle: string; handles: string[]; platforms: string[]; display_name: string; postCount: number }>()
  const handleToGroup = new Map<string, string>()

  for (const c of (competitors ?? [])) {
    handleToGroup.set(c.handle.toLowerCase(), c.group_id)
    const existing = groupMap.get(c.group_id)
    if (existing) {
      if (!existing.handles.includes(c.handle.toLowerCase())) existing.handles.push(c.handle.toLowerCase())
      if (!existing.platforms.includes(c.platform)) existing.platforms.push(c.platform)
    } else {
      groupMap.set(c.group_id, {
        handle: c.handle,
        handles: [c.handle.toLowerCase()],
        platforms: [c.platform],
        display_name: c.display_name || c.handle,
        postCount: 0,
      })
    }
  }

  // Count posts per group
  for (const post of (competitorPosts ?? [])) {
    if (!post.competitor_handle) continue
    const groupId = handleToGroup.get(post.competitor_handle.toLowerCase())
    if (groupId) {
      const entry = groupMap.get(groupId)
      if (entry) entry.postCount++
    }
  }

  // Collect unique tags from profile saved tags + post tags
  const profileTags: string[] = []
  const allTags = [...new Set([...profileTags, ...(tagPosts ?? []).flatMap((p: { tags: string[] }) => p.tags ?? [])])].sort()

  return jsonResponse({
    competitors: Array.from(groupMap.values()),
    profile: profile ?? {},
    allTags,
    socialAccounts: (socialAccounts ?? []).map(a => ({ platform: a.platform, username: a.username })),
  })
}
