import { getValidToken } from '@/lib/social/token-manager'
import { createServiceClient } from '@/lib/supabase/service'

export async function publishToInstagram(post: {
  id: string
  user_id: string
  caption: string
  hashtags: string[]
  video_storage_path: string
  video_public_url: string | null
}) {
  const accessToken = await getValidToken(post.user_id, 'instagram')

  // Get the IG Business Account ID from social_accounts
  const supabase = createServiceClient()
  const { data: account } = await supabase
    .from('social_accounts')
    .select('platform_user_id')
    .eq('user_id', post.user_id)
    .eq('platform', 'instagram')
    .single()

  if (!account?.platform_user_id) {
    throw new Error('Instagram Business Account ID not found. Please reconnect your Instagram account.')
  }

  const igUserId = account.platform_user_id

  // Use public URL (Instagram requires it) — must be accessible HTTPS URL
  const videoUrl = post.video_public_url
  if (!videoUrl) {
    // Fall back to Supabase public URL
    const { data } = supabase.storage
      .from('scheduled-videos')
      .getPublicUrl(post.video_storage_path)
    if (!data?.publicUrl) throw new Error('No public video URL available for Instagram')
  }

  const finalVideoUrl = videoUrl ?? supabase.storage
    .from('scheduled-videos')
    .getPublicUrl(post.video_storage_path).data.publicUrl

  const captionWithHashtags = [
    post.caption,
    ...post.hashtags.map(h => `#${h}`),
  ].join('\n\n')

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: finalVideoUrl,
        caption: captionWithHashtags.slice(0, 2200),
        access_token: accessToken,
      }),
    }
  )

  if (!containerRes.ok) {
    const text = await containerRes.text()
    throw new Error(`Instagram media container creation failed: ${text}`)
  }

  const { id: creationId } = await containerRes.json()

  // Step 2: Poll until container is ready
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000))

    const statusRes = await fetch(
      `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${accessToken}`
    )
    const statusData = await statusRes.json()

    if (statusData.status_code === 'FINISHED') break
    if (statusData.status_code === 'ERROR') {
      throw new Error(`Instagram media processing failed: ${JSON.stringify(statusData)}`)
    }
  }

  // Step 3: Publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    }
  )

  if (!publishRes.ok) {
    const text = await publishRes.text()
    throw new Error(`Instagram publish failed: ${text}`)
  }

  const { id: postId } = await publishRes.json()
  return postId as string
}
