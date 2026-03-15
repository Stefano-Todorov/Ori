/**
 * Download a video via the server-side download API.
 * Supports Instagram (via Apify), TikTok, and direct CDN URLs.
 */
export async function downloadVideo(postUrl: string, platform: string): Promise<Blob> {
  const res = await fetch(`/api/download?url=${encodeURIComponent(postUrl)}&platform=${platform}`)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Download failed')
  }
  return res.blob()
}
