import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import { checkFeature } from '@/lib/usage'
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
  duration_seconds: z.number().nullish(),
})

const SyncSchema = z.object({
  platform: z.enum(['tiktok', 'instagram', 'youtube']),
  follower_count: z.number().nullish(),
  posts: z.array(PostSchema),
})

/** Normalize a social media URL by stripping query params, hash, and trailing slashes */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.search = ''
    u.hash = ''
    return u.origin + u.pathname.replace(/\/+$/, '')
  } catch {
    return url
  }
}

/** Tokenize text into lowercase words (3+ chars), stripping punctuation */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s#]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && w !== 'the' && w !== 'and' && w !== 'for' && w !== 'that' && w !== 'this' && w !== 'with')
  )
}

/** Compute overlap between two token sets */
function tokenOverlap(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const token of a) {
    if (b.has(token)) count++
  }
  return count
}

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request: NextRequest) {
  const auth = await authenticateExtensionRequest(request, 'extension-sync-my-videos', { allowCookieAuth: true })
  if ('status' in auth) return auth
  const { user, supabase, authMethod } = auth

  // Gate extension-only calls: requires extension_full feature
  if (authMethod === 'bearer') {
    const hasFullExtension = await checkFeature(user.id, 'extension_full')
    if (!hasFullExtension) {
      return jsonResponse(
        { error: 'upgrade_required', message: 'Full extension features require Pro or Max plan' },
        403,
      )
    }
  }

  const body = await request.json()
  const parsed = SyncSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse({ error: 'Invalid payload', details: parsed.error.issues }, 400)
  }

  const { platform, follower_count, posts: rawPosts } = parsed.data

  // Build upsert records
  const postRecords = rawPosts
    .filter(p => p.url && (p.views > 0 || p.likes > 0 || p.comments > 0 || p.caption || p.thumbnail)) // skip posts without URLs or data
    .map((p) => ({
      user_id: user.id,
      platform,
      url: normalizeUrl(p.url!),
      caption: p.caption ?? null,
      hashtags: p.hashtags,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: p.saves,
      engagement_rate: p.views > 0
        ? parseFloat((((p.likes + p.comments + p.shares) / p.views) * 100).toFixed(2))
        : 0,
      posted_at: p.posted_at ?? null,
      duration_seconds: p.duration_seconds ?? null,
      is_competitor: false,
      competitor_handle: null,
      is_trending: false,
      thumbnail_url: p.thumbnail ?? null,
    }))

  let synced = 0
  let newCount = 0
  let updatedCount = 0

  if (postRecords.length > 0) {
    // Fetch existing posts so we never overwrite good data with null
    const incomingUrls = postRecords.map(p => p.url)
    const existingMap = new Map<string, { url: string; posted_at: string | null; thumbnail_url: string | null; caption: string | null }>()
    for (let i = 0; i < incomingUrls.length; i += 100) {
      const chunk = incomingUrls.slice(i, i + 100)
      const { data: existing } = await supabase
        .from('posts')
        .select('url, posted_at, thumbnail_url, caption')
        .eq('user_id', user.id)
        .in('url', chunk)
      if (existing) existing.forEach((p) => { if (p.url) existingMap.set(p.url, p) })
    }

    newCount = postRecords.filter(p => !existingMap.has(p.url)).length
    updatedCount = postRecords.filter(p => existingMap.has(p.url)).length

    // Merge: keep existing non-null values when new data is null
    const mergedRecords = postRecords.map(p => {
      const existing = existingMap.get(p.url)
      if (!existing) return p
      return {
        ...p,
        posted_at: p.posted_at ?? existing.posted_at,
        thumbnail_url: p.thumbnail_url ?? existing.thumbnail_url,
        caption: p.caption ?? existing.caption,
      }
    })

    // Upsert: insert new posts, update metrics on existing (by user_id + url unique index)
    const { error } = await supabase
      .from('posts')
      .upsert(mergedRecords, { onConflict: 'user_id,url', ignoreDuplicates: false })

    if (error) {
      console.error('[extension/sync-my-videos] DB error:', error.message)
      return errorResponse('Failed to sync videos', 500)
    }

    synced = postRecords.length
  }

  // Follower snapshot (1 per platform per day, handled by unique constraint)
  if (follower_count != null && follower_count > 0) {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    await supabase.from('follower_snapshots').upsert(
      {
        user_id: user.id,
        platform,
        count: follower_count,
        recorded_at: today,
      },
      { onConflict: 'user_id,platform,recorded_at' }
    )
  }

  // Update last_synced_at on profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_synced_at')
    .eq('user_id', user.id)
    .single()

  const lastSynced = (profile?.last_synced_at as Record<string, string>) ?? {}
  lastSynced[platform] = new Date().toISOString()

  await supabase
    .from('profiles')
    .update({ last_synced_at: lastSynced })
    .eq('user_id', user.id)

  // Keyword matching: find potential idea links for synced posts
  const suggestedLinks: { post_url: string; idea_id: string; idea_text: string; match_score: number }[] = []

  if (postRecords.length > 0) {
    const { data: ideas } = await supabase
      .from('content_ideas')
      .select('id, idea, hook_idea, caption')
      .eq('user_id', user.id)
      .is('linked_post_id', null)

    if (ideas && ideas.length > 0) {
      // Pre-tokenize all ideas
      const ideaTokens = ideas.map(idea => ({
        id: idea.id,
        text: idea.idea,
        tokens: tokenize([idea.idea, idea.hook_idea, idea.caption].filter(Boolean).join(' ')),
      }))

      for (const post of postRecords) {
        const postTokens = tokenize([post.caption, ...post.hashtags].filter(Boolean).join(' '))
        if (postTokens.size === 0) continue

        for (const idea of ideaTokens) {
          const overlap = tokenOverlap(postTokens, idea.tokens)
          if (overlap >= 3) {
            suggestedLinks.push({
              post_url: post.url,
              idea_id: idea.id,
              idea_text: idea.text,
              match_score: overlap,
            })
          }
        }
      }

      // Sort by match score descending, keep top 10
      suggestedLinks.sort((a, b) => b.match_score - a.match_score)
      suggestedLinks.splice(10)
    }
  }

  revalidatePath('/dashboard/my-videos')
  revalidatePath('/dashboard')

  return jsonResponse({
    synced,
    new: newCount,
    updated: updatedCount,
    suggested_links: suggestedLinks,
  })
}
