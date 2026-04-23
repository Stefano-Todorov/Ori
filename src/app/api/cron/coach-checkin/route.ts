import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { anthropic, MODEL } from '@/lib/claude'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find paid users eligible for a proactive check-in:
  // - Onboarding completed
  // - Paid tier (not starter)
  // - Haven't been ignored twice in a row
  // - At least 7 days since last proactive message (or never sent one)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: users, error: queryError } = await supabase
    .from('profiles')
    .select('user_id, niche, sub_niche, goals, platforms, posting_target, creator_context, unanswered_proactive, name')
    .eq('onboarding_completed', true)
    .in('subscription_tier', ['plus', 'pro', 'max'])
    .lt('unanswered_proactive', 2)
    .or(`last_proactive_at.is.null,last_proactive_at.lt.${sevenDaysAgo}`)

  if (queryError) {
    console.error('[cron/coach-checkin] Query error:', queryError.message)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No eligible users' })
  }

  let sent = 0

  for (const user of users) {
    try {
      // Load lightweight context for this user
      const [{ count: postCount }, { count: recentPostCount }, { count: ideaCount }, { count: scriptCount }] = await Promise.all([
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .eq('is_competitor', false)
          .eq('is_trending', false),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .eq('is_competitor', false)
          .eq('is_trending', false)
          .gte('posted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('content_ideas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .in('status', ['new', 'in_progress']),
        supabase
          .from('scripts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .eq('status', 'draft'),
      ])

      // Build a lightweight coaching prompt
      const isFollowUp = user.unanswered_proactive === 1
      const userName = user.name ? user.name.split(' ')[0] : null

      const systemPrompt = `You are Orianna, an AI content coach for short-form video creators. You're sending a proactive weekly check-in message to one of your creators.

CREATOR PROFILE:
- ${userName ? `Name: ${userName}` : 'No name set'}
- Niche: ${user.niche ?? 'general'}${user.sub_niche ? ` (${user.sub_niche})` : ''}
- Goals: ${user.goals ?? 'grow on social media'}
- Platforms: ${(user.platforms ?? []).join(', ') || 'not set'}
- Posting target: ${user.posting_target ?? 3}/week
${user.creator_context ? `- About them: ${user.creator_context.slice(0, 300)}` : ''}

THIS WEEK'S DATA:
- Total posts synced: ${postCount ?? 0}
- Posts this week: ${recentPostCount ?? 0} (target: ${user.posting_target ?? 3})
- Active ideas in pipeline: ${ideaCount ?? 0}
- Draft scripts ready: ${scriptCount ?? 0}`

      let directive: string

      if (isFollowUp) {
        directive = `This is your SECOND check-in — the creator didn't respond to your last message. Be brief and low-pressure. Don't guilt them. Share a quick, specific observation or tip related to their niche that they might find useful even without responding. Something like a quick insight, a trend you noticed, or a simple encouragement. Keep it to 1-2 sentences. If you use their name, use it naturally.`
      } else {
        // First check-in — pick the most relevant angle
        const postsThisWeek = recentPostCount ?? 0
        const target = user.posting_target ?? 3

        if (postsThisWeek >= target) {
          directive = `The creator is HITTING their posting target this week (${postsThisWeek}/${target}). Celebrate briefly but don't be cheesy. Then push them with a specific suggestion — maybe try a different hook formula, experiment with a new format, or study what's working. Be specific to their niche. Keep it to 2-3 sentences.`
        } else if ((postCount ?? 0) > 0 && postsThisWeek < target) {
          directive = `The creator is BEHIND on posting this week (${postsThisWeek}/${target}). Don't guilt them — be their coach. Acknowledge it matter-of-factly, then offer a specific, actionable nudge. Maybe suggest a quick content idea for their niche, or remind them of a draft script they could use. Keep it to 2-3 sentences.`
        } else if ((scriptCount ?? 0) > 0 || (ideaCount ?? 0) > 0) {
          directive = `The creator has content in their pipeline (${scriptCount ?? 0} draft scripts, ${ideaCount ?? 0} active ideas) but may need a push to execute. Pick one specific thing from their pipeline and nudge them toward action. Be encouraging and specific. Keep it to 2-3 sentences.`
        } else {
          directive = `The creator hasn't posted much yet and doesn't have a big pipeline. Give them a specific, easy-to-execute content idea for their niche — something they could film today in under 5 minutes. Make it concrete (not "make a video about X" but "film a 15-second video where you..."). Keep it to 2-3 sentences.`
        }
      }

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: directive }],
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.type === 'text' ? b.text : '')
        .join('')

      if (!text) continue

      // Save proactive message
      await supabase.from('coach_messages').insert({
        user_id: user.user_id,
        role: 'assistant',
        content: text,
        proactive: true,
      })

      // Update profile tracking
      await supabase.from('profiles').update({
        last_proactive_at: new Date().toISOString(),
        unanswered_proactive: (user.unanswered_proactive ?? 0) + 1,
      }).eq('user_id', user.user_id)

      sent++
    } catch (err) {
      console.error(`[cron/coach-checkin] Error for user ${user.user_id}:`, err)
    }
  }

  return NextResponse.json({ sent, eligible: users.length })
}
