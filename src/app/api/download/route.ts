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
    // TikTok: use tikwm API to get watermark-free video
    if (platform === 'tiktok' || url.includes('tiktok.com')) {
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
          const videoRes = await fetch(videoUrl, { signal: AbortSignal.timeout(30000) })
          if (videoRes.ok && videoRes.body) {
            const filename = `video_tiktok_${Date.now()}.mp4`
            return new NextResponse(videoRes.body, {
              headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${filename}"`,
                ...(videoRes.headers.get('content-length')
                  ? { 'Content-Length': videoRes.headers.get('content-length')! }
                  : {}),
              },
            })
          }
        }
      }
    }

    // YouTube: can't easily download, redirect to video page
    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      return NextResponse.json({ error: 'YouTube video downloads are not supported. Open the video directly instead.' }, { status: 400 })
    }

    // Instagram: try fetching the page to find the video URL from og:video
    if (platform === 'instagram' || url.includes('instagram.com')) {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Twitterbot/1.0)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (pageRes.ok) {
        const html = await pageRes.text()
        const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/)
        if (videoMatch?.[1]) {
          const videoRes = await fetch(videoMatch[1], { signal: AbortSignal.timeout(30000) })
          if (videoRes.ok && videoRes.body) {
            const filename = `video_instagram_${Date.now()}.mp4`
            return new NextResponse(videoRes.body, {
              headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${filename}"`,
                ...(videoRes.headers.get('content-length')
                  ? { 'Content-Length': videoRes.headers.get('content-length')! }
                  : {}),
              },
            })
          }
        }
      }
    }

    return NextResponse.json({ error: 'Could not download video. Try opening the post directly.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Download failed. Try again later.' }, { status: 500 })
  }
}
