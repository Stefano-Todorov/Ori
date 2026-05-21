import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { loadKnowledge, loadPlatformKnowledge } from '@/lib/knowledge'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const RequestSchema = z.object({
  target: z.enum(['hook', 'body', 'cta']),
  topic: z.string().min(1),
  platform: z.string().default('tiktok'),
  hookContext: z.string().optional(),
  bodyContext: z.string().optional(),
  ctaContext: z.string().optional(),
  style: z.string().optional(),
})

const HOOK_ANGLE_GUIDES: Record<string, string> = {
  Negative: 'Start with what NOT to do, a mistake, or a warning. Creates instant curiosity.',
  List: 'Open with a numbered list promise (e.g. "3 things...", "5 reasons..."). Sets clear expectations.',
  POV: 'First-person perspective hook. Put the viewer in your shoes immediately.',
  Question: 'Open with a direct question the viewer instantly relates to.',
  Storytime: 'Start mid-story with the most dramatic or surprising moment first.',
  Controversial: 'Open with a bold, polarizing statement that challenges common beliefs.',
  Statistic: 'Lead with a shocking, specific number or data point.',
  Direct: 'Straight to the point — state the value proposition immediately.',
}

const CTA_ANGLE_GUIDES: Record<string, string> = {
  'Watch again': 'Tell them the video is better the second time / they missed something. Drives replays.',
  'Follow for more': 'Promise more value like this if they follow.',
  'Comment below': 'Ask a specific question to drive comments.',
  'Share this': 'Tell them who specifically needs to see this.',
  'Save for later': 'Position as reference content they will want to come back to.',
  'Link in bio': 'Direct them to take a next step via link.',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:script-generate`, RATE_LIMITS['script-generate'])
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const usage = await checkUsage(user.id, 'script_generations')
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      message: usage.limit === 0
        ? 'Script generation is not available on your current plan. Upgrade to Creator or above.'
        : `You've used all ${usage.limit} script generations this month. Upgrade for more.`,
      usage,
    }, { status: 429 })
  }

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { target, topic, platform, hookContext, bodyContext, ctaContext, style } = parsed.data

  const { data: profile } = await supabase
    .from('profiles')
    .select('niche, sub_niche, goals')
    .eq('user_id', user.id)
    .single()

  const creatorContext = `Creator profile:
- Niche: ${profile?.niche ?? 'general'}${profile?.sub_niche ? ` (${profile.sub_niche})` : ''}
- Platform: ${platform}
- Goals: ${profile?.goals ?? 'grow audience'}
- Video topic: ${topic}`

  const platformKnowledge = loadPlatformKnowledge(platform)

  let prompt: string

  if (target === 'hook') {
    const hookFormulas = loadKnowledge('hook-formulas')
    const styleGuide = style && HOOK_ANGLE_GUIDES[style]
      ? `- Hook style: ${style} — ${HOOK_ANGLE_GUIDES[style]}`
      : ''
    prompt = `You are an elite short-form video scriptwriter. Write ONE killer opening hook for the video below.

${creatorContext}
${styleGuide}
${bodyContext ? `\nExisting body / main content (the hook must lead into this):\n${bodyContext}` : ''}
${ctaContext ? `\nExisting CTA (the hook should set up payoff for this):\n${ctaContext}` : ''}

HOOK FORMULA REFERENCE:
${hookFormulas}

PLATFORM NOTES (${platform}):
${platformKnowledge}

Return ONLY valid JSON, no markdown, in this exact shape:
{"hook": "the hook line — first 1-3 seconds of the video, impossible to scroll past"}`
  } else if (target === 'body') {
    const scriptFrameworks = loadKnowledge('script-frameworks')
    prompt = `You are an elite short-form video scriptwriter. Write the BODY of the script below.

${creatorContext}
${hookContext ? `\nOpening hook (the body must follow naturally from this):\n${hookContext}` : ''}
${ctaContext ? `\nClosing CTA (the body must build up to this):\n${ctaContext}` : ''}

SCRIPT FRAMEWORK REFERENCE — use one of these structures:
${scriptFrameworks}

PLATFORM NOTES (${platform}):
${platformKnowledge}

Structure the body with clearly labeled sections separated by newlines:
[INTRO] - the setup after the hook
[MAIN POINT 1] - first key point with dialogue
[MAIN POINT 2] - second key point (if needed)
[MAIN POINT 3] - third key point (if needed)
[TRANSITION] or [B-ROLL: description] or [TEXT OVERLAY: text] markers where appropriate
[OUTRO] - lead into the CTA

Write actual spoken dialogue. Return ONLY valid JSON, no markdown:
{"body": "the structured body script with section labels"}`
  } else {
    const ctaPsychology = loadKnowledge('cta-psychology')
    const styleGuide = style && CTA_ANGLE_GUIDES[style]
      ? `- CTA style: ${style} — ${CTA_ANGLE_GUIDES[style]}`
      : ''
    prompt = `You are an elite short-form video scriptwriter. Write ONE closing CTA for the video below.

${creatorContext}
${styleGuide}
${hookContext ? `\nOpening hook (the CTA should pay off the hook's promise):\n${hookContext}` : ''}
${bodyContext ? `\nBody content (the CTA must follow naturally from this):\n${bodyContext}` : ''}

CTA PSYCHOLOGY REFERENCE:
${ctaPsychology}

PLATFORM NOTES (${platform}):
${platformKnowledge}

Return ONLY valid JSON, no markdown, in this exact shape:
{"cta": "the closing call to action — one line, specific, drives the action"}`
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  let parsedResult: Record<string, unknown>
  try {
    parsedResult = JSON.parse(content.text)
  } catch {
    const match = content.text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse result' }, { status: 500 })
    parsedResult = JSON.parse(match[0])
  }

  await incrementUsage(user.id, 'script_generations')

  return NextResponse.json({ [target]: parsedResult[target] })
}
