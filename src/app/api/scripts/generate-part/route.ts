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
    prompt = `You are an elite short-form video scriptwriter. Write a primary opening hook AND 3 alternative hooks for the video below.

${creatorContext}
${style ? `- Hook style: ${style}` : ''}
${bodyContext ? `\nExisting body / main content (hooks must lead into this):\n${bodyContext}` : ''}
${ctaContext ? `\nExisting CTA (hooks should set up payoff for this):\n${ctaContext}` : ''}

HOOK FORMULA REFERENCE:
${hookFormulas}

PLATFORM NOTES (${platform}):
${platformKnowledge}

Return ONLY valid JSON, no markdown:
{
  "hook": "the strongest opening hook — first 1-3 seconds, impossible to scroll past",
  "variants": [
    {"hook": "a meaningfully different angle", "angle": "name of the hook style / why it's different"},
    {"hook": "another distinct angle", "angle": "name of the hook style / why it's different"},
    {"hook": "a third distinct angle", "angle": "name of the hook style / why it's different"}
  ]
}

The 3 variants should each use a DIFFERENT hook style than the primary — give the user real alternatives, not subtle rewordings.`
  } else if (target === 'body') {
    const scriptFrameworks = loadKnowledge('script-frameworks')
    prompt = `You are an elite short-form video scriptwriter. Write a primary script body AND 2 alternative body structures for the video below.

${creatorContext}
${hookContext ? `\nOpening hook (the body must follow naturally from this):\n${hookContext}` : ''}
${ctaContext ? `\nClosing CTA (the body must build up to this):\n${ctaContext}` : ''}

SCRIPT FRAMEWORK REFERENCE — pick a different framework for each version:
${scriptFrameworks}

PLATFORM NOTES (${platform}):
${platformKnowledge}

Structure each body with clearly labeled sections separated by newlines:
[INTRO] - the setup after the hook
[MAIN POINT 1] - first key point with dialogue
[MAIN POINT 2] - second key point (if needed)
[MAIN POINT 3] - third key point (if needed)
[TRANSITION] or [B-ROLL: description] or [TEXT OVERLAY: text] markers where appropriate
[OUTRO] - lead into the CTA

Write actual spoken dialogue. Return ONLY valid JSON, no markdown:
{
  "body": "the primary structured body script with section labels",
  "variants": [
    {"body": "alternative body using a different framework", "angle": "name of the framework / approach"},
    {"body": "another alternative body using yet another framework", "angle": "name of the framework / approach"}
  ]
}

Each variant must use a DIFFERENT script framework than the primary — give the user real structural alternatives.`
  } else {
    const ctaPsychology = loadKnowledge('cta-psychology')
    prompt = `You are an elite short-form video scriptwriter. Write a primary closing CTA AND 3 alternative CTAs for the video below.

${creatorContext}
${style ? `- CTA style: ${style}` : ''}
${hookContext ? `\nOpening hook (the CTA should pay off the hook's promise):\n${hookContext}` : ''}
${bodyContext ? `\nBody content (the CTA must follow naturally from this):\n${bodyContext}` : ''}

CTA PSYCHOLOGY REFERENCE:
${ctaPsychology}

PLATFORM NOTES (${platform}):
${platformKnowledge}

Return ONLY valid JSON, no markdown:
{
  "cta": "the strongest closing CTA — one line, specific, drives the action",
  "variants": [
    {"cta": "a different CTA approach", "angle": "name of the CTA style / why it's different"},
    {"cta": "another distinct CTA approach", "angle": "name of the CTA style / why it's different"},
    {"cta": "a third distinct CTA approach", "angle": "name of the CTA style / why it's different"}
  ]
}

Each variant should use a DIFFERENT CTA style than the primary — share, save, follow, comment, link-in-bio, watch-again, etc.`
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
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

  // Normalize variants to {value, angle} so the client doesn't need to switch on target
  const rawVariants = (parsedResult.variants as Array<Record<string, unknown>> | undefined) ?? []
  const variants = rawVariants
    .map((v) => ({
      value: typeof v[target] === 'string' ? (v[target] as string) : '',
      angle: typeof v.angle === 'string' ? (v.angle as string) : undefined,
    }))
    .filter((v) => v.value.trim().length > 0)

  return NextResponse.json({
    [target]: parsedResult[target],
    variants,
  })
}
