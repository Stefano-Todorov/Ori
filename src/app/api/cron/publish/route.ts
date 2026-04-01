import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { publishToTikTok } from '@/lib/social/publishers/tiktok'
import { publishToInstagram } from '@/lib/social/publishers/instagram'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find all pending posts scheduled for now or earlier
  const { data: duePosts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[cron/publish] DB error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 })
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const results: { id: string; status: string; error?: string }[] = []

  for (const post of duePosts) {
    // Mark as processing
    await supabase
      .from('scheduled_posts')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', post.id)

    try {
      if (!post.video_storage_path) {
        throw new Error('No video storage path')
      }

      let platformPostId: string

      if (post.platform === 'tiktok') {
        platformPostId = await publishToTikTok({
          id: post.id,
          user_id: post.user_id,
          caption: post.caption,
          hashtags: post.hashtags ?? [],
          video_storage_path: post.video_storage_path,
        })
      } else if (post.platform === 'instagram') {
        platformPostId = await publishToInstagram({
          id: post.id,
          user_id: post.user_id,
          caption: post.caption,
          hashtags: post.hashtags ?? [],
          video_storage_path: post.video_storage_path,
          video_public_url: post.video_public_url,
        })
      } else {
        throw new Error(`Unknown platform: ${post.platform}`)
      }

      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          platform_post_id: platformPostId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'published' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'failed',
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'failed', error: msg })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
