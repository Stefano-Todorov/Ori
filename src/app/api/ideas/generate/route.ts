import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { loadKnowledge } from '@/lib/knowledge'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const RequestSchema = z.object({
  type: z.enum(['hook', 'cta', 'caption', 'similar']),
  idea: z.string().min(1),
  context: z.object({
    hook: z.string().optional(),
    caption: z.string().optional(),
    cta: z.string().optional(),
    scriptSnippet: z.string().optional(),
    inspirationUrl: z.string().optional(),
  }),
  count: z.number().min(1).max(5).default(3),
  instructions: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:idea-generate`, RATE_LIMITS['idea-generate'])
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  // Check usage limit
  const usage = await checkUsage(user.id, 'idea_generations')
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      message: usage.limit === 0
        ? 'AI idea generation is not available on your current plan. Upgrade to Creator or above.'
        : `You've used all ${usage.limit} idea generations this month. Upgrade for more.`,
      usage,
    }, { status: 429 })
  }

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { type, idea, context, count, instructions } = parsed.data

  const { data: profile } = await supabase
    .from('profiles')
    .select('niche, sub_niche, goals')
    .eq('user_id', user.id)
    .single()

  const niche = profile?.niche ?? 'general'
  const subNiche = profile?.sub_niche ? ` (${profile.sub_niche})` : ''
  const goals = profile?.goals ?? 'grow audience'

  const contextBlock = [
    `Video idea: ${idea}`,
    context.hook ? `Current hook: ${context.hook}` : null,
    context.scriptSnippet ? `Current body/script: ${context.scriptSnippet}` : null,
    context.cta ? `Current CTA: ${context.cta}` : null,
    context.caption ? `Current caption: ${context.caption}` : null,
    context.inspirationUrl ? `Inspiration URL: ${context.inspirationUrl}` : null,
  ].filter(Boolean).join('\n')

  // Load relevant knowledge per generation type
  const hookFormulas = type === 'hook' || type === 'similar' ? loadKnowledge('hook-formulas') : ''
  const ctaPsychology = type === 'cta' ? loadKnowledge('cta-psychology') : ''

  const prompts: Record<string, string> = {
    hook: `You are an elite short-form video hook writer with deep expertise in scroll-stopping psychology. Generate ${count} compelling hook${count > 1 ? 's' : ''} (opening lines) for this video.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

HOOK FORMULA REFERENCE — each hook MUST use a different proven pattern from this list:
${hookFormulas}

Requirements:
- Each hook should be 1-2 sentences max
- Each hook MUST use a DIFFERENT formula from the reference (name the formula in parentheses after each hook is not needed, just use the technique)
- Pass the "scroll test" — would someone stop scrolling at full speed for this?
- First 2 words of each hook are critical — make them count
- Be specific (use numbers, names, concrete details) not vague

Return a JSON array of exactly ${count} string${count > 1 ? 's' : ''}:
["hook 1", "hook 2", ...]

Return ONLY the JSON array, no other text.`,

    cta: `You are an expert at writing psychologically-grounded calls-to-action for short-form video. Generate ${count} effective CTA${count > 1 ? 's' : ''} for this video.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

CTA PSYCHOLOGY REFERENCE — ground each CTA in these principles:
${ctaPsychology}

Requirements:
- Each CTA should use a DIFFERENT psychological principle from the reference
- Each should drive a specific action (follow, comment, share, save, watch again, link in bio)
- Must feel natural and earned — not a generic "like and subscribe"
- The CTA should feel like a continuation of the video's value, not a commercial break
- One CTA per suggestion — don't combine multiple asks

Return a JSON array of exactly ${count} string${count > 1 ? 's' : ''}:
["cta 1", "cta 2", ...]

Return ONLY the JSON array, no other text.`,

    caption: `You are an expert social media caption writer who understands platform algorithms and hashtag strategy. Generate ${count} engaging caption${count > 1 ? 's' : ''} with relevant hashtags for this video.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

Requirements:
- Each caption should include a strong opening line (first line is what shows before "...more")
- Include the main message/value proposition
- End with 3-5 targeted, niche-specific hashtags (not generic ones like #fyp or #viral)
- Vary the tone across suggestions (storytelling, educational, controversial, relatable, question-based)
- The opening line of the caption should complement the hook, NOT repeat it

Return a JSON array of exactly ${count} string${count > 1 ? 's' : ''}:
["caption 1 with #hashtags", "caption 2 with #hashtags", ...]

Return ONLY the JSON array, no other text.`,

    similar: `You are an expert short-form video strategist with deep knowledge of content angles and viral mechanics. Generate ${count} similar but distinct video idea${count > 1 ? 's' : ''} inspired by this one.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

HOOK FORMULA REFERENCE — suggest a hook approach for each idea:
${hookFormulas}

Requirements:
- Each idea should use a DIFFERENT content angle (different hook formula, different structure, different emotional trigger)
- Be hyper-specific (not vague like "make a video about X" — specify the exact angle, format, and hook approach)
- Explain WHY each angle would perform well
- Each idea should be different enough to be a standalone video, not just a rephrasing

Return a JSON array of exactly ${count} string${count > 1 ? 's' : ''}:
["idea 1 — specific and actionable description", "idea 2 — specific and actionable description", ...]

Return ONLY the JSON array, no other text.`,
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompts[type] }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  let results: string[]
  try {
    const match = content.text.match(/\[[\s\S]*\]/)
    results = JSON.parse(match ? match[0] : content.text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }

  await incrementUsage(user.id, 'idea_generations')

  return NextResponse.json({ results })
}
