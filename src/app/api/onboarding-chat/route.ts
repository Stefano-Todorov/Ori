import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getUserTier } from '@/lib/usage'
import type Anthropic from '@anthropic-ai/sdk'

const SAVE_PROFILE_TOOL: Anthropic.Tool = {
  name: 'save_profile',
  description:
    'Save the creator profile when you have gathered enough information. Call this once you feel confident you understand the creator well enough to coach them effectively. Do NOT call this too early — make sure you have dug deep enough.',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: {
        type: 'string',
        description: 'Main content niche (e.g., Fitness, Comedy, Finance, Gaming)',
      },
      sub_niche: {
        type: 'string',
        description: 'Specific sub-niche if applicable (e.g., Calisthenics, Dark humor, Crypto)',
      },
      goals: {
        type: 'string',
        description: 'Their content and growth goals, as specific as possible including timeline and metrics if mentioned',
      },
      platforms: {
        type: 'array',
        items: { type: 'string', enum: ['tiktok', 'instagram'] },
        description: 'Platforms they create content for',
      },
      posting_target: {
        type: 'number',
        description: 'Posts per week target (1-14)',
      },
      creator_context: {
        type: 'string',
        description:
          'Rich, detailed narrative summary (5-8 sentences) of the creator: experience level, target audience demographics and psychographics, content style and tone, unique angle/differentiator, strengths, pain points, what has or hasn\'t worked before, monetization intent, and anything else relevant for personalized coaching.',
      },
    },
    required: ['niche', 'goals', 'platforms', 'posting_target', 'creator_context'],
  },
}

function buildOnboardingPrompt(isPaid: boolean): string {
  const baseCoachingStyle = `You are Orianna, an elite AI content coach for short-form video creators (TikTok and Instagram Reels). You're meeting a new creator for the first time. Think of this as your intake session — the better you understand them, the better you can coach them.

YOUR COACHING STYLE:
- Be warm but direct — like a coach who genuinely cares, not a customer service bot
- Use active listening: reflect back what you hear ("So you're saying..." / "It sounds like...")
- Show genuine curiosity — react to what they say before asking the next question
- Share brief, relevant observations ("That's actually a really smart angle because..." or "A lot of creators in [niche] struggle with that")
- Keep messages concise — 2-4 sentences max. Don't lecture. Ask and listen.
- ONE question or topic per message. Never stack multiple questions.
- Match their energy — if they're brief, stay brief. If they're detailed, engage with the details.
- Use their words back to them — it shows you're listening`

  if (!isPaid) {
    return `${baseCoachingStyle}

CONVERSATION FLOW (free plan — efficient but warm):
You have about 3-5 exchanges to understand this creator. Be efficient but still conversational.

1. NICHE & ANGLE: Start by asking what content they create or want to create. If their answer is broad, ask one follow-up to narrow it down ("What's your specific angle on that?")
2. GOALS: Ask what they're trying to achieve — but frame it as "what does winning look like for you?" not "what are your goals"
3. PLATFORMS & HABITS: Ask where they post (or want to post) and how often they're currently creating
4. WRAP UP: Once you have a clear picture, call save_profile

IMPORTANT:
- You must call save_profile exactly once during this conversation
- Do not mention saving, profiles, or onboarding — just naturally wrap up
- The creator_context should be a rich 3-5 sentence narrative summary
- If the user gives detailed answers, adapt — you might be able to call the tool after 3 exchanges
- For posting_target, default to 3 if they don't specify`
  }

  return `${baseCoachingStyle}

CONVERSATION FLOW (paid plan — deep intake session):
This creator is paying for premium coaching. Give them a thorough intake that makes them feel understood. Aim for 5-8 exchanges before saving their profile. Dig deep — the more you learn now, the better all your future coaching will be.

1. NICHE & ANGLE (1-2 messages):
   - Start by asking what content they create or want to create
   - Dig into their specific angle: "What makes YOUR take on [niche] different from the 10,000 other [niche] creators?"
   - If they don't know their angle yet, that's valuable info — note it as a pain point

2. AUDIENCE (1 message):
   - Ask who they're trying to reach — not just demographics but psychographics: "Who's your ideal viewer? Like if you could describe the one person who watches every video..."
   - If they say "everyone," gently push back: "Everyone is no one. Who specifically would share your content?"

3. GOALS & VISION (1-2 messages):
   - Ask what winning looks like for them — follower count? Brand deals? Building a business? Just having fun?
   - If they mention monetization, ask what specifically (sponsorships, products, courses, affiliate)
   - Ask about timeline: "Where do you want to be in 6 months?"

4. CURRENT STATE & EXPERIENCE (1 message):
   - Ask about their experience: "Are you starting from scratch or do you already have some content out there?"
   - If they have content: "What's been working? What hasn't?"
   - If they're new: "What's been holding you back from starting?"

5. CONTENT PROCESS & PAIN POINTS (1 message):
   - Ask about their biggest challenge right now: "What's the #1 thing that frustrates you about creating content?"
   - This reveals whether they need help with ideas, scripting, consistency, editing, growth, etc.

6. PLATFORMS & POSTING (1 message):
   - Ask where they post and how often
   - If they're on multiple platforms, ask which one they want to focus on first
   - Get a realistic posting target based on their schedule

7. WRAP UP: When you have a thorough understanding, call save_profile

IMPORTANT:
- You must call save_profile exactly once during this conversation
- Do not mention saving, profiles, or onboarding — just naturally wrap up
- The creator_context MUST be detailed (5-8 sentences) — this is your notes from the intake session
- Include: experience level, audience, content style, unique angle, strengths, pain points, monetization intent, what has/hasn't worked
- Do NOT rush through topics just to check boxes — if something interesting comes up, follow that thread
- If the creator seems eager to jump in, you can shorten the flow — read the room
- For posting_target, push them toward a realistic number based on what they told you about their schedule`
}

