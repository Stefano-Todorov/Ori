'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Platform } from '@/lib/types'

export async function deletePost(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('posts').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/posts')
}

export async function deleteScript(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('scripts').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/scripts')
}

export async function deleteCompetitor(id: string, deletePosts: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Get the handle before deleting so we can clean up posts
  const { data: comp } = await supabase
    .from('competitors')
    .select('handle')
    .eq('id', id)
    .single()

  await supabase.from('competitors').delete().eq('id', id)

  if (comp?.handle) {
    if (deletePosts) {
      // Delete all posts from this handle
      await supabase
        .from('posts')
        .delete()
        .eq('user_id', user.id)
        .ilike('competitor_handle', comp.handle)
    } else {
      // Keep posts as inspiration
      await supabase
        .from('posts')
        .update({ is_competitor: false })
        .eq('user_id', user.id)
        .ilike('competitor_handle', comp.handle)
    }
  }

  revalidatePath('/dashboard/competitors')
}

export async function updateScriptStatus(id: string, status: 'draft' | 'used' | 'archived') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('scripts').update({ status }).eq('id', id).eq('user_id', user.id)
}

export async function addIdea(
  idea: string,
  source?: string,
  extra?: {
    hook_idea?: string
    inspiration_url?: string
    script_snippet?: string
    cta?: string
    caption?: string
    thumbnail_url?: string
    tags?: string[]
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('content_ideas').insert({
    user_id: user.id,
    idea,
    source: source || null,
    hook_idea: extra?.hook_idea || null,
    inspiration_url: extra?.inspiration_url || null,
    thumbnail_url: extra?.thumbnail_url || null,
    script_snippet: extra?.script_snippet || null,
    cta: extra?.cta || null,
    caption: extra?.caption || null,
    tags: extra?.tags || [],
  })
  revalidatePath('/dashboard/ideas')
}

export async function addSwipePost(fields: {
  url: string
  platform: string
  caption?: string
  competitor_handle?: string
  tags?: string[]
  thumbnail_url?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Try to fetch thumbnail if not provided
  let thumbnail = fields.thumbnail_url || null
  if (!thumbnail && fields.url) {
    try {
      thumbnail = await fetchThumbnailForUrl(fields.url)
    } catch { /* thumbnail is optional */ }
  }

  await supabase.from('posts').insert({
    user_id: user.id,
    url: fields.url,
    platform: fields.platform,
    caption: fields.caption || null,
    competitor_handle: fields.competitor_handle || null,
    is_trending: true,
    is_competitor: false,
    tags: fields.tags ?? [],
    thumbnail_url: thumbnail,
    views: fields.views ?? 0,
    likes: fields.likes ?? 0,
    comments: fields.comments ?? 0,
    shares: fields.shares ?? 0,
    saves: 0,
  })

  // Auto-archive oldest inspo posts beyond 100
  await archiveOldInspo(supabase, user.id)

  revalidatePath('/dashboard/inspo')
}

async function fetchThumbnailForUrl(url: string): Promise<string | null> {
  // Try TikTok oEmbed
  if (url.includes('tiktok.com')) {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json()
        if (data.thumbnail_url) return data.thumbnail_url
      }
    } catch { /* fall through */ }
  }
  // Fallback: fetch page and extract og:image
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Orianna/1.0)', Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const reader = res.body?.getReader()
    if (!reader) return null
    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
    }
    reader.cancel()
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    return ogMatch?.[1] ?? null
  } catch { return null }
}

const INSPO_LIMIT = 100

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function archiveOldInspo(supabase: any, userId: string) {
  // Count active inspo posts
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_trending', true)
    .neq('status', 'archived')

  if (!count || count <= INSPO_LIMIT) return

  // Get IDs of posts beyond the limit (oldest first)
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

  const ids = oldest.map((p: { id: string }) => p.id)
  await supabase
    .from('posts')
    .update({ status: 'archived' })
    .in('id', ids)
}

export async function deleteSwipePost(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('posts').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/inspo')
}

export async function updateProfile(fields: {
  name?: string | null
  niche?: string | null
  sub_niche?: string | null
  goals?: string | null
  platforms?: string[]
  posting_target?: number
  batch_size?: number | null
  telegram_chat_id?: string | null
  auto_sync_own_profile?: boolean
  auto_save_competitor_ideas?: boolean
  creator_context?: string | null
  onboarding_completed?: boolean
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: `Auth error: ${authError?.message ?? 'no user'}` }
  const { error } = await supabase.from('profiles').upsert(
    { user_id: user.id, email: user.email ?? '', ...fields },
    { onConflict: 'user_id' }
  )
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteIdea(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/ideas')
}

export async function updateIdeaStatus(id: string, status: 'new' | 'in_progress' | 'done' | 'archived') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').update({ status }).eq('id', id).eq('user_id', user.id)
}

