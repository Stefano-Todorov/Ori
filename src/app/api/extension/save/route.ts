import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = await req.json()
  const { type, competitorHandle, platform, url, caption, views, likes, comments, shares, saves, hook_text, hashtags, duration, audio } = body

  if (!platform) return NextResponse.json({ error: 'platform is required' }, { status: 400 })

  const postRow = {
    user_id: user.id,
    platform,
    url: url || null,
    caption: caption || null,
    views: views ?? 0,
    likes: likes ?? 0,
    comments: comments ?? 0,
    shares: shares ?? 0,
    saves: saves ?? 0,
    hook_text: hook_text || null,
    hashtags: hashtags ?? [],
    duration_seconds: duration || null,
    ai_notes: audio ? `Sound/audio: ${audio}` : null,
    is_competitor: type === 'competitor',
    competitor_handle: type === 'competitor' ? (competitorHandle || null) : null,
    is_trending: type === 'swipe',
  }

  const { error } = await supabase.from('posts').insert(postRow)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
