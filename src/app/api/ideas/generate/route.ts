import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
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

  const prompts: Record<string, string> = {
    hook: `You are an expert short-form video hook writer. Generate ${count} compelling, scroll-stopping hook${count > 1 ? 's' : ''} (opening lines) for this video.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

Each hook should be 1-2 sentences max. Make them impossible to scroll past. Vary the styles (question, bold statement, story opener, negative, statistic, etc.).

Return a JSON array of exactly ${count} string${count > 1 ? 's' : ''}:
["hook 1", "hook 2", ...]

Return ONLY the JSON array, no other text.`,

    cta: `You are an expert at writing calls-to-action for short-form video. Generate ${count} effective CTA${count > 1 ? 's' : ''} for this video.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

Each CTA should drive a specific action (follow, comment, share, save, watch again, link in bio). Make them natural and compelling, not generic.

Return a JSON array of exactly ${count} string${count > 1 ? 's' : ''}:
["cta 1", "cta 2", ...]

Return ONLY the JSON array, no other text.`,

    caption: `You are an expert social media caption writer. Generate ${count} engaging caption${count > 1 ? 's' : ''} with relevant hashtags for this video.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

Each caption should include a strong opening line, the main message, and 5-10 relevant hashtags. Vary the tone (storytelling, educational, controversial, relatable, etc.).

Return a JSON array of exactly ${count} string${count > 1 ? 's' : ''}:
["caption 1 with #hashtags", "caption 2 with #hashtags", ...]

Return ONLY the JSON array, no other text.`,

    similar: `You are an expert short-form video strategist. Generate ${count} similar but distinct video idea${count > 1 ? 's' : ''} inspired by this one.

Creator: ${niche}${subNiche} creator. Goals: ${goals}

${contextBlock}

${instructions ? `Creator's instructions: ${instructions}` : ''}

Each idea should be specific and actionable (not vague). Explain the angle and why it would work. Make each one different enough to be a standalone video.

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

  return NextResponse.json({ results })
}
