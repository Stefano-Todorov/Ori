import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

// Called by Chrome extension — auth via Bearer token (Supabase JWT)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const [{ data: competitors }, { data: profile }, { data: competitorPosts }, { data: tagPosts }, { data: socialAccounts }] = await Promise.all([
    supabase
      .from('competitors')
      .select('id, handle, platform, display_name, group_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('niche, sub_niche, goals, inspo_tags, auto_sync_own_profile, last_synced_at')
      .eq('user_id', user.id)
      .single(),
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
    supabase
      .from('social_accounts')
      .select('platform, username')
      .eq('user_id', user.id),
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
  const profileTags: string[] = profile?.inspo_tags ?? []
  const allTags = [...new Set([...profileTags, ...(tagPosts ?? []).flatMap((p: { tags: string[] }) => p.tags ?? [])])].sort()

  return NextResponse.json({
    competitors: Array.from(groupMap.values()),
    profile: profile ?? {},
    allTags,
    socialAccounts: (socialAccounts ?? []).map(a => ({ platform: a.platform, username: a.username })),
  }, { headers: corsHeaders })
}
