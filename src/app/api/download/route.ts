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

    // Instagram: use snapinsta.app to extract video download URL
    if (platform === 'instagram' || url.includes('instagram.com')) {
      const cleanUrl = normalizeInstagramUrl(url)

      // Method 1: snapinsta.app API
      try {
        // First, get the page to extract the token
        const pageRes = await fetch('https://snapinsta.app', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000),
        })
        if (pageRes.ok) {
          const pageHtml = await pageRes.text()
          const tokenMatch = pageHtml.match(/name="token" value="([^"]+)"/)
          const token = tokenMatch?.[1] ?? ''

          // Submit the URL to snapinsta
          const formRes = await fetch('https://snapinsta.app/action.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Origin: 'https://snapinsta.app',
              Referer: 'https://snapinsta.app/',
            },
            body: `url=${encodeURIComponent(cleanUrl)}&token=${encodeURIComponent(token)}&lang=en`,
            signal: AbortSignal.timeout(15000),
          })
          if (formRes.ok) {
            const resultHtml = await formRes.text()
            // Extract the download URL from the response HTML
            const dlMatch = resultHtml.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/)
              || resultHtml.match(/href="(https:\/\/[^"]+)"[^>]*>Download Video/)
              || resultHtml.match(/class="download-bottom"[\s\S]*?href="(https:\/\/[^"]+)"/)
              || resultHtml.match(/"(https:\/\/scontent[^"]+)"/)
            if (dlMatch?.[1]) {
              const videoUrl = dlMatch[1].replace(/&amp;/g, '&')
              const streamResult = await streamVideo(videoUrl, 'instagram')
              if (streamResult) return streamResult
            }
          }
        }
      } catch { /* try next method */ }

      // Method 2: saveig.app API (fallback)
      try {
        const res = await fetch('https://saveig.app/api/ajaxSearch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Origin: 'https://saveig.app',
            Referer: 'https://saveig.app/',
          },
          body: `q=${encodeURIComponent(cleanUrl)}&t=media&lang=en`,
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          const json = await res.json()
          const html = json?.data ?? ''
          const dlMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*download/)
            || html.match(/"(https:\/\/scontent[^"]+)"/)
            || html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/)
          if (dlMatch?.[1]) {
            const videoUrl = dlMatch[1].replace(/&amp;/g, '&')
            const streamResult = await streamVideo(videoUrl, 'instagram')
            if (streamResult) return streamResult
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
  // Ensure the URL has the right format for fetching
  let clean = url.split('?')[0]
  if (!clean.endsWith('/')) clean += '/'
  return clean
}
