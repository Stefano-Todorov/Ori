import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveVideoUrl } from '@/lib/video-resolve'

const ALLOWED_DOWNLOAD_DOMAINS = [
  'tiktok.com', 'tiktokcdn.com', 'muscdn.com',
  'instagram.com', 'cdninstagram.com', 'fbcdn.net',
  'tikwm.com', 'tikcdn.io', 'snaptik.app', 'ssstik.io',
]

function isAllowedDownloadUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return ALLOWED_DOWNLOAD_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:download`, RATE_LIMITS.download)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  // Check usage limit
  const usage = await checkUsage(user.id, 'downloads')
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      message: `You've used all ${usage.limit} downloads this month. Upgrade for more.`,
      usage,
    }, { status: 429 })
  }

  const url = req.nextUrl.searchParams.get('url')
  const platform = req.nextUrl.searchParams.get('platform') ?? ''
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  if (!isAllowedDownloadUrl(url)) return NextResponse.json({ error: 'URL domain not allowed' }, { status: 400 })

  try {
    await incrementUsage(user.id, 'downloads')
    const resolvedPlatform = platform || (url.includes('tiktok.com') ? 'tiktok' : url.includes('instagram') ? 'instagram' : '')
    const videoUrl = await resolveVideoUrl(url, resolvedPlatform)
    if (videoUrl) {
      const streamResult = await streamVideo(videoUrl, resolvedPlatform || 'video')
      if (streamResult) return streamResult
    }
    return NextResponse.json({ error: 'Download failed. The video may be private or the download service is temporarily unavailable.' }, { status: 400 })
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

