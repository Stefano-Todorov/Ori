import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { loadKnowledge, loadPlatformKnowledge } from '@/lib/knowledge'
import { z } from 'zod'

const RequestSchema = z.object({
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  platform: z.string(),
  angle: z.string().optional(),
  hookAngles: z.array(z.string()).optional(),
  ctaAngles: z.array(z.string()).optional(),
  generateVariants: z.boolean().default(true),
  randomTopic: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { topic, difficulty, platform, angle, hookAngles, ctaAngles, generateVariants, randomTopic } = parsed.data
  const primaryHook = hookAngles?.[0]
  const primaryCta = ctaAngles?.[0]
  const extraHookStyles = hookAngles?.slice(1) ?? []

  const { data: profile } = await supabase
    .from('profiles')
    .select('niche, sub_niche, goals')
    .eq('user_id', user.id)
    .single()

  const difficultyGuides = {
    easy: 'talking head, no edits needed, just speak to camera, 30-60 seconds',
    medium: 'some B-roll or text overlays, basic editing, 45-90 seconds',
    hard: 'complex editing, transitions, multiple clips, possibly motion graphics, 60-180 seconds',
  }

  const hookAngleGuides: Record<string, string> = {
    Negative: 'Start with what NOT to do, a mistake, or a warning. Creates instant curiosity.',
    List: 'Open with a numbered list promise (e.g. "3 things...", "5 reasons..."). Sets clear expectations.',
    POV: 'First-person perspective hook. Put the viewer in your shoes immediately.',
    Question: 'Open with a direct question the viewer instantly relates to.',
    Storytime: 'Start mid-story with the most dramatic or surprising moment first.',
    Controversial: 'Open with a bold, polarizing statement that challenges common beliefs.',
    Statistic: 'Lead with a shocking, specific number or data point.',
    Direct: 'Straight to the point — state the value proposition immediately.',
  }

  const ctaAngleGuides: Record<string, string> = {
    'Watch again': 'Tell them the video is better the second time / they missed something. Drives replays.',
    'Follow for more': 'Promise more value like this if they follow.',
    'Comment below': 'Ask a specific question to drive comments.',
    'Share this': 'Tell them who specifically needs to see this.',
    'Save for later': 'Position as reference content they will want to come back to.',
    'Link in bio': 'Direct them to take a next step via link.',
  }

  // Load knowledge
  const hookFormulas = loadKnowledge('hook-formulas')
  const scriptFrameworks = loadKnowledge('script-frameworks')
  const platformKnowledge = loadPlatformKnowledge(platform)
  const ctaPsychology = loadKnowledge('cta-psychology')

  const prompt = `You are an elite short-form video scriptwriter with deep expertise in viral content mechanics, hook psychology, and platform algorithms. Create a complete, ready-to-film script that is engineered to maximize watch time and engagement.

Creator profile:
- Niche: ${profile?.niche ?? 'general'}${profile?.sub_niche ? ` (${profile.sub_niche})` : ''}
- Platform: ${platform}
- Goals: ${profile?.goals ?? 'grow audience'}

Video request:
${randomTopic
  ? `- Topic: SURPRISE ME — choose a compelling, viral-worthy video topic that would perform well for this creator's niche and platform. Pick something specific, timely, or counterintuitive that audiences love to share.`
  : `- Topic: ${topic}`}
- Difficulty: ${difficulty} (${difficultyGuides[difficulty]})
${angle ? `- Content angle: ${angle}` : ''}
${primaryHook ? `- Primary hook style: ${primaryHook} — ${hookAngleGuides[primaryHook] ?? ''}` : ''}
${extraHookStyles.length > 0 ? `- Also generate variant hooks for these styles: ${extraHookStyles.join(', ')}` : ''}
${primaryCta ? `- Primary CTA style: ${primaryCta} — ${ctaAngleGuides[primaryCta] ?? ''}` : ''}
${(ctaAngles?.length ?? 0) > 1 ? `- Alternative CTA styles to consider: ${ctaAngles!.slice(1).join(', ')}` : ''}

HOOK FORMULA REFERENCE — use a proven pattern from this list:
${hookFormulas}

SCRIPT FRAMEWORK REFERENCE — structure the body using one of these frameworks:
${scriptFrameworks}

CTA PSYCHOLOGY REFERENCE — ground the CTA in these principles:
${ctaPsychology}

PLATFORM KNOWLEDGE (${platform}) — optimize for this platform's algorithm:
${platformKnowledge}

IMPORTANT: The body must be structured into clearly labeled sections separated by newlines. Use this format:
[INTRO] - the setup after the hook
[MAIN POINT 1] - first key point with dialogue
[MAIN POINT 2] - second key point (if needed)
[MAIN POINT 3] - third key point (if needed)
[TRANSITION] or [B-ROLL: description] or [TEXT OVERLAY: text] markers where appropriate
[OUTRO] - lead into the CTA

Return a JSON object with EXACTLY this structure (no markdown, just raw JSON):
{${randomTopic ? `
  "generated_topic": "The specific topic you chose for this video",` : ''}
  "hook": "The opening line/action (first 1-3 seconds). Make it IMPOSSIBLE to scroll past.",
  "hook_type": "${primaryHook ?? 'Direct'}",
  "body": "The full structured script with section labels as described above. Write actual spoken dialogue.",
  "cta": "The closing call to action line",
  "cta_type": "${primaryCta ?? 'Follow for more'}",
  "hashtags": ["relevant", "hashtags", "for", "${platform}"],
  "estimated_duration": "e.g. 45-60 seconds",
  "hook_explanation": "Why this hook works for this topic",
  "filming_tips": "Specific tips for recording this at ${difficulty} difficulty"${generateVariants ? `,
  "variants": [${extraHookStyles.length > 0
    ? extraHookStyles.map((s) => `\n    { "hook": "Hook written in ${s} style", "angle": "${s} — explain why this style works for this topic" }`).join(',')
    : `
    { "hook": "Alternative hook 1", "angle": "Hook style and why it works differently" },
    { "hook": "Alternative hook 2", "angle": "Hook style and why it works differently" },
    { "hook": "Alternative hook 3", "angle": "Hook style and why it works differently" }`}
  ]` : ''}
}`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  let scriptData: Record<string, unknown>
  try {
    scriptData = JSON.parse(content.text)
  } catch {
    const match = content.text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse script' }, { status: 500 })
    scriptData = JSON.parse(match[0])
  }

  const finalTopic = randomTopic
    ? (scriptData.generated_topic as string | undefined) ?? 'Random script'
    : topic

  const { data: script, error } = await supabase
    .from('scripts')
    .insert({
      user_id: user.id,
      topic: finalTopic,
      niche: profile?.niche,
      hook: scriptData.hook as string,
      body: scriptData.body as string,
      cta: scriptData.cta as string,
      hashtags: scriptData.hashtags as string[],
      difficulty,
      estimated_duration: scriptData.estimated_duration as string,
      variants: scriptData.variants ?? [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ script, meta: scriptData })
}
