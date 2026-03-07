import { getValidToken } from '@/lib/social/token-manager'
import { createServiceClient } from '@/lib/supabase/service'

export async function publishToYouTube(post: {
  id: string
  user_id: string
  caption: string
  hashtags: string[]
  video_storage_path: string
  scheduled_at: string
}) {
  const accessToken = await getValidToken(post.user_id, 'youtube')

  // Get signed URL from Supabase Storage
  const supabase = createServiceClient()
  const { data: signedUrlData } = await supabase.storage
    .from('scheduled-videos')
    .createSignedUrl(post.video_storage_path, 300)

  if (!signedUrlData?.signedUrl) {
    throw new Error('Could not get signed URL for video')
  }

  const title = post.caption.slice(0, 100)
  const description = [post.caption, ...post.hashtags.map(h => `#${h}`)].join('\n\n')

  // Initiate resumable upload
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags: post.hashtags,
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'private',
          publishAt: post.scheduled_at,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  )

  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(`YouTube upload init failed: ${text}`)
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) throw new Error('No upload URL from YouTube')

  // Fetch video from Supabase and stream to YouTube
  const videoRes = await fetch(signedUrlData.signedUrl)
  if (!videoRes.ok) throw new Error('Could not fetch video from storage')

  const videoBuffer = await videoRes.arrayBuffer()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/*',
      'Content-Length': String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(`YouTube upload failed: ${text}`)
  }

  const videoData = await uploadRes.json()
  return videoData.id as string
}
