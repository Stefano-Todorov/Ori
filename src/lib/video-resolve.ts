// Resolve a TikTok or Instagram post URL to a direct CDN video URL.
// Used by /api/download (server stream) and /api/extension/resolve-video (extension fetch).

export async function resolveVideoUrl(url: string, platform: string): Promise<string | null> {
  if (platform === 'tiktok' || url.includes('tiktok.com')) {
    // Method 1: tikwm.com
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
        if (videoUrl) return videoUrl
      }
    } catch { /* try next */ }

    // Method 2: tikcdn.io (returns binary; we just return the URL — caller streams)
    const id = url.match(/\/video\/(\d+)/)?.[1]
    if (id) return `https://tikcdn.io/ssstik/${id}`
    return null
  }

  if (platform === 'instagram' || url.includes('instagram.com') || url.includes('cdninstagram.com')) {
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) return url
    return await fetchInstagramVideoViaApify(url)
  }

  return null
}

async function fetchInstagramVideoViaApify(postUrl: string): Promise<string | null> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) {
    console.error('APIFY_API_TOKEN not set')
    return null
  }
  try {
    const res = await fetch(
      'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=' + token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directUrls: [postUrl], resultsType: 'posts', resultsLimit: 1 }),
        signal: AbortSignal.timeout(60000),
      },
    )
    if (!res.ok) {
      console.error('Apify error:', res.status)
      return null
    }
    const items = await res.json()
    if (!Array.isArray(items) || items.length === 0) return null
    return items[0].videoUrl ?? items[0].video_url ?? null
  } catch (err) {
    console.error('Apify fetch error:', err)
    return null
  }
}
