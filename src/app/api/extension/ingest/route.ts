import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PostSchema = z.object({
  url: z.string().optional(),
  caption: z.string().optional(),
  views: z.number().default(0),
  likes: z.number().default(0),
  comments: z.number().default(0),
  shares: z.number().default(0),
  hashtags: z.array(z.string()).default([]),
  posted_at: z.string().optional(),
})

const IngestSchema = z.object({
  platform: z.enum(['tiktok', 'instagram', 'youtube']),
  competitor_handle: z.string().optional(),
  is_trending: z.boolean().default(false),
  posts: z.array(PostSchema),
})

export async function POST(request: NextRequest) {
  // Support both cookie-based auth (webapp) and API key auth (extension)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = IngestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
  }

  const { platform, competitor_handle, is_trending, posts } = parsed.data

  // Upsert competitor record if applicable
  if (competitor_handle) {
    const cleanHandle = competitor_handle.replace('@', '')
    const profileUrl = platform === 'instagram'
      ? `https://instagram.com/${cleanHandle}`
      : platform === 'tiktok'
      ? `https://tiktok.com/@${cleanHandle}`
      : platform === 'youtube'
      ? `https://youtube.com/@${cleanHandle}`
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
    engagement_rate: p.views > 0 ? parseFloat((((p.likes + (p.comments ?? 0) + (p.shares ?? 0)) / p.views) * 100).toFixed(2)) : 0,
    posted_at: p.posted_at ?? null,
    is_competitor: !!competitor_handle,
    competitor_handle: competitor_handle?.replace('@', '') ?? null,
    is_trending,
  }))

  const { error } = await supabase.from('posts').insert(postRecords)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ingested: postRecords.length })
}
