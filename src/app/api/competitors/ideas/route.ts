import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { anthropic, MODEL } from '@/lib/claude'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const body = await request.json()
  const { postId, handle, platform, caption, hookText, views, likes, count: requestedCount, imageBase64 } = body
  const count = Math.min(Math.max(requestedCount ?? 3, 1), 5)

  const { data: profile } = await supabase
    .from('profiles')
    .select('niche, sub_niche, goals')
    .eq('user_id', user.id)
    .single()

  const prompt = `You are an expert short-form video strategist. A creator is studying a competitor's top-performing post and wants video ideas they can make on the same topic — but adapted to their own niche.${imageBase64 ? ' A thumbnail of the video is attached — use visual cues to better understand the content style.' : ''}

CREATOR PROFILE:
- Niche: ${profile?.niche ?? 'general'}${profile?.sub_niche ? ` (${profile.sub_niche})` : ''}
- Goals: ${profile?.goals ?? 'grow audience'}

COMPETITOR POST (from @${handle} on ${platform}):
- Caption: ${caption ?? '(none)'}
- Hook: ${hookText ?? '(not provided)'}
- Views: ${views?.toLocaleString() ?? 'unknown'}
- Likes: ${likes?.toLocaleString() ?? 'unknown'}

Generate ${count} specific, distinct video idea${count === 1 ? '' : 's'} this creator could make INSPIRED by this competitor post, but adapted for THEIR niche and audience. Each idea should:
- Have a compelling video angle/hook concept
- Be specific (not vague like "make a video about X")
- Explain WHY this type of content performed well and how to apply it

Return a JSON array of exactly ${count} object${count === 1 ? '' : 's'}:
[
  {
    "idea": "The video idea — specific and actionable (1-2 sentences)",
    "hook_idea": "A specific hook line to open the video with",
    "caption": "Suggested caption for posting",
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
    max_tokens: 1500,
    messages: [{ role: 'user', content: userContent }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI error' }, { status: 500, headers: corsHeaders })
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
    return NextResponse.json({ error: 'Failed to parse ideas' }, { status: 500, headers: corsHeaders })
  }

  // Save all 3 ideas to content_ideas
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })

  return NextResponse.json({ count: ideas.length, ideas }, { headers: corsHeaders })
}
