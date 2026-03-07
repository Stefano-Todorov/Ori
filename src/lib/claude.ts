import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODEL = 'claude-sonnet-4-6'

export interface PostSummary {
  caption: string | null
  views: number
  likes: number
  shares: number
  saves: number
  engagement_rate: number | null
  platform: string
  posted_at: string | null
  hook_text: string | null
}

export interface CoachContext {
  niche: string
  subNiche?: string
  goals: string
  platforms: string[]
  postingTarget: number
  posts?: PostSummary[]
  competitors?: { handle: string; platform: string; avg_views: number | null }[]
  scripts?: { topic: string; status: string; hook: string; difficulty: string | null }[]
  ideas?: { idea: string; status: string; difficulty: string | null }[]
}

export function buildSystemPrompt(ctx: CoachContext): string {
  const posts = ctx.posts ?? []

  let analyticsSection = ''
  if (posts.length > 0) {
    const totalViews = posts.reduce((s, p) => s + p.views, 0)
    const avgViews = Math.round(totalViews / posts.length)
    const avgEngagement = posts.filter(p => p.engagement_rate != null).length > 0
      ? (posts.reduce((s, p) => s + (p.engagement_rate ?? 0), 0) / posts.length).toFixed(1)
      : 'N/A'

    const top3 = posts.slice(0, 3)
    const bottom3 = [...posts].sort((a, b) => a.views - b.views).slice(0, 3)

    const byPlatform: Record<string, number[]> = {}
    for (const p of posts) {
      if (!byPlatform[p.platform]) byPlatform[p.platform] = []
      byPlatform[p.platform].push(p.views)
    }
    const platformStats = Object.entries(byPlatform)
      .map(([pl, views]) => `${pl}: avg ${Math.round(views.reduce((a, b) => a + b, 0) / views.length).toLocaleString()} views (${views.length} posts)`)
      .join(', ')

    analyticsSection = `

USER ANALYTICS SUMMARY (${posts.length} posts total):
- Average views: ${avgViews.toLocaleString()}
- Average engagement rate: ${avgEngagement}%
- By platform: ${platformStats}

TOP 3 POSTS (by views):
${top3.map((p, i) => `${i + 1}. [${p.platform}] "${p.caption?.slice(0, 80) ?? 'no caption'}" — ${p.views.toLocaleString()} views, ${p.engagement_rate?.toFixed(1) ?? '?'}% engagement${p.hook_text ? `, hook: "${p.hook_text.slice(0, 60)}"` : ''}`).join('\n')}

LOWEST 3 POSTS (for learning):
${bottom3.map((p, i) => `${i + 1}. [${p.platform}] "${p.caption?.slice(0, 80) ?? 'no caption'}" — ${p.views.toLocaleString()} views`).join('\n')}`
  }

  let competitorSection = ''
  if (ctx.competitors && ctx.competitors.length > 0) {
    competitorSection = `

TRACKED COMPETITORS:
${ctx.competitors.map(c => `- @${c.handle} on ${c.platform}${c.avg_views ? ` (avg ${c.avg_views.toLocaleString()} views)` : ''}`).join('\n')}`
  }

  let pipelineSection = ''
  if ((ctx.scripts && ctx.scripts.length > 0) || (ctx.ideas && ctx.ideas.length > 0)) {
    const scripts = ctx.scripts ?? []
    const ideas = ctx.ideas ?? []
    const draftCount = scripts.filter(s => s.status === 'draft').length
    const usedCount = scripts.filter(s => s.status === 'used').length
    const newIdeas = ideas.filter(i => i.status === 'new').length
    const inProgressIdeas = ideas.filter(i => i.status === 'in_progress').length

    pipelineSection = `

CONTENT PIPELINE:
- Scripts written: ${scripts.length} total (${draftCount} draft, ${usedCount} used)${scripts.length > 0 ? `\n- Recent script topics: ${scripts.slice(0, 5).map(s => `"${s.topic}" [${s.status}]`).join(', ')}` : ''}
- Ideas backlog: ${newIdeas} new, ${inProgressIdeas} in-progress${ideas.length > 0 ? `\n- Top ideas: ${ideas.slice(0, 5).map(i => `"${i.idea}"`).join(', ')}` : ''}`
  }

  return `You are Orianna, an elite AI content coach and social media strategist. You specialize in short-form video content for TikTok, Instagram Reels, and YouTube Shorts.

USER PROFILE:
- Niche: ${ctx.niche}${ctx.subNiche ? ` (specifically: ${ctx.subNiche})` : ''}
- Goals: ${ctx.goals}
- Active platforms: ${ctx.platforms.join(', ')}
- Posting target: ${ctx.postingTarget} posts per week
${analyticsSection}${competitorSection}${pipelineSection}

YOUR ROLE:
1. Analyze their actual data and give specific, insight-driven advice
2. Identify patterns between their top and bottom posts — what's working and why
3. Generate hooks, scripts, and content ideas tailored to their niche and proven style
4. Keep them accountable to their posting target
5. Help them learn from competitors

Always reference their real numbers when relevant. Be direct, specific, and encouraging. No generic advice.`
}
