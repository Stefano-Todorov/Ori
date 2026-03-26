import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'
import { loadKnowledge, loadPlatformKnowledge } from '@/lib/knowledge'
import { checkUsage, incrementUsage } from '@/lib/usage'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
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

export async function POST(req: NextRequest) {
  const auth = await getUser(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }
  const { user, supabase } = auth

  // Check usage limit
  const usage = await checkUsage(user.id, 'competitor_analyze')
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      message: usage.limit === 0
        ? 'Post analysis is not available on your current plan. Upgrade to Creator or above.'
        : `You've used all ${usage.limit} post analyses this month. Upgrade for more.`,
      usage,
    }, { status: 429, headers: corsHeaders })
  }

  const body = await req.json()
  const { handle, platform, caption, hookText, views, likes, comments, shares, saves, url, imageBase64, thumbnailUrl, hashtags, duration } = body

  // If no base64 provided but we have a thumbnail URL, fetch and convert it
  let resolvedImageBase64 = imageBase64 ?? null
  if (!resolvedImageBase64 && thumbnailUrl) {
    try {
      const imgRes = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(8000) })
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer()
        resolvedImageBase64 = Buffer.from(buffer).toString('base64')
      }
    } catch {
      // Thumbnail fetch failed — proceed without image
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('niche, sub_niche, goals')
    .eq('user_id', user.id)
    .single()

  const totalEngagement = (likes ?? 0) + (comments ?? 0) + (shares ?? 0)
  const engagement = views ? ((totalEngagement / views) * 100).toFixed(1) : null
  const likeRate = views ? (((likes ?? 0) / views) * 100).toFixed(1) : null
  const commentRate = views ? (((comments ?? 0) / views) * 100).toFixed(1) : null
  const shareRate = views && shares ? ((shares / views) * 100).toFixed(1) : null
  const saveRate = views && saves ? ((saves / views) * 100).toFixed(1) : null

  // Load knowledge
  const platformKnowledge = loadPlatformKnowledge(platform ?? 'tiktok')
  const analysisFramework = loadKnowledge('content-analysis')
  const hookFormulas = loadKnowledge('hook-formulas')

  const prompt = `You are an expert short-form video analyst with deep knowledge of platform algorithms and content strategy. Analyze why this video performed well based on the available data.${resolvedImageBase64 ? ' A thumbnail/screenshot of the video is attached — use visual cues (text overlays, framing, expressions, setting) in your analysis.' : ''}

CREATOR CONTEXT:
- Niche: ${profile?.niche ?? 'general'}${profile?.sub_niche ? ` (${profile.sub_niche})` : ''}

VIDEO DATA (from @${handle} on ${platform}):
- Caption: ${caption ?? '(none)'}
- Hook/opening: ${hookText ?? '(not available)'}
- Views: ${views?.toLocaleString() ?? 'unknown'}
- Likes: ${likes?.toLocaleString() ?? 'unknown'}${likeRate ? ` (${likeRate}% like rate)` : ''}
- Comments: ${comments?.toLocaleString() ?? 'unknown'}${commentRate ? ` (${commentRate}% comment rate)` : ''}
${shares != null ? `- Shares: ${shares.toLocaleString()}${shareRate ? ` (${shareRate}% share rate)` : ''}` : ''}
${saves != null ? `- Saves: ${saves.toLocaleString()}${saveRate ? ` (${saveRate}% save rate)` : ''}` : ''}
${engagement ? `- Overall engagement rate: ${engagement}%` : ''}
${hashtags?.length ? `- Hashtags: ${hashtags.join(', ')}` : ''}
${duration ? `- Duration: ${duration} seconds` : ''}
- URL: ${url ?? '(none)'}

PLATFORM ALGORITHM KNOWLEDGE (for ${platform}):
${platformKnowledge}

ANALYSIS FRAMEWORK — use this structure:
${analysisFramework}

HOOK FORMULA REFERENCE — identify which pattern was used:
${hookFormulas}

Analyze why this video likely performed well. Your analysis MUST:
1. Identify the specific hook formula used (by name from the reference) and explain why it works
2. Analyze the engagement ratios against the benchmarks provided — what do the specific ratios tell us?
3. Explain performance in terms of the platform's actual algorithm signals (not generic "good engagement")
4. Identify the content format and why it works for this niche
5. Give specific, actionable takeaways the creator can apply to their own content
${resolvedImageBase64 ? '6. Analyze visual elements: text overlays, thumbnail appeal, framing, expressions, setting' : ''}

Return 4-6 concise bullet points. Each bullet should be a specific, actionable insight grounded in the frameworks above (not generic advice). Start each bullet with a bold keyword.

Format: Return ONLY the bullet points as plain text, one per line, starting with "- **Keyword**: explanation"`

  const userContent: Parameters<typeof anthropic.messages.create>[0]['messages'][0]['content'] = resolvedImageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: resolvedImageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: userContent }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI error' }, { status: 500, headers: corsHeaders })
  }

  await incrementUsage(user.id, 'competitor_analyze')

  return NextResponse.json({ analysis: content.text.trim() }, { headers: corsHeaders })
}
