import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { loadKnowledge, loadPlatformKnowledge } from '@/lib/knowledge'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getCorsHeaders } from '@/lib/extension-auth'

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json(null, { headers: getCorsHeaders(req) })
}

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const supabase = createServiceClient()
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
    if (!error && user) return { user, supabase }
  }
  // Fallback to cookie auth — use the cookie-authenticated client (respects RLS)
  const cookieClient = await createClient()
  const { data: { user: cookieUser }, error: cookieError } = await cookieClient.auth.getUser()
  if (!cookieError && cookieUser) return { user: cookieUser, supabase: cookieClient }
  return null
}

export async function POST(request: NextRequest) {
  const auth = await getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(request) })
  }
  const { user, supabase } = auth

  const rl = checkRateLimit(`${user.id}:competitor-ideas`, RATE_LIMITS['competitor-ideas'])
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: getCorsHeaders(request) })

  // Check usage limit
  const usage = await checkUsage(user.id, 'competitor_ideas')
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      message: usage.limit === 0
        ? 'AI idea generation from competitors is not available on your current plan. Upgrade to Creator or above.'
        : `You've used all ${usage.limit} competitor idea generations this month. Upgrade for more.`,
      usage,
    }, { status: 429, headers: getCorsHeaders(request) })
  }

  const body = await request.json()
  const { postId, handle, platform, caption, hookText, views, likes, shares, saves, hashtags, duration, count: requestedCount, imageBase64, autoSave } = body
  const count = Math.min(Math.max(requestedCount ?? 3, 1), 5)

  const { data: profile } = await supabase
    .from('profiles')
    .select('niche, sub_niche, goals')
    .eq('user_id', user.id)
    .single()

  // Load knowledge
  const hookFormulas = loadKnowledge('hook-formulas')
  const platformKnowledge = loadPlatformKnowledge(platform ?? 'tiktok')
  const scriptFrameworks = loadKnowledge('script-frameworks')
  const ctaPsychology = loadKnowledge('cta-psychology')

  const engagement = views ? ((((likes ?? 0) + (shares ?? 0)) / views) * 100).toFixed(1) : null

  const prompt = `You are an expert short-form video strategist with deep knowledge of hooks, scripting frameworks, and platform algorithms. A creator is studying a competitor's top-performing post and wants video ideas they can make on the same topic — but adapted to their own niche.${imageBase64 ? ' A thumbnail of the video is attached — use visual cues to better understand the content style.' : ''}

CREATOR PROFILE:
- Niche: ${profile?.niche ?? 'general'}${profile?.sub_niche ? ` (${profile.sub_niche})` : ''}
- Goals: ${profile?.goals ?? 'grow audience'}

COMPETITOR POST (from @${handle} on ${platform}):
- Caption: ${caption ?? '(none)'}
- Hook: ${hookText ?? '(not provided)'}
- Views: ${views?.toLocaleString() ?? 'unknown'}
- Likes: ${likes?.toLocaleString() ?? 'unknown'}
${shares != null ? `- Shares: ${shares.toLocaleString()}` : ''}
${saves != null ? `- Saves: ${saves.toLocaleString()}` : ''}
${engagement ? `- Engagement rate: ${engagement}%` : ''}
${hashtags?.length ? `- Hashtags: ${hashtags.join(', ')}` : ''}
${duration ? `- Duration: ${duration} seconds` : ''}

HOOK FORMULA REFERENCE — use these proven patterns for the hook_idea:
${hookFormulas}

SCRIPT FRAMEWORK REFERENCE — use these structures to inform the idea format:
${scriptFrameworks}

CTA REFERENCE — suggest CTAs grounded in psychology:
${ctaPsychology}

PLATFORM KNOWLEDGE (${platform}):
${platformKnowledge}

Generate ${count} specific, distinct video idea${count === 1 ? '' : 's'} this creator could make INSPIRED by this competitor post, but adapted for THEIR niche and audience. Each idea MUST:
- Use a specific hook formula from the reference (name the formula used)
- Suggest a script framework (AIDA, PAS, List, Story, Tutorial) that fits the idea
- Include a psychologically-grounded CTA
- Be specific (not vague like "make a video about X")
- Match the platform's algorithm preferences

Return a JSON array of exactly ${count} object${count === 1 ? '' : 's'}:
[
  {
    "idea": "The video idea — specific and actionable (1-2 sentences)",
    "hook_idea": "A specific hook line using a named hook formula",
    "caption": "Suggested caption with 3-5 targeted hashtags",
    "difficulty": "easy" | "medium" | "hard",
    "video_type": "talking head" | "voiceover" | "tutorial" | "storytime" | "list" | "reaction"
  }
]

Return ONLY the JSON array, no other text.`

  const userContent: Parameters<typeof anthropic.messages.create>[0]['messages'][0]['content'] = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: userContent }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI error' }, { status: 500, headers: getCorsHeaders(request) })
  }

  let ideas: {
    idea: string
    hook_idea: string
    caption: string
    difficulty: string
    video_type: string
  }[]

  try {
    const match = content.text.match(/\[[\s\S]*\]/)
    ideas = JSON.parse(match ? match[0] : content.text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse ideas' }, { status: 500, headers: getCorsHeaders(request) })
  }

  // Only auto-save ideas if autoSave flag is true
  let saved = false
  if (autoSave !== false) {
    const inserts = ideas.map(idea => ({
      user_id: user.id,
      idea: idea.idea,
      source: `competitor: @${handle}`,
      hook_idea: idea.hook_idea || null,
      caption: idea.caption || null,
      difficulty: (['easy', 'medium', 'hard'].includes(idea.difficulty) ? idea.difficulty : null) as 'easy' | 'medium' | 'hard' | null,
      video_type: idea.video_type || null,
      inspiration_url: body.url || null,
      status: 'new' as const,
    }))

    const { error } = await supabase.from('content_ideas').insert(inserts)
    if (error) {
      console.error('[competitors/ideas] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to save ideas' }, { status: 500, headers: getCorsHeaders(request) })
    }
    saved = true
  }

  await incrementUsage(user.id, 'competitor_ideas')

  return NextResponse.json({ count: ideas.length, ideas, saved }, { headers: getCorsHeaders(request) })
}
