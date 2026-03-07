import { getValidToken } from '@/lib/social/token-manager'
import { createServiceClient } from '@/lib/supabase/service'

export async function publishToTikTok(post: {
  id: string
  user_id: string
  caption: string
  hashtags: string[]
  video_storage_path: string
}) {
  const accessToken = await getValidToken(post.user_id, 'tiktok')

  // Get signed URL from Supabase Storage
  const supabase = createServiceClient()
  const { data: signedUrlData } = await supabase.storage
    .from('scheduled-videos')
    .createSignedUrl(post.video_storage_path, 300)

  if (!signedUrlData?.signedUrl) {
    throw new Error('Could not get signed URL for video')
  }

  const captionWithHashtags = [
    post.caption,
    ...post.hashtags.map(h => `#${h}`),
  ].join(' ')

  // Init upload
  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: captionWithHashtags.slice(0, 2200),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: signedUrlData.signedUrl,
      },
    }),
  })

  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(`TikTok upload init failed: ${text}`)
  }

  const { data: initData } = await initRes.json()
  const publishId: string = initData.publish_id

  // Poll for publish status
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    })

    if (!statusRes.ok) continue

    const { data: statusData } = await statusRes.json()
    if (statusData?.status === 'PUBLISH_COMPLETE') {
      return statusData.publicaly_available_post_id?.[0] ?? publishId
    }
    if (statusData?.status === 'FAILED') {
      throw new Error(`TikTok publish failed: ${statusData.fail_reason}`)
    }
  }

  throw new Error('TikTok publish timed out')
}
