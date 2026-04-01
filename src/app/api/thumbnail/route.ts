import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_DOMAINS = [
  'tiktok.com', 'tiktokcdn.com',
  'instagram.com', 'cdninstagram.com', 'fbcdn.net',
  'pexels.com', 'unsplash.com',
]

function isAllowedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ thumbnail: null })
  if (!isAllowedUrl(url)) return NextResponse.json({ error: 'URL domain not allowed' }, { status: 400 })

  try {
    // Try oEmbed for known platforms
    const thumbnail = await fetchOEmbed(url) ?? await fetchOgImage(url)
    return NextResponse.json({ thumbnail })
  } catch {
    return NextResponse.json({ thumbnail: null })
  }
}

async function fetchOEmbed(url: string): Promise<string | null> {
  let oembedUrl: string | null = null

  if (url.includes('tiktok.com')) {
    oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
  } else if (url.includes('instagram.com')) {
    // Instagram oEmbed requires a token, fall back to og:image
    return null
  }

  if (!oembedUrl) return null

  try {
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.thumbnail_url ?? null
  } catch {
    return null
  }
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Orianna/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    // Only read first 50KB to find meta tags
    const reader = res.body?.getReader()
    if (!reader) return null

    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
    }
    reader.cancel()

    // Extract og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    if (ogMatch) return ogMatch[1]

    // Try twitter:image
    const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)
    if (twMatch) return twMatch[1]

    return null
  } catch {
    return null
  }
}
