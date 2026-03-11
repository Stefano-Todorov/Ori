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

  const [{ data: competitors }, { data: profile }, { data: competitorPosts }, { data: tagPosts }] = await Promise.all([
    supabase
      .from('competitors')
      .select('id, handle, platform, display_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('niche, sub_niche, goals')
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
  ])

  // Group competitors by handle (cross-platform) with post counts
  const handleMap = new Map<string, { handle: string; platforms: string[]; display_name: string; postCount: number }>()

  for (const c of (competitors ?? [])) {
    const key = c.handle.toLowerCase()
    const existing = handleMap.get(key)
    if (existing) {
      if (!existing.platforms.includes(c.platform)) existing.platforms.push(c.platform)
    } else {
      handleMap.set(key, {
        handle: c.handle,
        platforms: [c.platform],
        display_name: c.display_name || c.handle,
        postCount: 0,
      })
    }
  }

  // Count posts per handle
  for (const post of (competitorPosts ?? [])) {
    if (!post.competitor_handle) continue
    const key = post.competitor_handle.toLowerCase()
    const entry = handleMap.get(key)
    if (entry) entry.postCount++
  }

  // Collect unique tags from all posts
  const allTags = [...new Set((tagPosts ?? []).flatMap((p: { tags: string[] }) => p.tags ?? []))].sort()

  return NextResponse.json({
    competitors: Array.from(handleMap.values()),
    profile: profile ?? {},
    allTags,
  }, { headers: corsHeaders })
}
