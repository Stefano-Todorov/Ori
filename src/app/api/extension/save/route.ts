import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
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

  const body = await req.json()
  const { type, platform, url, caption, views, likes, comments, shares, saves, hook_text, hashtags, duration, audio, notes } = body
  const handle = body.handle || body.competitorHandle

  // Add competitor only (no post) — from profile page
  if (type === 'add-competitor' && handle) {
    const { data: existing } = await supabase
      .from('competitors')
      .select('id')
      .eq('user_id', user.id)
      .ilike('handle', handle)
      .limit(1)

    if (!existing || existing.length === 0) {
      await supabase.from('competitors').insert({
        user_id: user.id,
        handle,
        platform,
        display_name: handle,
      })
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  }

  // Save as inspiration → content_ideas + posts (competitor) + auto-add competitor
  if (type === 'inspiration') {
    if (!platform) return NextResponse.json({ error: 'platform is required' }, { status: 400, headers: corsHeaders })

    // Check duplicate by URL in both tables
    if (url) {
      const [{ data: existingIdea }, { data: existingPost }] = await Promise.all([
        supabase.from('content_ideas').select('id').eq('user_id', user.id).eq('inspiration_url', url).limit(1),
        supabase.from('posts').select('id').eq('user_id', user.id).eq('url', url).limit(1),
      ])
      if ((existingIdea && existingIdea.length > 0) || (existingPost && existingPost.length > 0)) {
        return NextResponse.json({ error: 'Already saved', duplicate: true }, { status: 409, headers: corsHeaders })
      }
    }

    // Auto-add competitor if handle provided
    if (handle) {
      const profileUrl = platform === 'instagram'
        ? `https://instagram.com/${handle}`
        : platform === 'tiktok'
        ? `https://tiktok.com/@${handle}`
        : null

      const { data: existingComp } = await supabase
        .from('competitors')
        .select('id')
        .eq('user_id', user.id)
        .ilike('handle', handle)
        .limit(1)
      if (!existingComp || existingComp.length === 0) {
        await supabase.from('competitors').insert({
          user_id: user.id,
          handle,
          platform,
          display_name: handle,
          profile_url: profileUrl,
        })
      }
    }

    // Save to content_ideas (shows in Ideas tab)
    const ideaRow = {
      user_id: user.id,
      idea: caption || `Inspiration from @${handle || 'unknown'} on ${platform}`,
      source: `inspiration: @${handle || 'unknown'} (${platform})`,
      inspiration_url: url || null,
      hook_idea: hook_text || null,
      caption: caption || null,
      status: 'new' as const,
    }

    // Save to posts as competitor post (shows under competitor)
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
      is_competitor: true,
      competitor_handle: handle || null,
      is_trending: false,
    }

    const [ideaResult, postResult] = await Promise.all([
      supabase.from('content_ideas').insert(ideaRow),
      supabase.from('posts').insert(postRow),
    ])

    if (ideaResult.error) return NextResponse.json({ error: ideaResult.error.message }, { status: 500, headers: corsHeaders })
    if (postResult.error) return NextResponse.json({ error: postResult.error.message }, { status: 500, headers: corsHeaders })

    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  }

  if (!platform) return NextResponse.json({ error: 'platform is required' }, { status: 400, headers: corsHeaders })

  // Check for duplicate URL
  if (url) {
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('url', url)
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Already saved', duplicate: true }, { status: 409, headers: corsHeaders })
    }
  }

  let competitorHandle = null

  if (type === 'competitor' && handle) {
    // Auto-detect: check if this handle is already a tracked competitor (any platform)
    const { data: existingCompetitors } = await supabase
      .from('competitors')
      .select('id, handle, platform')
      .eq('user_id', user.id)
      .ilike('handle', handle)

    if (!existingCompetitors || existingCompetitors.length === 0) {
      // Auto-create new competitor
      await supabase.from('competitors').insert({
        user_id: user.id,
        handle,
        platform,
        display_name: handle,
      })
    }

    competitorHandle = handle
  }

  const aiNotes = [
    audio ? `Sound/audio: ${audio}` : null,
    notes ? notes : null,
  ].filter(Boolean).join('\n') || null

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
    ai_notes: aiNotes,
    is_competitor: type === 'competitor',
    competitor_handle: competitorHandle,
    is_trending: type === 'swipe',
  }

  const { error } = await supabase.from('posts').insert(postRow)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })

  return NextResponse.json({ ok: true, isNew: type === 'competitor' && competitorHandle ? true : false }, { headers: corsHeaders })
}
