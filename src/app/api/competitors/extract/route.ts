import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ExtractedPost {
  platform: 'tiktok' | 'instagram' | null
  handle: string | null
  caption: string | null
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  thumbnail_url: string | null
}

function detectPlatform(url: string): 'tiktok' | 'instagram' | null {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  return null
}

function extractTikTokHandle(url: string): string | null {
  const m = url.match(/tiktok\.com\/@([^/?]+)/)
  return m ? m[1] : null
}

function extractInstagramHandle(url: string): string | null {
  const m = url.match(/instagram\.com\/([^/?]+)/)
  if (m && !['p', 'reel', 'reels', 'stories', 'explore'].includes(m[1])) return m[1]
  // Try to get from reel/post URL structure
  return null
}

async function extractTikTok(url: string): Promise<ExtractedPost> {
  const handle = extractTikTokHandle(url)

  // TikTok oEmbed — free, no auth required
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Orianna/1.0)' },
  })

  if (res.ok) {
    const data = await res.json()
    return {
      platform: 'tiktok',
      handle: handle ?? (data.author_name ? data.author_name.replace('@', '') : null),
      caption: data.title ?? null,
      views: null,   // TikTok oEmbed doesn't include stats
      likes: null,
      comments: null,
      shares: null,
      thumbnail_url: data.thumbnail_url ?? null,
    }
  }

  return { platform: 'tiktok', handle, caption: null, views: null, likes: null, comments: null, shares: null, thumbnail_url: null }
}

async function extractInstagram(url: string): Promise<ExtractedPost> {
  const handle = extractInstagramHandle(url)

  // Try og: meta tags from the page
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Twitterbot/1.0)',
      Accept: 'text/html',
    },
  })

  if (res.ok) {
    const html = await res.text()
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
    const caption = titleMatch?.[1] ?? descMatch?.[1] ?? null

    return {
      platform: 'instagram',
      handle,
      caption: caption ? decodeHTMLEntities(caption) : null,
      views: null,
      likes: null,
      comments: null,
      shares: null,
      thumbnail_url: imageMatch?.[1] ?? null,
    }
  }

  return { platform: 'instagram', handle, caption: null, views: null, likes: null, comments: null, shares: null, thumbnail_url: null }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function isAllowedSocialUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    const allowed = ['tiktok.com', 'instagram.com']
    return allowed.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  if (!isAllowedSocialUrl(url)) return NextResponse.json({ error: 'URL must be from TikTok or Instagram' }, { status: 400 })

  const platform = detectPlatform(url)

  try {
    let result: ExtractedPost

    if (platform === 'tiktok') result = await extractTikTok(url)
    else if (platform === 'instagram') result = await extractInstagram(url)
    else result = { platform: null, handle: null, caption: null, views: null, likes: null, comments: null, shares: null, thumbnail_url: null }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ platform, handle: null, caption: null, views: null, likes: null, comments: null, shares: null, thumbnail_url: null })
  }
}
