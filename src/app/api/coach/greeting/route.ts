import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, buildSystemPrompt } from '@/lib/claude'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:coach`, RATE_LIMITS.coach)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const usage = await checkUsage(user.id, 'coach_messages')
  if (!usage.allowed) {
    return NextResponse.json({ error: 'limit_reached', usage }, { status: 429 })
  }

  // Load all context
  const [{ data: profile }, { data: posts }, { data: inspirationPosts }, { data: competitors }, { data: scripts }, { data: ideas }, { data: recentMessages }] = await Promise.all([
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
    supabase
      .from('coach_messages')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

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

  // Build a situational coaching prompt based on what we know
  const postCount = posts?.length ?? 0
  const ideaCount = ideas?.length ?? 0
  const scriptCount = scripts?.length ?? 0
  const competitorCount = competitors?.length ?? 0
  const creatorContext = profile?.creator_context ?? ''
  const creatorContextIsShallow = creatorContext.length < 200
  const lastMessageAt = recentMessages?.[0]?.created_at
  const daysSinceLastChat = lastMessageAt
    ? Math.floor((Date.now() - new Date(lastMessageAt).getTime()) / 86400000)
    : null

  let coachingDirective: string

  if (creatorContextIsShallow && (profile?.subscription_tier ?? 'starter') !== 'starter') {
    // Upgraded user with shallow context — offer deeper intake
    coachingDirective = `PRIORITY: This creator upgraded to a paid plan but you don't know much about them yet (their creator context is thin or missing). Your greeting should acknowledge you're excited to work with them more closely now, and naturally transition into wanting to learn more about them. Ask ONE specific, insightful question about their content — something a real coach would ask in a first deep session. For example, ask about their unique angle, their ideal audience, what's been their biggest challenge, or what content they're most proud of. Do NOT say "I notice your profile is incomplete" — frame it as you wanting to go deeper with them now that they have full coaching access.`
  } else if (postCount > 0) {
    // Has data — give a real coaching insight
    const topPost = posts![0]
    const avgViews = Math.round(posts!.reduce((s, p) => s + p.views, 0) / postCount)
    const recentPosts = posts!.filter(p => {
      if (!p.posted_at) return false
      const daysAgo = (Date.now() - new Date(p.posted_at).getTime()) / 86400000
      return daysAgo <= 7
    })
    const postsThisWeek = recentPosts.length
    const postingTarget = profile?.posting_target ?? 3

    coachingDirective = `Generate a proactive coaching message. You have real data to work with:
- They have ${postCount} posts, averaging ${avgViews.toLocaleString()} views
- Their top post got ${topPost.views.toLocaleString()} views${topPost.hook_text ? ` with hook: "${topPost.hook_text.slice(0, 60)}"` : ''}
- Posts this week: ${postsThisWeek} out of their ${postingTarget}/week target
${daysSinceLastChat !== null ? `- Last coaching session: ${daysSinceLastChat === 0 ? 'today' : daysSinceLastChat === 1 ? 'yesterday' : `${daysSinceLastChat} days ago`}` : '- This is your first coaching session together'}
${ideaCount > 0 ? `- They have ${ideaCount} content ideas in their pipeline` : ''}
${scriptCount > 0 ? `- They have ${scriptCount} scripts` : ''}

Pick the SINGLE most impactful thing to lead with. Options (choose the best one for this situation):
1. If they're behind on posting target: accountability check — be direct but supportive
2. If their top post significantly outperforms average: analyze WHY that post worked and suggest how to replicate it
3. If they haven't chatted in a while: welcome them back, reference something specific about their content
4. If they're hitting their target: celebrate briefly, then push them with a specific next-level challenge
5. If they have draft scripts or new ideas: ask about progress on a specific one

Be specific — reference real numbers, real posts, real hooks. A real coach doesn't say "how's it going?" — they say "I noticed your video about X got 3x your average views. Here's what I think happened..."

End with a question that opens up the conversation.`
  } else if (ideaCount > 0 || scriptCount > 0) {
    // Has ideas/scripts but no posts yet
    coachingDirective = `This creator has been planning (${ideaCount} ideas, ${scriptCount} scripts) but hasn't posted yet (or hasn't synced their posts). Your greeting should acknowledge their preparation work, pick one specific idea or script to reference, and help them take the next step toward actually posting. Be encouraging but push them toward action. A coach's job is to get them off the sideline. End with a specific question about what's holding them back from posting.`
  } else if (competitorCount > 0) {
    // Tracking competitors but hasn't created yet
    coachingDirective = `This creator is tracking ${competitorCount} competitor(s) but hasn't created content yet. They're in research mode. Your greeting should validate that researching competitors is smart, share one quick insight about what they can learn from their tracked competitors, and then pivot toward action — what's their first video going to be about? End with a question that moves them from watching to creating.`
  } else {
    // Brand new, no data at all
    coachingDirective = `This creator just finished onboarding and is visiting the coach for the first time. Give them a warm, energetic welcome that shows you remember what they told you during setup${creatorContext ? ` (their context: "${creatorContext.slice(0, 200)}")` : ''}. Then suggest ONE concrete first step — not a list of everything they could do, but the single highest-impact thing for a new creator in their niche. End with a question to get the conversation going.`
  }

  const greetingPrompt = `${coachingDirective}

RULES:
- Keep it to 3-5 sentences. Don't write an essay.
- Sound like a real coach, not a chatbot. Be direct, specific, and personal.
- Reference specific data points when you have them — numbers, post topics, hooks.
- End with ONE question to open the conversation.
- Do NOT start with "Hey!" or "Hi there!" — vary your openings. Start with an observation, insight, or direct reference to their content.
- Do NOT use bullet points or lists. Write in natural conversational sentences.`

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
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

      // Save as assistant message and count usage
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
