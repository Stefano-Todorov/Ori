import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { anthropic, MODEL } from '@/lib/claude'
import { buildMarketingPrompt, fetchRecentCommits } from '@/lib/marketing-prompts'
import { sendDraft } from '@/lib/telegram'

export const maxDuration = 60

// Daily cron: generate marketing drafts via Claude → send to Telegram for approval
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // 1. Fetch recent posted/draft content to avoid duplicates
  const { data: recentPosts } = await supabase
    .from('marketing_posts')
    .select('platform, content, content_type, posted_at')
    .in('status', ['posted', 'approved', 'draft'])
    .order('created_at', { ascending: false })
    .limit(20)

  // 2. Fetch recent git commits for "just shipped" content
  const commits = await fetchRecentCommits('Stefano-Todorov', 'Ori', 7)

  // 3. Generate drafts via Claude
  const prompt = buildMarketingPrompt(recentPosts ?? [], commits)

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON (Claude may wrap in ```json ... ```)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Failed to parse Claude marketing response:', text.slice(0, 500))
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }

  let posts: Array<{
    platform: string
    content_type: string
    content: string
    thread_parts?: string[] | null
    subreddit?: string
    reddit_title?: string
  }>

  try {
    const parsed = JSON.parse(jsonMatch[0])
    posts = parsed.posts
  } catch (e) {
    console.error('Invalid JSON from Claude:', e)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 500 })
  }

  // 4. Insert drafts and send to Telegram
  const results = []
  for (const post of posts) {
    const { data: inserted, error } = await supabase
      .from('marketing_posts')
      .insert({
        platform: post.platform,
        content_type: post.content_type,
        content: post.content,
        thread_parts: post.thread_parts || null,
        subreddit: post.subreddit || null,
        reddit_title: post.reddit_title || null,
        status: 'draft',
      })
      .select('id, platform, content_type, content, subreddit, reddit_title')
      .single()

    if (error || !inserted) {
      console.error('Failed to insert marketing post:', error)
      results.push({ error: error?.message })
      continue
    }

    try {
      const messageId = await sendDraft(inserted)

      await supabase
        .from('marketing_posts')
        .update({ telegram_message_id: messageId })
        .eq('id', inserted.id)

      results.push({ id: inserted.id, platform: post.platform, sent: true })
    } catch (tgError) {
      console.error('Failed to send Telegram draft:', tgError)
      results.push({ id: inserted.id, platform: post.platform, sent: false, error: 'Telegram failed' })
    }
  }

  return NextResponse.json({ generated: results.length, results })
}
