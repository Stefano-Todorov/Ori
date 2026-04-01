import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { anthropic, MODEL } from '@/lib/claude'
import { getCorsHeaders } from '@/lib/extension-auth'

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json(null, { headers: getCorsHeaders(req) })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(req) })
  }

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: getCorsHeaders(req) })
  }

  const { imageBase64, mediaType } = await req.json()
  if (!imageBase64) return NextResponse.json({ error: 'Missing image' }, { status: 400 })

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const type = validTypes.includes(mediaType) ? mediaType : 'image/jpeg'

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `This is a screenshot of a social media post (TikTok or Instagram Reel).

Extract the following information visible in the screenshot:
- caption: the video caption or title text
- hook_text: the first line of the caption or any text overlay that appears to be the hook/opening
- handle: the creator's @username (without the @)
- views: view count as a plain number (convert 1.2M → 1200000, 500K → 500000, etc.)
- likes: like count as a plain number
- comments: comment count as a plain number
- shares: share/repost count as a plain number (if visible)
- platform: "tiktok" or "instagram"

If a value is not visible in the screenshot, use null.

Return ONLY a JSON object with these exact keys, no other text:
{
  "caption": "...",
  "hook_text": "...",
  "handle": "...",
  "views": 1200000,
  "likes": 50000,
  "comments": 1200,
  "shares": null,
  "platform": "tiktok"
}`,
          },
        ],
      },
    ],
  })

  const text = message.content[0]
  if (text.type !== 'text') return NextResponse.json({ error: 'AI error' }, { status: 500, headers: getCorsHeaders(req) })

  try {
    const match = text.text.match(/\{[\s\S]*\}/)
    const data = JSON.parse(match ? match[0] : text.text)
    return NextResponse.json(data, { headers: getCorsHeaders(req) })
  } catch {
    return NextResponse.json({ error: 'Could not parse response' }, { status: 500, headers: getCorsHeaders(req) })
  }
}
