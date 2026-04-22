import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type Anthropic from '@anthropic-ai/sdk'

const SAVE_PROFILE_TOOL: Anthropic.Tool = {
  name: 'save_profile',
  description:
    'Save the creator profile when you have gathered enough information about their niche, goals, platforms, posting frequency, and context. Call this once you feel confident you understand the creator well enough to coach them effectively.',
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
        description: 'Their content and growth goals, as specific as possible',
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
          'Rich narrative summary of the creator: their experience level, target audience, content style, unique strengths, pain points, what makes them different, and anything else relevant for coaching. This will be used by all AI features to personalize advice.',
      },
    },
    required: ['niche', 'goals', 'platforms', 'posting_target', 'creator_context'],
  },
}

const ONBOARDING_SYSTEM_PROMPT = `You are Orianna, an elite AI content coach for short-form video creators (TikTok and Instagram Reels). You're meeting a new creator for the first time during onboarding.

YOUR GOAL: Get to know this creator through natural conversation so you can build their profile and give them personalized coaching. You need to understand their niche, goals, platforms, posting habits, experience level, target audience, content style, and pain points.

HOW TO CONDUCT THE CONVERSATION:
- Be warm, conversational, and genuinely curious — like a real coach meeting a new client
- Ask ONE topic at a time, then probe deeper based on their answer before moving on
- Start by asking about what kind of content they create (or want to create)
- Follow up on interesting details — dig into their angle, what makes them different, who their audience is
- Naturally discover their goals (ask what success looks like to them, any timeline)
- Ask about which platforms they use or want to focus on
- Ask about their current posting habits and what frequency feels realistic
- Pick up on experience level, pain points, and content style from context clues
- Do NOT ask all questions at once — this should feel like a conversation, not an interview
- Keep your messages concise (2-4 sentences typically). Be encouraging but not over-the-top
- After 3-5 exchanges, when you have a clear picture, call the save_profile tool

WHEN CALLING save_profile:
- Fill in ALL fields based on what you've learned. Infer what you can from context
- The creator_context field should be a rich 3-5 sentence narrative summary — not just bullet points
- For posting_target, if they didn't give an exact number, use your best judgment (default to 3 if unclear)
- After calling the tool, send a warm welcome message summarizing what you learned about them and what you'll help them with. Keep it to 2-3 sentences. End with something encouraging about getting started.

IMPORTANT:
- You must call the save_profile tool exactly once during this conversation
- Do not mention the tool or "saving profile" to the user — just naturally wrap up
- If the user seems eager to get started or gives very brief answers, don't drag out the conversation — adapt and call the tool sooner
- If the user gives detailed answers, you can probe less — they're already giving you what you need`

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

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user' as const, content: message },
  ]

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system: ONBOARDING_SYSTEM_PROMPT,
          tools: [SAVE_PROFILE_TOOL],
          messages,
        })

        let profileSaved = false

        for (const block of response.content) {
          if (block.type === 'text') {
            controller.enqueue(encoder.encode(block.text))
          } else if (block.type === 'tool_use' && block.name === 'save_profile') {
            const input = block.input as {
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

            profileSaved = true
          }
        }

        // If the model called the tool, we need to send the tool result back
        // to get the final assistant message (the welcome summary)
        if (profileSaved && response.stop_reason === 'tool_use') {
          const toolUseBlock = response.content.find(
            (b) => b.type === 'tool_use'
          )

          if (toolUseBlock && toolUseBlock.type === 'tool_use') {
            const followUp = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 1024,
              system: ONBOARDING_SYSTEM_PROMPT,
              tools: [SAVE_PROFILE_TOOL],
              messages: [
                ...messages,
                { role: 'assistant' as const, content: response.content },
                {
                  role: 'user' as const,
                  content: [
                    {
                      type: 'tool_result' as const,
                      tool_use_id: toolUseBlock.id,
                      content: 'Profile saved successfully. Now send a warm welcome message.',
                    },
                  ],
                },
              ],
            })

            for (const block of followUp.content) {
              if (block.type === 'text') {
                controller.enqueue(encoder.encode(block.text))
              }
            }
          }

          controller.enqueue(encoder.encode('\n__ONBOARDING_COMPLETE__'))
        }

        controller.close()
      } catch (err) {
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
