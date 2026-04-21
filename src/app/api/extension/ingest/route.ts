import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import { z } from 'zod'

const PostSchema = z.object({
  url: z.string().nullish(),
  caption: z.string().nullish(),
  views: z.number().default(0),
  likes: z.number().default(0),
  comments: z.number().default(0),
  shares: z.number().default(0),
  saves: z.number().default(0),
  hashtags: z.array(z.string()).default([]),
  posted_at: z.string().nullish(),
  thumbnail: z.string().nullish(),
})

const IngestSchema = z.object({
  platform: z.enum(['tiktok', 'instagram']),
  competitor_handle: z.string().optional(),
  is_trending: z.boolean().default(false),
  posts: z.array(PostSchema),
})

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request: NextRequest) {
  const auth = await authenticateExtensionRequest(request, 'extension-ingest', { allowCookieAuth: true })
  if ('status' in auth) return auth
  const { user, supabase } = auth

  const body = await request.json()
  const parsed = IngestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse({ error: 'Invalid payload', details: parsed.error.issues }, 400)
  }

  const { platform, competitor_handle, is_trending, posts: rawPosts } = parsed.data

  // Deduplicate: filter out posts whose URLs already exist for this user
  let posts = rawPosts
  let skipped = 0
  const incomingUrls = rawPosts.map(p => p.url).filter(Boolean) as string[]
  if (incomingUrls.length > 0) {
    const existingUrls = new Set<string>()
    // Chunk into batches of 100 to avoid query size limits
    for (let i = 0; i < incomingUrls.length; i += 100) {
      const chunk = incomingUrls.slice(i, i + 100)
      const { data: existing } = await supabase
        .from('posts')
        .select('url')
        .eq('user_id', user.id)
        .in('url', chunk)
      if (existing) existing.forEach(p => { if (p.url) existingUrls.add(p.url) })
    }
    posts = rawPosts.filter(p => !p.url || !existingUrls.has(p.url))
    skipped = rawPosts.length - posts.length
  }

  if (posts.length === 0) {
    return jsonResponse({ ingested: 0, skipped })
  }

  // Upsert competitor record if applicable
  if (competitor_handle) {
    const cleanHandle = competitor_handle.replace('@', '')
    const profileUrl = platform === 'instagram'
      ? `https://instagram.com/${cleanHandle}`
      : platform === 'tiktok'
      ? `https://tiktok.com/@${cleanHandle}`
      : null

    await supabase.from('competitors').upsert({
      user_id: user.id,
      platform,
      handle: cleanHandle,
      profile_url: profileUrl,
      last_scraped_at: new Date().toISOString(),
    })
  }

  const postRecords = posts.map((p) => ({
    user_id: user.id,
    platform,
    url: p.url ?? null,
    caption: p.caption ?? null,
    hashtags: p.hashtags,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    saves: p.saves,
    engagement_rate: p.views > 0 ? parseFloat((((p.likes + (p.comments ?? 0) + (p.shares ?? 0)) / p.views) * 100).toFixed(2)) : 0,
    posted_at: p.posted_at ?? null,
    is_competitor: !!competitor_handle,
    competitor_handle: competitor_handle?.replace('@', '') ?? null,
    is_trending,
    thumbnail_url: p.thumbnail ?? null,
  }))

  const { error } = await supabase.from('posts').insert(postRecords)
  if (error) {
    console.error('[extension/ingest] DB error:', error.message)
    return errorResponse('Failed to save posts', 500)
  }

  revalidatePath('/dashboard/inspo')

  return jsonResponse({ ingested: postRecords.length, skipped })
}
