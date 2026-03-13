import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude'

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
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!error && user) return { user, supabase: createServiceClient() }
  return null
}

export async function POST(req: NextRequest) {
  const auth = await getUser(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }
  const { user, supabase } = auth

  const body = await req.json()
  const { handle, platform, caption, hookText, views, likes, comments, url, imageBase64, thumbnailUrl } = body

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

  const engagement = views ? (((likes + (comments ?? 0)) / views) * 100).toFixed(1) : null

  const prompt = `You are an expert short-form video analyst. Analyze why this video performed well based on the available data.${resolvedImageBase64 ? ' A thumbnail/screenshot of the video is attached — use visual cues (text overlays, framing, expressions, setting) in your analysis.' : ''}

CREATOR CONTEXT:
- Niche: ${profile?.niche ?? 'general'}${profile?.sub_niche ? ` (${profile.sub_niche})` : ''}

VIDEO DATA (from @${handle} on ${platform}):
- Caption: ${caption ?? '(none)'}
- Hook/opening: ${hookText ?? '(not available)'}
- Views: ${views?.toLocaleString() ?? 'unknown'}
- Likes: ${likes?.toLocaleString() ?? 'unknown'}
- Comments: ${comments?.toLocaleString() ?? 'unknown'}
${engagement ? `- Engagement rate: ${engagement}%` : ''}
- URL: ${url ?? '(none)'}

Analyze why this video likely performed well. Consider:
- Hook effectiveness (first 1-3 seconds)
- Caption and hashtag strategy
- Engagement ratio and what it signals
- Content format and trending patterns
- What makes viewers watch, like, comment, or share
${resolvedImageBase64 ? '- Visual elements: text overlays, thumbnail appeal, framing, expressions' : ''}

Return 3-5 concise bullet points. Each bullet should be a specific, actionable insight (not generic advice). Start each bullet with a bold keyword.

Format: Return ONLY the bullet points as plain text, one per line, starting with "- **Keyword**: explanation"`

  const userContent: Parameters<typeof anthropic.messages.create>[0]['messages'][0]['content'] = resolvedImageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: resolvedImageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: userContent }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI error' }, { status: 500, headers: corsHeaders })
  }

  return NextResponse.json({ analysis: content.text.trim() }, { headers: corsHeaders })
}
