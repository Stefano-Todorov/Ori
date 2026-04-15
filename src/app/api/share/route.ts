import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const INSPO_LIMIT = 100

function detectPlatform(url: string): 'tiktok' | 'instagram' | 'youtube' | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    if (host.endsWith('tiktok.com')) return 'tiktok'
    if (host.endsWith('instagram.com')) return 'instagram'
    if (host.endsWith('youtube.com') || host === 'youtu.be') return 'youtube'
  } catch {
    return null
  }
  return null
}

function extractHandle(url: string, platform: string): string | null {
  try {
    const u = new URL(url)
    const path = u.pathname
    if (platform === 'tiktok') {
      const m = path.match(/^\/@([^\/?#]+)/)
      return m ? m[1] : null
    }
    if (platform === 'instagram') {
      const m = path.match(/^\/([^\/?#]+)\/(p|reel|reels)\//)
      return m ? m[1] : null
    }
    if (platform === 'youtube') {
      const m = path.match(/^\/@([^\/?#]+)/)
      return m ? m[1] : null
    }
  } catch {}
  return null
}

// Shortcut share-sheet payloads can arrive as plain text (just the URL),
// form-encoded, or JSON. Normalize all three.
async function parseBody(req: NextRequest): Promise<{ url?: string; note?: string; token?: string }> {
  const ct = req.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try { return await req.json() } catch { return {} }
  }
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await req.formData()
    return {
      url: fd.get('url')?.toString(),
      note: fd.get('note')?.toString(),
      token: fd.get('token')?.toString(),
    }
  }
  // Plain text — try to extract first URL
  const text = (await req.text()).trim()
  const m = text.match(/https?:\/\/\S+/)
  return { url: m ? m[0] : text }
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: { 'Access-Control-Allow-Origin': '*' } })
}

export async function POST(req: NextRequest) {
  // Token can be in query, header, or body
  const urlObj = new URL(req.url)
  const tokenFromQuery = urlObj.searchParams.get('token')
  const tokenFromHeader = req.headers.get('x-share-token')

  const body = await parseBody(req)
  const token = tokenFromQuery || tokenFromHeader || body.token
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('share_token', token)
    .single()
  if (!profile) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

  const userId = profile.user_id

  const rl = checkRateLimit(`${userId}:share-mobile`, RATE_LIMITS['share-mobile'])
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterMs: rl.retryAfterMs },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    )
  }

  // url can come as ?url= for GET-style shortcuts too
  const sharedUrl = (body.url || urlObj.searchParams.get('url') || '').trim()
  if (!sharedUrl) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  const platform = detectPlatform(sharedUrl)
  if (!platform) {
    return NextResponse.json({ error: 'unsupported url — must be tiktok, instagram, or youtube' }, { status: 400 })
  }

  // Dedupe by URL
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', userId)
    .eq('url', sharedUrl)
    .limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const handle = extractHandle(sharedUrl, platform)

  // Mark as competitor post too if handle matches a tracked competitor
  let isTrackedCompetitor = false
  if (handle) {
    const { data: comp } = await supabase
      .from('competitors')
      .select('id')
      .eq('user_id', userId)
      .ilike('handle', handle)
      .limit(1)
    isTrackedCompetitor = !!(comp && comp.length > 0)
  }

  const { error } = await supabase.from('posts').insert({
    user_id: userId,
    platform,
    url: sharedUrl,
    caption: body.note || null,
    ai_notes: body.note || null,
    is_competitor: isTrackedCompetitor,
    competitor_handle: handle,
    is_trending: true,
  })
  if (error) {
    console.error('[api/share] insert error:', error.message)
    return NextResponse.json({ error: 'failed to save' }, { status: 500 })
  }

  // Auto-archive oldest beyond cap
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_trending', true)
    .neq('status', 'archived')
  if (count && count > INSPO_LIMIT) {
    const { data: oldest } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_trending', true)
      .neq('status', 'archived')
      .order('created_at', { ascending: true })
      .limit(count - INSPO_LIMIT)
    if (oldest && oldest.length > 0) {
      await supabase.from('posts').update({ status: 'archived' }).in('id', oldest.map(p => p.id))
    }
  }

  return NextResponse.json({ ok: true, platform, handle })
}

// Allow GET for super-simple Shortcut setups (just hits a URL with ?token=&url=)
export async function GET(req: NextRequest) {
  return POST(req)
}
