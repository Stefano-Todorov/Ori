'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Platform } from '@/lib/types'

export async function deletePost(id: string) {
  const supabase = await createClient()
  await supabase.from('posts').delete().eq('id', id)
  revalidatePath('/posts')
}

export async function deleteScript(id: string) {
  const supabase = await createClient()
  await supabase.from('scripts').delete().eq('id', id)
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
  await supabase.from('scripts').update({ status }).eq('id', id)
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
    difficulty?: 'easy' | 'medium' | 'hard'
    video_type?: string
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
    script_snippet: extra?.script_snippet || null,
    cta: extra?.cta || null,
    caption: extra?.caption || null,
    difficulty: extra?.difficulty || null,
    video_type: extra?.video_type || null,
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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('posts').insert({
    user_id: user.id,
    url: fields.url,
    platform: fields.platform,
    caption: fields.caption || null,
    competitor_handle: fields.competitor_handle || null,
    is_trending: true,
    is_competitor: false,
    tags: fields.tags ?? [],
    thumbnail_url: fields.thumbnail_url || null,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
  })
  revalidatePath('/dashboard/inspo')
}

export async function deleteSwipePost(id: string) {
  const supabase = await createClient()
  await supabase.from('posts').delete().eq('id', id)
  revalidatePath('/dashboard/inspo')
}

export async function updateProfile(fields: {
  name?: string | null
  niche?: string | null
  sub_niche?: string | null
  goals?: string | null
  platforms?: string[]
  posting_target?: number
  telegram_chat_id?: string | null
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
  await supabase.from('content_ideas').delete().eq('id', id)
  revalidatePath('/dashboard/ideas')
}

export async function updateIdeaStatus(id: string, status: 'new' | 'in_progress' | 'done' | 'archived') {
  const supabase = await createClient()
  await supabase.from('content_ideas').update({ status }).eq('id', id)
}

export async function bulkDeleteIdeas(ids: string[]) {
  if (!ids.length) return
  const supabase = await createClient()
  await supabase.from('content_ideas').delete().in('id', ids)
  revalidatePath('/dashboard/ideas')
}

export async function bulkUpdateIdeaStatus(ids: string[], status: 'new' | 'in_progress' | 'done' | 'archived') {
  if (!ids.length) return
  const supabase = await createClient()
  await supabase.from('content_ideas').update({ status }).in('id', ids)
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
  difficulty?: 'easy' | 'medium' | 'hard' | null
  video_type?: string | null
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
    difficulty?: 'easy' | 'medium' | 'hard' | null
    video_type?: string | null
    tags?: string[]
  }
) {
  const supabase = await createClient()
  await supabase.from('content_ideas').update(fields).eq('id', id)
  revalidatePath('/dashboard/ideas')
}

export async function createScheduledPost(fields: {
  platform: Platform
  social_account_id: string
  caption: string
  hashtags: string[]
  video_storage_path: string
  video_public_url?: string
  scheduled_at: string
  script_id?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('scheduled_posts').insert({
    user_id: user.id,
    platform: fields.platform,
    social_account_id: fields.social_account_id,
    caption: fields.caption,
    hashtags: fields.hashtags,
    video_storage_path: fields.video_storage_path,
    video_public_url: fields.video_public_url ?? null,
    scheduled_at: fields.scheduled_at,
    script_id: fields.script_id ?? null,
    status: 'pending',
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/schedule')
  return { error: null }
}

export async function cancelScheduledPost(id: string) {
  const supabase = await createClient()
  await supabase
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', id)
  revalidatePath('/dashboard/schedule')
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

export async function updateCompetitorNotes(id: string, notes: string) {
  const supabase = await createClient()
  await supabase.from('competitors').update({ notes: notes || null }).eq('id', id)
  revalidatePath('/dashboard/competitors')
}

export async function updatePostNotes(id: string, notes: string) {
  const supabase = await createClient()
  await supabase.from('posts').update({ ai_notes: notes || null }).eq('id', id)
  revalidatePath('/dashboard/competitors')
  revalidatePath('/dashboard/inspo')
}

export async function updatePostTitle(id: string, title: string) {
  const supabase = await createClient()
  await supabase.from('posts').update({ title: title || null }).eq('id', id)
  revalidatePath('/dashboard/competitors')
  revalidatePath('/dashboard/inspo')
}

export async function updatePostTags(id: string, tags: string[]) {
  const supabase = await createClient()
  await supabase.from('posts').update({ tags }).eq('id', id)
  revalidatePath('/dashboard/inspo')
}

export async function updateIdeaTags(id: string, tags: string[]) {
  const supabase = await createClient()
  await supabase.from('content_ideas').update({ tags }).eq('id', id)
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
    hook_idea: post.hook_text || null,
    caption: null,
    status: 'new' as const,
  }).select().single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/ideas')
  revalidatePath('/dashboard/inspo')
  return { idea, error: null }
}

export async function disconnectAccount(platform: Platform) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('social_accounts')
    .delete()
    .eq('user_id', user.id)
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
