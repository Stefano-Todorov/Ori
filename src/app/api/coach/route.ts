import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, buildSystemPrompt } from '@/lib/claude'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

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

  // Load profile, posts, competitors, scripts, and ideas for context
  const [{ data: profile }, { data: posts }, { data: inspirationPosts }, { data: competitors }, { data: scripts }, { data: ideas }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('posts')
      .select('caption, views, likes, shares, saves, engagement_rate, platform, posted_at, hook_text')
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .eq('is_trending', false)
      .order('views', { ascending: false })
      .limit(50),
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

  const systemPrompt = buildSystemPrompt({
    niche: profile?.niche ?? 'general',
    subNiche: profile?.sub_niche ?? undefined,
    goals: profile?.goals ?? 'grow my social media presence',
    platforms: profile?.platforms ?? [],
    postingTarget: profile?.posting_target ?? 3,
    posts: posts ?? undefined,
    inspirationPosts: inspirationPosts ?? undefined,
    competitors: competitors ?? undefined,
    scripts: scripts ?? undefined,
    ideas: ideas ?? undefined,
    performanceSummary: profile?.performance_summary ?? undefined,
  })

  // Save user message
  await supabase.from('coach_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  // Build messages array
  const messages = [
    ...history,
    { role: 'user' as const, content: message },
  ]

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
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
