import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, buildSystemPrompt, type PostSummary } from '@/lib/claude'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

type RawPost = PostSummary & { id: string }

// Pick a balanced sample (~50) from the merged top-by-views + most-recent pool:
// per-platform top 15 by views, top 10 most recent, plus 3 lowest for contrast.
// This stops one platform dominating and surfaces recent posts, not just historical hits.
function samplePostsForCoach(raw: RawPost[]): PostSummary[] {
  const dedup = new Map<string, RawPost>()
  for (const p of raw) if (!dedup.has(p.id)) dedup.set(p.id, p)

  const byPlatform = new Map<string, RawPost[]>()
  for (const p of dedup.values()) {
    const list = byPlatform.get(p.platform) ?? []
    list.push(p)
    byPlatform.set(p.platform, list)
  }

  const picked = new Set<string>()
  const out: RawPost[] = []
  const take = (p: RawPost) => {
    if (!picked.has(p.id)) { picked.add(p.id); out.push(p) }
  }

  for (const list of byPlatform.values()) {
    const byViews = [...list].sort((a, b) => b.views - a.views)
    const byDate = [...list].sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''))
    const lowest = list.filter(p => p.views > 0).sort((a, b) => a.views - b.views)
    byViews.slice(0, 15).forEach(take)
    byDate.slice(0, 10).forEach(take)
    lowest.slice(0, 3).forEach(take)
  }

  return out.slice(0, 50).map(({ id: _id, ...rest }) => rest)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:coach`, RATE_LIMITS.coach)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  // Check usage limit
  const usage = await checkUsage(user.id, 'coach_messages')
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      message: usage.limit === 0
        ? 'AI Coach is not available on your current plan. Upgrade to Creator or above.'
        : `You've used all ${usage.limit} coach messages this month. Upgrade for more.`,
      usage,
    }, { status: 429 })
  }

  const body = await request.json()
  const message = typeof body.message === 'string' ? body.message.slice(0, 10000) : ''
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  // Sanitize history: only allow valid role/content pairs, cap size
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-100) : []
  const history = rawHistory.filter(
    (m: unknown): m is { role: 'user' | 'assistant'; content: string } =>
      !!m && typeof m === 'object' &&
      'role' in m && (m.role === 'user' || m.role === 'assistant') &&
      'content' in m && typeof m.content === 'string'
  ).map((m: { role: 'user' | 'assistant'; content: string }) => ({
    role: m.role,
    content: m.content.slice(0, 10000),
  }))

  // Load profile, posts, competitors, scripts, and ideas for context.
  // For posts we run two queries (top-by-views + most-recent) so the coach
  // sees both proven hits AND what the user is shipping now, instead of only
  // historical winners. Sampled per-platform downstream to balance TT/IG.
  const POST_FIELDS = 'id, caption, views, likes, shares, saves, engagement_rate, platform, posted_at, hook_text'
  const [
    { data: profile },
    { data: topPosts },
    { data: recentPosts },
    { data: inspirationPosts },
    { data: competitors },
    { data: scripts },
    { data: ideas },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('posts')
      .select(POST_FIELDS)
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .eq('is_trending', false)
      .order('views', { ascending: false })
      .limit(100),
    supabase
      .from('posts')
      .select(POST_FIELDS)
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .eq('is_trending', false)
      .order('posted_at', { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .from('posts')
      .select('caption, views, likes, shares, saves, platform, competitor_handle')
      .eq('user_id', user.id)
      .eq('is_trending', true)
      .order('views', { ascending: false })
      .limit(30),
    supabase
      .from('competitors')
      .select('handle, platform, avg_views')
      .eq('user_id', user.id)
      .limit(10),
    supabase
      .from('scripts')
      .select('topic, status, hook')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('content_ideas')
      .select('idea, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const posts = samplePostsForCoach([...(topPosts ?? []), ...(recentPosts ?? [])])

  const systemPrompt = buildSystemPrompt({
    niche: profile?.niche ?? 'general',
    subNiche: profile?.sub_niche ?? undefined,
    goals: profile?.goals ?? 'grow my social media presence',
    platforms: profile?.platforms ?? [],
    postingTarget: profile?.posting_target ?? 3,
    creatorContext: profile?.creator_context ?? undefined,
    posts: posts ?? undefined,
    inspirationPosts: inspirationPosts ?? undefined,
    competitors: competitors ?? undefined,
    scripts: scripts ?? undefined,
    ideas: ideas ?? undefined,
  })

  // Save user message and reset proactive counter (user is engaging)
  await Promise.all([
    supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
    }),
    supabase.from('profiles').update({ unanswered_proactive: 0 }).eq('user_id', user.id),
  ])

  // Build messages array
  const messages = [
    ...history,
    { role: 'user' as const, content: message },
  ]

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 3072,
    system: systemPrompt,
    messages,
  })

  // Collect full response to save
  let fullText = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const text = chunk.delta.text
          fullText += text
          controller.enqueue(encoder.encode(text))
        }
      }

      // Save assistant response and increment usage
      await Promise.all([
        supabase.from('coach_messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: fullText,
        }),
        incrementUsage(user.id, 'coach_messages'),
      ])

      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
