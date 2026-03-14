import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  const platform = req.nextUrl.searchParams.get('platform') ?? ''
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    // TikTok: try multiple download APIs
    if (platform === 'tiktok' || url.includes('tiktok.com')) {
      // Method 1: tikwm.com API
      try {
        const res = await fetch('https://www.tikwm.com/api/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `url=${encodeURIComponent(url)}&hd=1`,
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          const json = await res.json()
          const videoUrl = json?.data?.hdplay || json?.data?.play
          if (videoUrl) {
            const streamResult = await streamVideo(videoUrl, 'tiktok')
            if (streamResult) return streamResult
          }
        }
      } catch { /* try next method */ }

      // Method 2: tikcdn.io API
      try {
        const res = await fetch(`https://tikcdn.io/ssstik/${extractTikTokId(url)}`, {
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok && res.headers.get('content-type')?.includes('video')) {
          return new NextResponse(res.body, {
            headers: {
              'Content-Type': 'video/mp4',
              'Content-Disposition': `attachment; filename="video_tiktok_${Date.now()}.mp4"`,
              ...(res.headers.get('content-length')
                ? { 'Content-Length': res.headers.get('content-length')! }
                : {}),
            },
          })
        }
      } catch { /* fall through */ }

      return NextResponse.json({ error: 'TikTok download failed. The video may be private or the download service is temporarily unavailable.' }, { status: 400 })
    }

    // YouTube: no server-side download possible
    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      return NextResponse.json({ error: 'YouTube downloads are not supported. Use the "View original" link instead.' }, { status: 400 })
    }

    // Instagram: try multiple approaches
    if (platform === 'instagram' || url.includes('instagram.com')) {
      // Normalize the URL to ensure it ends with the right format
      const cleanUrl = normalizeInstagramUrl(url)

      // Method 1: Try fetching the page with various user agents to get og:video
      const userAgents = [
        'Mozilla/5.0 (compatible; Twitterbot/1.0)',
        'facebookexternalhit/1.1',
        'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      ]

      for (const ua of userAgents) {
        try {
          const pageRes = await fetch(cleanUrl, {
            headers: {
              'User-Agent': ua,
              Accept: 'text/html',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(10000),
          })
          if (pageRes.ok) {
            const html = await pageRes.text()
            // Try og:video first, then video:url
            const videoMatch = html.match(/<meta property="og:video(?::url)?" content="([^"]+)"/)
              || html.match(/<meta content="([^"]+)" property="og:video(?::url)?"/)
            if (videoMatch?.[1]) {
              const streamResult = await streamVideo(videoMatch[1], 'instagram')
              if (streamResult) return streamResult
            }
          }
        } catch { /* try next UA */ }
      }

      return NextResponse.json({ error: 'Instagram download failed. Instagram blocks most server-side downloads. Try right-clicking the video on the original post.' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Unsupported platform. Only TikTok and Instagram downloads are supported.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Download failed. Try again later.' }, { status: 500 })
  }
}

async function streamVideo(videoUrl: string, platform: string): Promise<NextResponse | null> {
  try {
    const res = await fetch(videoUrl, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: platform === 'tiktok' ? 'https://www.tiktok.com/' : 'https://www.instagram.com/',
      },
    })
    if (res.ok && res.body) {
      const contentType = res.headers.get('content-type')
      if (contentType && !contentType.includes('text/html')) {
        return new NextResponse(res.body, {
          headers: {
            'Content-Type': contentType.includes('video') ? contentType : 'video/mp4',
            'Content-Disposition': `attachment; filename="video_${platform}_${Date.now()}.mp4"`,
            ...(res.headers.get('content-length')
              ? { 'Content-Length': res.headers.get('content-length')! }
              : {}),
          },
        })
      }
    }
  } catch { /* return null */ }
  return null
}

function extractTikTokId(url: string): string {
  const match = url.match(/\/video\/(\d+)/)
  return match?.[1] ?? ''
}

function normalizeInstagramUrl(url: string): string {
  // Ensure the URL has the right format for fetching
  let clean = url.split('?')[0]
  if (!clean.endsWith('/')) clean += '/'
  return clean
}
