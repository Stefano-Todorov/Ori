import { NextRequest } from 'next/server'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

const INSPO_LIMIT = 100

async function archiveOldInspo(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_trending', true)
    .neq('status', 'archived')
  if (!count || count <= INSPO_LIMIT) return
  const excess = count - INSPO_LIMIT
  const { data: oldest } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_trending', true)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })
    .limit(excess)
  if (!oldest || oldest.length === 0) return
  await supabase
    .from('posts')
    .update({ status: 'archived' })
    .in('id', oldest.map((p: { id: string }) => p.id))
}

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(req: NextRequest) {
  const auth = await authenticateExtensionRequest(req, 'extension-save')
  if ('status' in auth) return auth
  const { user, supabase } = auth

  const body = await req.json()
  const { type, platform, url, caption, views, likes, comments, shares, saves, hook_text, hashtags, duration, audio, notes, tags, thumbnail } = body
  const handle = body.handle || body.competitorHandle

  // Add competitor only (no post) — from profile page
  if (type === 'add-competitor' && handle) {
    // Check if already tracked on THIS platform (not just any platform)
    const { data: existingOnPlatform } = await supabase
      .from('competitors')
      .select('id')
      .eq('user_id', user.id)
      .ilike('handle', handle)
      .eq('platform', platform)
      .limit(1)

    if (!existingOnPlatform || existingOnPlatform.length === 0) {
      const profileUrl = platform === 'instagram'
        ? `https://instagram.com/${handle}`
        : platform === 'tiktok'
        ? `https://tiktok.com/@${handle}`
        : platform === 'youtube'
        ? `https://youtube.com/@${handle}`
        : null

      // Check if already tracked on a different platform — auto-link to same group
      const { data: existingOther } = await supabase
        .from('competitors')
        .select('group_id')
        .eq('user_id', user.id)
        .ilike('handle', handle)
        .limit(1)

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        handle,
        platform,
        display_name: handle,
        profile_url: profileUrl,
      }
      // If same handle exists on another platform, join their group
      if (existingOther && existingOther.length > 0) {
        insertData.group_id = existingOther[0].group_id
      }

      await supabase.from('competitors').insert(insertData)
    }

    // Auto-populate: mark any existing posts from this handle as competitor posts
    await supabase
      .from('posts')
      .update({ is_competitor: true, competitor_handle: handle })
      .eq('user_id', user.id)
      .ilike('competitor_handle', handle)
      .eq('is_competitor', false)

    return jsonResponse({ ok: true })
  }

  // Save as inspiration → Inspo tab (+ competitor tab if creator is already tracked)
  if (type === 'inspiration') {
    if (!platform) return errorResponse('platform is required', 400)

    // Check duplicate by URL
    const force = body.force // 'replace' = delete old + save new, 'keep' = save new anyway
    if (url && !force) {
      const { data: existingPost } = await supabase
        .from('posts').select('id').eq('user_id', user.id).eq('url', url).limit(1)
      if (existingPost && existingPost.length > 0) {
        return jsonResponse({ error: 'Already saved', duplicate: true }, 409)
      }
    }

    // If replacing, delete old entry
    if (url && force === 'replace') {
      await supabase.from('posts').delete().eq('user_id', user.id).eq('url', url)
    }

    // Check if handle matches an existing tracked competitor
    let isTrackedCompetitor = false
    if (handle) {
      const { data: existingComp } = await supabase
        .from('competitors')
        .select('id')
        .eq('user_id', user.id)
        .ilike('handle', handle)
        .limit(1)
      isTrackedCompetitor = (existingComp && existingComp.length > 0) ?? false
    }

    // Save to posts — always goes to Inspo, also to Competitors if tracked
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
      ai_notes: notes || null,
      is_competitor: isTrackedCompetitor,
      competitor_handle: handle || null,
      is_trending: true,
      tags: tags ?? [],
      thumbnail_url: thumbnail || null,
    }

    const { error } = await supabase.from('posts').insert(postRow)
    if (error) {
      console.error('[extension/save] DB error:', error.message)
      return errorResponse('Failed to save post', 500)
    }

    // Auto-archive oldest inspo posts beyond 100
    await archiveOldInspo(supabase, user.id)

    return jsonResponse({ ok: true })
  }

  if (!platform) return errorResponse('platform is required', 400)

  // Check for duplicate URL
  if (url) {
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('url', url)
      .limit(1)
    if (existing && existing.length > 0) {
      return jsonResponse({ error: 'Already saved', duplicate: true }, 409)
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
      const profileUrl = platform === 'instagram'
        ? `https://instagram.com/${handle}`
        : platform === 'tiktok'
        ? `https://tiktok.com/@${handle}`
        : platform === 'youtube'
        ? `https://youtube.com/@${handle}`
        : null

      // Auto-create new competitor
      await supabase.from('competitors').insert({
        user_id: user.id,
        handle,
        platform,
        display_name: handle,
        profile_url: profileUrl,
      })
    }

    competitorHandle = handle
  }

  const aiNotes = notes || null

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
    tags: tags ?? [],
    thumbnail_url: thumbnail || null,
  }

  const { error } = await supabase.from('posts').insert(postRow)
  if (error) {
    console.error('[extension/save] DB error:', error.message)
    return errorResponse('Failed to save post', 500)
  }

  // Auto-archive oldest inspo posts beyond 100
  if (type === 'swipe') {
    await archiveOldInspo(supabase, user.id)
  }

  return jsonResponse({ ok: true, isNew: type === 'competitor' && competitorHandle ? true : false })
}
