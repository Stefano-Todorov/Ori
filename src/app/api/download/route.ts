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

    // Instagram: use embed page to extract video URL server-side
    if (platform === 'instagram' || url.includes('instagram.com') || url.includes('cdninstagram.com')) {
      // If it's already a direct CDN URL, just proxy it
      if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
        const streamResult = await streamVideo(url, 'instagram')
        if (streamResult) return streamResult
      }

      const shortcode = extractInstagramShortcode(url)
      if (shortcode) {
        // Method 1: Fetch the embed page (designed for external access, not blocked like API)
        try {
          const embedRes = await fetch(`https://www.instagram.com/p/${shortcode}/embed/`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(15000),
          })
          if (embedRes.ok) {
            const html = await embedRes.text()
            // The embed page contains video URL in several possible formats
            const videoUrl = extractVideoUrlFromEmbed(html)
            if (videoUrl) {
              const streamResult = await streamVideo(videoUrl, 'instagram')
              if (streamResult) return streamResult
            }
          }
        } catch { /* try next method */ }

        // Method 2: GraphQL query via embed-related endpoint
        try {
          const mediaId = shortcodeToMediaId(shortcode)
          const res = await fetch(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'X-IG-App-ID': '936619743392459',
            },
            signal: AbortSignal.timeout(10000),
          })
          if (res.ok) {
            const data = await res.json()
            const item = data?.items?.[0]
            const videoUrl = item?.video_versions?.[0]?.url ?? item?.video_url
            if (videoUrl) {
              const streamResult = await streamVideo(videoUrl, 'instagram')
              if (streamResult) return streamResult
            }
          }
        } catch { /* try next method */ }

        // Method 3: og:video from page with bot UA
        try {
          const pageRes = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
            headers: {
              'User-Agent': 'facebookexternalhit/1.1',
              Accept: 'text/html',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(10000),
          })
          if (pageRes.ok) {
            const html = await pageRes.text()
            const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/)
            if (videoMatch?.[1]) {
              const streamResult = await streamVideo(decodeHtmlEntities(videoMatch[1]), 'instagram')
              if (streamResult) return streamResult
            }
          }
        } catch { /* fall through */ }
      }

      return NextResponse.json({ error: 'Instagram download failed. The video may be private or the download service is temporarily unavailable.' }, { status: 400 })
    }

    // Generic: try proxying the URL directly (for any direct video URL)
    const streamResult = await streamVideo(url, platform || 'video')
    if (streamResult) return streamResult
    return NextResponse.json({ error: 'Download failed. Unsupported platform or URL.' }, { status: 400 })
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

function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
  return match?.[2] ?? null
}

function shortcodeToMediaId(shortcode: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let id = BigInt(0)
  for (const char of shortcode) {
    id = id * BigInt(64) + BigInt(alphabet.indexOf(char))
  }
  return id.toString()
}

function extractVideoUrlFromEmbed(html: string): string | null {
  // Try multiple patterns that appear in Instagram embed pages

  // Pattern 1: "video_url":"..." in embedded JSON
  const videoUrlMatch = html.match(/"video_url":"([^"]+)"/)
  if (videoUrlMatch?.[1]) {
    return decodeUnicodeEscapes(videoUrlMatch[1])
  }

  // Pattern 2: data-video-url="..." attribute
  const dataVideoMatch = html.match(/data-video-url="([^"]+)"/)
  if (dataVideoMatch?.[1]) {
    return decodeHtmlEntities(dataVideoMatch[1])
  }

  // Pattern 3: <video> source with src
  const videoSrcMatch = html.match(/<video[^>]*\ssrc="([^"]+)"/)
  if (videoSrcMatch?.[1]) {
    return decodeHtmlEntities(videoSrcMatch[1])
  }

  // Pattern 4: source tag inside video
  const sourceMatch = html.match(/<source[^>]*\ssrc="([^"]+)"[^>]*type="video/)
  if (sourceMatch?.[1]) {
    return decodeHtmlEntities(sourceMatch[1])
  }

  // Pattern 5: "video_versions":[{"url":"..."}]
  const versionsMatch = html.match(/"video_versions":\[.*?"url":"([^"]+)"/)
  if (versionsMatch?.[1]) {
    return decodeUnicodeEscapes(versionsMatch[1])
  }

  return null
}

function decodeUnicodeEscapes(str: string): string {
  return str.replace(/\\u([\da-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  ).replace(/\\\//g, '/')
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