async function streamResponse(
  params: Anthropic.MessageCreateParams,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
): Promise<{ content: Anthropic.ContentBlock[]; stopReason: string | null }> {
  const stream = anthropic.messages.stream(params)
  const content: Anthropic.ContentBlock[] = []
  let currentToolInput = ''
  let currentToolId = ''
  let currentToolName = ''
  let stopReason: string | null = null

  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      if (event.content_block.type === 'text') {
        content.push({ ...event.content_block })
      } else if (event.content_block.type === 'tool_use') {
        currentToolId = event.content_block.id
        currentToolName = event.content_block.name
        currentToolInput = ''
      }
    } else if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        controller.enqueue(encoder.encode(event.delta.text))
        // Update the last text block
        const lastText = content[content.length - 1]
        if (lastText && lastText.type === 'text') {
          (lastText as Anthropic.TextBlock).text += event.delta.text
        }
      } else if (event.delta.type === 'input_json_delta') {
        currentToolInput += event.delta.partial_json
      }
    } else if (event.type === 'content_block_stop') {
      if (currentToolId) {
        content.push({
          type: 'tool_use',
          id: currentToolId,
          name: currentToolName,
          input: JSON.parse(currentToolInput || '{}'),
        } as Anthropic.ToolUseBlock)
        currentToolId = ''
        currentToolName = ''
        currentToolInput = ''
      }
    } else if (event.type === 'message_delta') {
      stopReason = event.delta.stop_reason
    }
  }

  return { content, stopReason }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:onboarding-chat`, RATE_LIMITS['onboarding-chat'])
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json()
  const message = typeof body.message === 'string' ? body.message.slice(0, 10000) : ''
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const rawHistory = Array.isArray(body.history) ? body.history.slice(-20) : []
  const history = rawHistory.filter(
    (m: unknown): m is { role: 'user' | 'assistant'; content: string } =>
      !!m &&
      typeof m === 'object' &&
      'role' in m &&
      (m.role === 'user' || m.role === 'assistant') &&
      'content' in m &&
      typeof m.content === 'string'
  ).map((m: { role: 'user' | 'assistant'; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content.slice(0, 10000),
  }))

  // Check user's tier for prompt depth
  const tier = await getUserTier(user.id)
  const isPaid = tier !== 'starter'
  const systemPrompt = buildOnboardingPrompt(isPaid)

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user' as const, content: message },
  ]

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Stream the main response
        const { content, stopReason } = await streamResponse(
          {
            model: MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            tools: [SAVE_PROFILE_TOOL],
            messages,
          },
          controller,
          encoder,
        )

        // Check if the model called the tool
        const toolUseBlock = content.find(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'save_profile'
        )

        if (toolUseBlock && stopReason === 'tool_use') {
          const input = toolUseBlock.input as {
            niche: string
            sub_niche?: string
            goals: string
            platforms: string[]
            posting_target: number
            creator_context: string
          }

          // Save profile to DB
          const { error } = await supabase.from('profiles').upsert(
            {
              user_id: user.id,
              email: user.email ?? '',
              niche: input.niche,
              sub_niche: input.sub_niche || null,
              goals: input.goals,
              platforms: input.platforms,
              posting_target: Math.min(Math.max(input.posting_target, 1), 14),
              creator_context: input.creator_context,
              onboarding_completed: true,
            },
            { onConflict: 'user_id' }
          )

          if (error) {
            controller.enqueue(encoder.encode('\n\nI had trouble saving your profile. Please try refreshing the page.'))
            controller.close()
            return
          }

          // Stream the follow-up welcome message
          await streamResponse(
            {
              model: MODEL,
              max_tokens: 1024,
              system: systemPrompt,
              tools: [SAVE_PROFILE_TOOL],
              messages: [
                ...messages,
                { role: 'assistant' as const, content },
                {
                  role: 'user' as const,
                  content: [
                    {
                      type: 'tool_result' as const,
                      tool_use_id: toolUseBlock.id,
                      content: 'Profile saved successfully. Now send a warm welcome message summarizing what you learned and what you\'ll help them with.',
                    },
                  ],
                },
              ],
            },
            controller,
            encoder,
          )

          controller.enqueue(encoder.encode('\n__ONBOARDING_COMPLETE__'))
        }

        controller.close()
      } catch {
        controller.enqueue(encoder.encode('\n\nSomething went wrong. Please try refreshing the page.'))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