export async function bulkDeleteIdeas(ids: string[]) {
  if (!ids.length) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').delete().in('id', ids).eq('user_id', user.id)
  revalidatePath('/dashboard/ideas')
}

export async function bulkUpdateIdeaStatus(ids: string[], status: 'new' | 'in_progress' | 'done' | 'archived') {
  if (!ids.length) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').update({ status }).in('id', ids).eq('user_id', user.id)
  revalidatePath('/dashboard/ideas')
}

export async function restoreIdea(idea: {
  idea: string
  source?: string | null
  hook_idea?: string | null
  inspiration_url?: string | null
  script_snippet?: string | null
  cta?: string | null
  caption?: string | null
  status?: 'new' | 'in_progress' | 'done' | 'archived'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('content_ideas').insert({
    user_id: user.id,
    ...idea,
  }).select().single()
  revalidatePath('/dashboard/ideas')
  return data
}

export async function updateIdea(
  id: string,
  fields: {
    idea?: string
    source?: string | null
    hook_idea?: string | null
    inspiration_url?: string | null
    script_snippet?: string | null
    cta?: string | null
    caption?: string | null
    tags?: string[]
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').update(fields).eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/ideas')
}

export async function schedulePost(fields: {
  content_idea_id?: string
  platform?: Platform
  title?: string
  scheduled_date: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('scheduled_posts').insert({
    user_id: user.id,
    content_idea_id: fields.content_idea_id ?? null,
    platform: fields.platform ?? null,
    title: fields.title ?? null,
    scheduled_date: fields.scheduled_date,
    notes: fields.notes ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteScheduledPost(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('scheduled_posts').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard')
}

export async function addCompetitorPost(fields: {
  competitor_handle: string
  platform: Platform
  caption?: string
  url?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  hook_text?: string
  tags?: string[]
  thumbnail_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    platform: fields.platform,
    competitor_handle: fields.competitor_handle,
    caption: fields.caption || null,
    url: fields.url || null,
    views: fields.views ?? 0,
    likes: fields.likes ?? 0,
    comments: fields.comments ?? 0,
    shares: fields.shares ?? 0,
    saves: 0,
    hook_text: fields.hook_text || null,
    tags: fields.tags ?? [],
    thumbnail_url: fields.thumbnail_url || null,
    is_competitor: true,
    is_trending: false,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/competitors')
  return { error: null }
}

export async function addCompetitor(fields: {
  handle: string
  platform: Platform
  profile_url?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const cleanHandle = fields.handle.replace('@', '').trim()
  if (!cleanHandle) return { error: 'Handle is required' }

  // Check if already exists
  const { data: existing } = await supabase
    .from('competitors')
    .select('id')
    .eq('user_id', user.id)
    .ilike('handle', cleanHandle)
    .eq('platform', fields.platform)
    .limit(1)

  if (existing && existing.length > 0) return { error: 'Already tracking this competitor' }

  await supabase.from('competitors').insert({
    user_id: user.id,
    handle: cleanHandle,
    platform: fields.platform,
    display_name: cleanHandle,
    profile_url: fields.profile_url || null,
    notes: fields.notes || null,
  })

  // Auto-populate: mark existing posts from this handle as competitor posts
  await supabase
    .from('posts')
    .update({ is_competitor: true })
    .eq('user_id', user.id)
    .ilike('competitor_handle', cleanHandle)
    .eq('is_competitor', false)

  revalidatePath('/dashboard/competitors')
  return { error: null }
}

export async function linkCompetitors(sourceId: string, targetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: target } = await supabase
    .from('competitors')
    .select('group_id')
    .eq('id', targetId)
    .eq('user_id', user.id)
    .single()
  if (!target) return { error: 'Target not found' }

  const { data: source } = await supabase
    .from('competitors')
    .select('group_id')
    .eq('id', sourceId)
    .eq('user_id', user.id)
    .single()
  if (!source) return { error: 'Source not found' }

  // Move all members of source's group to target's group
  await supabase
    .from('competitors')
    .update({ group_id: target.group_id })
    .eq('user_id', user.id)
    .eq('group_id', source.group_id)

  revalidatePath('/dashboard/competitors')
  return { error: null }
}

export async function unlinkCompetitor(competitorId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newGroupId = crypto.randomUUID()
  await supabase
    .from('competitors')
    .update({ group_id: newGroupId })
    .eq('id', competitorId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/competitors')
  return { error: null }
}

export async function updateCompetitorUrl(id: string, profileUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('competitors').update({ profile_url: profileUrl || null }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/competitors')
}

export async function updateCompetitorNotes(id: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('competitors').update({ notes: notes || null }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/competitors')
}

export async function updatePostNotes(id: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('posts').update({ ai_notes: notes || null }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/competitors')
  revalidatePath('/dashboard/inspo')
}

export async function updatePostTitle(id: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('posts').update({ title: title || null }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/competitors')
  revalidatePath('/dashboard/inspo')
}

export async function updatePostTags(id: string, tags: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('posts').update({ tags }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/inspo')
}

export async function syncInspoTags(tags: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // Merge with existing so we never lose tags
  const { data: profile } = await supabase
    .from('profiles')
    .select('inspo_tags')
    .eq('user_id', user.id)
    .single()
  const existing: string[] = (profile?.inspo_tags as string[]) ?? []
  const merged = [...new Set([...existing, ...tags])].sort()
  await supabase.from('profiles').update({ inspo_tags: merged }).eq('user_id', user.id)
}

export async function deleteInspoTag(tag: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // Remove from profile inspo_tags
  const { data: profile } = await supabase
    .from('profiles')
    .select('inspo_tags')
    .eq('user_id', user.id)
    .single()
  const existing: string[] = (profile?.inspo_tags as string[]) ?? []
  const updated = existing.filter(t => t !== tag)
  await supabase.from('profiles').update({ inspo_tags: updated }).eq('user_id', user.id)
  // Remove tag from all posts that have it
  const { data: posts } = await supabase
    .from('posts')
    .select('id, tags')
    .eq('user_id', user.id)
    .contains('tags', [tag])
  if (posts) {
    await Promise.all(posts.map(p =>
      supabase.from('posts').update({ tags: (p.tags as string[]).filter((t: string) => t !== tag) }).eq('id', p.id)
    ))
  }
  revalidatePath('/dashboard/inspo')
}

export async function updateIdeaTags(id: string, tags: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').update({ tags }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/ideas')
}

export async function createIdeaFromInspo(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()
  if (!post) return { error: 'Post not found' }

  const { data: idea, error } = await supabase.from('content_ideas').insert({
    user_id: user.id,
    idea: post.caption || `Inspired by @${post.competitor_handle || 'unknown'} on ${post.platform}`,
    source: `inspiration: @${post.competitor_handle || 'unknown'} (${post.platform})`,
    inspiration_url: post.url || null,
    thumbnail_url: post.thumbnail_url || null,
    hook_idea: post.hook_text || null,
    caption: null,
    status: 'new' as const,
  }).select().single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/ideas')
  revalidatePath('/dashboard/inspo')
  return { idea, error: null }
}

export async function updateSocialHandles(handles: { platform: Platform; username: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // social_accounts.user_id FK references profiles(id), not auth.users.id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found. Please save your profile first.' }

  for (const { platform, username } of handles) {
    const clean = username.replace(/^@/, '').trim()
    const { error: delErr } = await supabase.from('social_accounts').delete()
      .eq('user_id', profile.id).eq('platform', platform)
    if (delErr) return { error: `Delete failed for ${platform}: ${delErr.message}` }
    if (clean) {
      const { error: insErr } = await supabase.from('social_accounts').insert({
        user_id: profile.id, platform, username: clean,
      })
      if (insErr) return { error: `Save failed for ${platform}: ${insErr.message}` }
    }
  }

  revalidatePath('/dashboard/settings')
  return { error: null }
}

export async function disconnectAccount(platform: Platform) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // social_accounts.user_id FK references profiles(id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('social_accounts')
    .delete()
    .eq('user_id', profile.id)
    .eq('platform', platform)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { error: null }
}

export async function cleanupZeroStatsPosts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { deleted: 0 }
  // Delete posts with 0 views AND 0 likes (broken saves with no real stats)
  const { data } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', user.id)
    .eq('views', 0)
    .eq('likes', 0)
  if (!data || data.length === 0) return { deleted: 0 }
  const ids = data.map(p => p.id)
  await supabase.from('posts').delete().in('id', ids)
  revalidatePath('/dashboard/competitors')
  revalidatePath('/dashboard/inspo')
  return { deleted: ids.length }
}

// ─── Follower Tracking ───────────────────────────────────────────────────────

export async function addFollowerSnapshot(platform: Platform, count: number, recorded_at?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const date = recorded_at || new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('follower_snapshots').upsert({
    user_id: user.id,
    platform,
    count,
    recorded_at: date,
  }, { onConflict: 'user_id,platform,recorded_at' })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteFollowerSnapshot(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('follower_snapshots').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard')
}

// ─── Production Status ───────────────────────────────────────────────────────

export async function updateProductionStatus(ideaId: string, status: 'new' | 'recording' | 'editing' | 'ready' | 'posted') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').update({ production_status: status }).eq('id', ideaId).eq('user_id', user.id)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ideas')
  revalidatePath('/dashboard/schedule')
}

export async function reorderIdeas(orderedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('content_ideas').update({ sort_order: i }).eq('id', id).eq('user_id', user.id)
    )
  )
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/schedule')
}

export async function bulkUpdateProductionStatus(ids: string[], status: 'new' | 'recording' | 'editing' | 'ready' | 'posted') {
  if (!ids.length) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('content_ideas').update({ production_status: status }).in('id', ids).eq('user_id', user.id)
  revalidatePath('/dashboard/ideas')
  revalidatePath('/dashboard')
}

// ─── Recording Days ──────────────────────────────────────────────────────────

export async function addRecordingDay(recording_date: string, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('recording_days').upsert({
    user_id: user.id,
    recording_date,
    notes: notes ?? null,
  }, { onConflict: 'user_id,recording_date' })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteRecordingDay(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('recording_days').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard')
}

export async function addIdeaToRecordingDay(recordingDayId: string, contentIdeaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('recording_day_ideas').upsert({
    recording_day_id: recordingDayId,
    content_idea_id: contentIdeaId,
  }, { onConflict: 'recording_day_id,content_idea_id' })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/schedule')
  return { error: null }
}

export async function removeIdeaFromRecordingDay(recordingDayId: string, contentIdeaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase
    .from('recording_day_ideas')
    .delete()
    .eq('recording_day_id', recordingDayId)
    .eq('content_idea_id', contentIdeaId)
  revalidatePath('/dashboard/schedule')
}

// ─── My Videos: Idea-Video Linking ───────────────────────────────────────────

export async function linkVideoToIdea(postId: string, ideaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Set both sides of the bidirectional link
  const [postResult, ideaResult] = await Promise.all([
    supabase.from('posts').update({ linked_idea_id: ideaId }).eq('id', postId).eq('user_id', user.id),
    supabase.from('content_ideas').update({ linked_post_id: postId }).eq('id', ideaId).eq('user_id', user.id),
  ])

  if (postResult.error) return { error: postResult.error.message }
  if (ideaResult.error) return { error: ideaResult.error.message }

  revalidatePath('/dashboard/my-videos')
  revalidatePath('/dashboard/ideas')
  return { error: null }
}

// ─── Feedback / Bug Reports ──────────────────────────────────────────────────

export async function submitFeedback(fields: {
  type: 'bug' | 'feature' | 'other'
  subject: string
  description: string
  page_url?: string
  image_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    type: fields.type,
    subject: fields.subject,
    description: fields.description,
    page_url: fields.page_url || null,
    image_url: fields.image_url || null,
  })

  if (error) return { error: error.message }
  return { error: null }
}

export async function getUserFeedback() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

export async function unlinkVideoFromIdea(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the linked idea first
  const { data: post } = await supabase
    .from('posts')
    .select('linked_idea_id')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()

  await supabase.from('posts').update({ linked_idea_id: null }).eq('id', postId).eq('user_id', user.id)

  if (post?.linked_idea_id) {
    await supabase.from('content_ideas').update({ linked_post_id: null }).eq('id', post.linked_idea_id).eq('user_id', user.id)
  }

  revalidatePath('/dashboard/my-videos')
  revalidatePath('/dashboard/ideas')
  return { error: null }
}

export async function getOrCreateShareToken() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', token: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('share_token')
    .eq('user_id', user.id)
    .single()

  if (profile?.share_token) return { error: null, token: profile.share_token as string }

  const token = `shr_${crypto.randomUUID().replace(/-/g, '')}`
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, email: user.email ?? '', share_token: token }, { onConflict: 'user_id' })
  if (error) return { error: error.message, token: null }
  return { error: null, token }
}

export async function regenerateShareToken() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', token: null }

  const token = `shr_${crypto.randomUUID().replace(/-/g, '')}`
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, email: user.email ?? '', share_token: token }, { onConflict: 'user_id' })
  if (error) return { error: error.message, token: null }
  return { error: null, token }
}
