import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
  platform: z.enum(['tiktok', 'instagram', 'youtube']),
  competitor_handle: z.string().optional(),
  is_trending: z.boolean().default(false),
  posts: z.array(PostSchema),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  // Support both cookie-based auth (webapp) and Bearer token auth (extension)
  let user = null
  let supabase

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    supabase = createServiceClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (!error && data.user) user = data.user
  }

  if (!user) {
    supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const body = await request.json()
  const parsed = IngestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400, headers: corsHeaders })
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
    return NextResponse.json({ ingested: 0, skipped }, { headers: corsHeaders })
  }

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
    saves: p.saves,
    engagement_rate: p.views > 0 ? parseFloat((((p.likes + (p.comments ?? 0) + (p.shares ?? 0)) / p.views) * 100).toFixed(2)) : 0,
    posted_at: p.posted_at ?? null,
    is_competitor: !!competitor_handle,
    competitor_handle: competitor_handle?.replace('@', '') ?? null,
    is_trending,
    thumbnail_url: p.thumbnail ?? null,
  }))

  const { error } = await supabase.from('posts').insert(postRecords)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })

  revalidatePath('/dashboard/inspo')

  return NextResponse.json({ ingested: postRecords.length, skipped }, { headers: corsHeaders })
}
