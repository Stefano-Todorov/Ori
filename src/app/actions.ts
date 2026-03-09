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

export async function deleteCompetitor(id: string) {
  const supabase = await createClient()
  await supabase.from('competitors').delete().eq('id', id)
  revalidatePath('/competitors')
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
  })
  revalidatePath('/dashboard/ideas')
}

export async function addSwipePost(fields: {
  url: string
  platform: string
  caption?: string
  competitor_handle?: string
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
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
  })
  revalidatePath('/dashboard/trending')
}

export async function deleteSwipePost(id: string) {
  const supabase = await createClient()
  await supabase.from('posts').delete().eq('id', id)
  revalidatePath('/dashboard/trending')
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
    is_competitor: true,
    is_trending: false,
  })

  if (error) return { error: error.message }
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
