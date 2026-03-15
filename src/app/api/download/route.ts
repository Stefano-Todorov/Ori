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

    // Instagram: client sends the direct CDN video URL (extracted client-side with user's cookies)
    // Also handles any direct video CDN URL (e.g. scontent-*.cdninstagram.com)
    if (platform === 'instagram' || url.includes('instagram.com') || url.includes('cdninstagram.com')) {
      const streamResult = await streamVideo(url, 'instagram')
      if (streamResult) return streamResult
      return NextResponse.json({ error: 'Instagram download failed. Could not fetch the video.' }, { status: 400 })
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

