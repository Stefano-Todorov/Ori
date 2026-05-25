import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// The greeting is a one-shot, system-initiated message (fires only when the
// user has no chat history). It is NOT charged against coach_messages quota
// and uses a slim context — we only need counts + the top post for color,
// not the full 50-post analytics package the real coach loads.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:coach`, RATE_LIMITS.coach)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: profile },
    { data: topPost },
    { count: postCount },
    { count: postsThisWeek },
    { count: ideaCount },
    { count: scriptCount },
    { count: competitorCount },
    { data: recentMessages },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('niche, sub_niche, goals, platforms, posting_target, creator_context, subscription_tier')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('posts')
      .select('caption, views, hook_text, platform')
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .eq('is_trending', false)
      .order('views', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .eq('is_trending', false),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_competitor', false)
      .eq('is_trending', false)
      .gte('posted_at', weekAgo),
    supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['new', 'in_progress']),
    supabase
      .from('scripts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'draft'),
    supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('coach_messages')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const niche = profile?.niche ?? 'general'
  const subNiche = profile?.sub_niche
  const goals = profile?.goals ?? 'grow my social media presence'
  const platforms = (profile?.platforms ?? []) as string[]
  const postingTarget = profile?.posting_target ?? 3
  const creatorContext = profile?.creator_context ?? ''
  const totalPosts = postCount ?? 0
  const weekPosts = postsThisWeek ?? 0
  const totalIdeas = ideaCount ?? 0
  const totalDrafts = scriptCount ?? 0
  const totalCompetitors = competitorCount ?? 0
  const creatorContextIsShallow = creatorContext.length < 200
  const lastMessageAt = recentMessages?.[0]?.created_at
  const daysSinceLastChat = lastMessageAt
    ? Math.floor((Date.now() - new Date(lastMessageAt).getTime()) / 86400000)
    : null

  // Slim system prompt — just identity + creator profile. No 50-post table.
  const systemPrompt = `You are Orianna, an elite AI content coach for short-form video creators (TikTok and Instagram Reels). You are warm, direct, and specific — never generic.

CREATOR PROFILE:
- Niche: ${niche}${subNiche ? ` (${subNiche})` : ''}
- Goals: ${goals}
- Active platforms: ${platforms.join(', ') || 'not set'}
- Posting target: ${postingTarget}/week
${creatorContext ? `- About them: ${creatorContext.slice(0, 400)}` : ''}`

  let coachingDirective: string

  if (creatorContextIsShallow && (profile?.subscription_tier ?? 'starter') !== 'starter') {
    coachingDirective = `PRIORITY: This creator upgraded to a paid plan but you don't know much about them yet. Your greeting should acknowledge you're excited to work with them more closely now, and naturally transition into wanting to learn more about them. Ask ONE specific, insightful question about their content — their unique angle, ideal audience, biggest challenge, or proudest piece of content. Do NOT say "I notice your profile is incomplete" — frame it as you wanting to go deeper with them now.`
  } else if (totalPosts > 0 && topPost) {
    coachingDirective = `Generate a proactive coaching message. Data you can reference:
- Total posts: ${totalPosts}
- Posts this week: ${weekPosts} of their ${postingTarget}/week target
- Top post: ${topPost.views.toLocaleString()} views on ${topPost.platform}${topPost.hook_text ? ` with hook: "${topPost.hook_text.slice(0, 80)}"` : ''}${topPost.caption ? ` (caption: "${topPost.caption.slice(0, 80)}")` : ''}
${daysSinceLastChat !== null ? `- Last chat: ${daysSinceLastChat === 0 ? 'today' : daysSinceLastChat === 1 ? 'yesterday' : `${daysSinceLastChat} days ago`}` : '- This is your first session together'}
${totalIdeas > 0 ? `- Ideas in pipeline: ${totalIdeas}` : ''}
${totalDrafts > 0 ? `- Draft scripts: ${totalDrafts}` : ''}

Pick the SINGLE most impactful angle:
1. Behind on posting target → accountability check, direct but supportive
2. Top post crushed their average → analyze WHY and suggest replication
3. Hitting target → celebrate briefly, push next-level challenge
4. Has drafts/ideas → ask about progress on a specific one

Reference real numbers. A real coach says "your top hook X got Y views — here's what I think worked." Not "how's it going?"`
  } else if (totalIdeas > 0 || totalDrafts > 0) {
    coachingDirective = `This creator has been planning (${totalIdeas} ideas, ${totalDrafts} drafts) but hasn't posted yet. Acknowledge the prep, push them toward action. End with a specific question about what's holding them back from posting.`
  } else if (totalCompetitors > 0) {
    coachingDirective = `This creator is tracking ${totalCompetitors} competitor(s) but hasn't created yet — they're in research mode. Validate that researching is smart, then pivot to action. What's their first video going to be about?`
  } else {
    coachingDirective = `This creator just finished onboarding. Give them a warm, energetic welcome that shows you remember what they told you${creatorContext ? ` (context: "${creatorContext.slice(0, 200)}")` : ''}. Suggest ONE concrete first step — the single highest-impact thing for a new creator in their niche. End with a question.`
  }

  const greetingPrompt = `${coachingDirective}

RULES:
- 3-5 sentences. No essays.
- Sound like a real coach, not a chatbot. Direct, specific, personal.
- Reference specific data points when you have them.
- End with ONE question.
- Do NOT start with "Hey!" or "Hi there!" — start with an observation or insight.
- No bullet points or lists. Natural conversational sentences.`

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 512,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: greetingPrompt }],
  })

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

      // Save as assistant message so future visits skip the greeting fetch.
      // Intentionally do NOT incrementUsage — the greeting is system-initiated,
      // not user-initiated, so it shouldn't burn their monthly quota.
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
