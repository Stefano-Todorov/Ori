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

    // Instagram: extract video URL via multiple methods
    if (platform === 'instagram' || url.includes('instagram.com')) {
      const cleanUrl = normalizeInstagramUrl(url)
      const shortcode = extractInstagramShortcode(cleanUrl)

      // Method 1: Instagram GraphQL API (public, no auth needed)
      if (shortcode) {
        try {
          const graphqlUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`
          const res = await fetch(graphqlUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
              Accept: '*/*',
              'X-IG-App-ID': '936619743392459',
            },
            signal: AbortSignal.timeout(10000),
          })
          if (res.ok) {
            const json = await res.json()
            const media = json?.graphql?.shortcode_media
              ?? json?.items?.[0]
            const videoUrl = media?.video_url
              ?? media?.video_versions?.[0]?.url
            if (videoUrl) {
              const streamResult = await streamVideo(videoUrl, 'instagram')
              if (streamResult) return streamResult
            }
          }
        } catch { /* try next method */ }

        // Method 2: Instagram media endpoint (mobile API)
        try {
          const mediaRes = await fetch(`https://i.instagram.com/api/v1/media/${await shortcodeToMediaId(shortcode)}/info/`, {
            headers: {
              'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100)',
              'X-IG-App-ID': '936619743392459',
            },
            signal: AbortSignal.timeout(10000),
          })
          if (mediaRes.ok) {
            const json = await mediaRes.json()
            const item = json?.items?.[0]
            const videoUrl = item?.video_versions?.[0]?.url
            if (videoUrl) {
              const streamResult = await streamVideo(videoUrl, 'instagram')
              if (streamResult) return streamResult
            }
          }
        } catch { /* try next method */ }
      }

      // Method 3: oEmbed + og:video (simplest, works for some public posts)
      try {
        const oembedRes = await fetch(`https://i.instagram.com/api/v1/oembed/?url=${encodeURIComponent(cleanUrl)}`, {
          signal: AbortSignal.timeout(5000),
        })
        if (oembedRes.ok) {
          // oEmbed won't give video URL directly, but confirms the post exists
          // Try fetching the page with bot UA for og:video
          const pageRes = await fetch(cleanUrl, {
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
              const streamResult = await streamVideo(videoMatch[1], 'instagram')
              if (streamResult) return streamResult
            }
          }
        }
      } catch { /* fall through */ }

      return NextResponse.json({ error: 'Instagram download failed. The video may be private or the download service is temporarily unavailable.' }, { status: 400 })
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
  let clean = url.split('?')[0]
  if (!clean.endsWith('/')) clean += '/'
  return clean
}

function extractInstagramShortcode(url: string): string | null {
  // Matches /p/SHORTCODE/, /reel/SHORTCODE/, /reels/SHORTCODE/, /tv/SHORTCODE/
  const match = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
  return match?.[2] ?? null
}

async function shortcodeToMediaId(shortcode: string): Promise<string> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let mediaId = BigInt(0)
  for (const char of shortcode) {
    mediaId = mediaId * BigInt(64) + BigInt(alphabet.indexOf(char))
  }
  return mediaId.toString()
}
