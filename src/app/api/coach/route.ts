import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, buildSystemPrompt } from '@/lib/claude'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history } = await request.json()

  // Load profile, posts, competitors, scripts, and ideas for context
  const [{ data: profile }, { data: posts }, { data: competitors }, { data: scripts }, { data: ideas }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('posts')
      .select('caption, views, likes, shares, saves, engagement_rate, platform, posted_at, hook_text')
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .order('views', { ascending: false })
      .limit(50),
    supabase
      .from('competitors')
      .select('handle, platform, avg_views')
      .eq('user_id', user.id)
      .limit(10),
    supabase
      .from('scripts')
      .select('topic, status, hook, difficulty')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('content_ideas')
      .select('idea, status, difficulty')
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
    competitors: competitors ?? undefined,
    scripts: scripts ?? undefined,
    ideas: ideas ?? undefined,
  })

  // Save user message
  await supabase.from('coach_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  // Build messages array
  const messages = [
    ...(history ?? []),
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

      // Save assistant response
      await supabase.from('coach_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: fullText,
      })

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
