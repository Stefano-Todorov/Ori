// Instagram video download via Orianna Chrome extension bridge
// The extension injects a content script (webapp-bridge.js) on ori-nine.vercel.app
// that can relay messages to the extension's background script, which has
// host_permissions for instagram.com and can call IG APIs without CORS/IP blocks.

function extractShortcode(url: string): string | null {
  const match = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
  return match?.[2] ?? null
}

/**
 * Ask the Orianna extension to fetch the Instagram video URL.
 * Uses the webapp-bridge.js content script injected by the extension.
 * Returns the direct CDN URL or null if extension is not installed.
 */
async function fetchIgVideoViaExtension(postUrl: string): Promise<string | null> {
  const shortcode = extractShortcode(postUrl)
  if (!shortcode) return null

  // Check if extension bridge is available
  const win = window as unknown as { __oriannaBridge?: boolean }
  if (!win.__oriannaBridge) return null

  const requestId = Math.random().toString(36).slice(2)

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('orianna-video-result', handler)
      resolve(null)
    }, 15000)

    function handler(event: Event) {
      const detail = (event as CustomEvent).detail
      if (detail?.requestId !== requestId) return
      clearTimeout(timeout)
      window.removeEventListener('orianna-video-result', handler)
      resolve(detail.videoUrl ?? null)
    }

    window.addEventListener('orianna-video-result', handler)
    window.dispatchEvent(new CustomEvent('orianna-fetch-video', {
      detail: { shortcode, requestId },
    }))
  })
}

/**
 * Download a video, using the extension bridge for Instagram.
 * Falls back to server-side download for TikTok and direct CDN URLs.
 */
export async function downloadVideo(postUrl: string, platform: string): Promise<Blob> {
  let downloadUrl = postUrl

  // For Instagram, try getting the direct video URL via the extension
  if (platform === 'instagram' || postUrl.includes('instagram.com')) {
    const directUrl = await fetchIgVideoViaExtension(postUrl)
    if (directUrl) {
      downloadUrl = directUrl
    }
  }

  // Proxy through our server (handles CORS, sets download headers)
  const res = await fetch(`/api/download?url=${encodeURIComponent(downloadUrl)}&platform=${platform}`)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Download failed')
  }
  return res.blob()
}
