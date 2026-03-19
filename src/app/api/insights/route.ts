import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPerformanceSummary } from '@/lib/eval'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all scored posts with views
  const { data: posts } = await supabase
    .from('posts')
    .select('views, eval_score, eval_tags')
    .eq('user_id', user.id)
    .eq('is_competitor', false)
    .eq('is_trending', false)
    .not('eval_score', 'is', null)
    .order('views', { ascending: false })

  if (!posts || posts.length === 0) {
    return NextResponse.json({ insights: null, message: 'No scored videos yet' })
  }

  const summary = buildPerformanceSummary(posts)

  // Also save the summary to the profile for coach context
  if (summary) {
    await supabase
      .from('profiles')
      .update({ performance_summary: summary })
      .eq('user_id', user.id)
  }

  // Build detailed insights for the dashboard
  const scored = posts.filter(p => p.eval_score != null && p.views > 0)
  const sorted = [...scored].sort((a, b) => b.views - a.views)

  // Tag frequency across all scored posts
  const tagCounts: Record<string, { total: number; totalViews: number }> = {}
  for (const p of scored) {
    for (const tag of p.eval_tags ?? []) {
      if (!tagCounts[tag]) tagCounts[tag] = { total: 0, totalViews: 0 }
      tagCounts[tag].total++
      tagCounts[tag].totalViews += p.views
    }
  }

  const tagInsights = Object.entries(tagCounts)
    .map(([tag, data]) => ({
      tag,
      count: data.total,
      avgViews: Math.round(data.totalViews / data.total),
    }))
    .sort((a, b) => b.avgViews - a.avgViews)

  // Score distribution
  const scoreDistribution: Record<string, number> = {}
  for (const p of scored) {
    const bucket = p.eval_score! >= 8 ? 'high' : p.eval_score! >= 5 ? 'medium' : 'low'
    scoreDistribution[bucket] = (scoreDistribution[bucket] ?? 0) + 1
  }

  // Average views by score bucket
  const bucketViews: Record<string, number[]> = { high: [], medium: [], low: [] }
  for (const p of scored) {
    const bucket = p.eval_score! >= 8 ? 'high' : p.eval_score! >= 5 ? 'medium' : 'low'
    bucketViews[bucket].push(p.views)
  }

  const avgViewsByBucket = Object.fromEntries(
    Object.entries(bucketViews).map(([bucket, views]) => [
      bucket,
      views.length > 0 ? Math.round(views.reduce((a, b) => a + b, 0) / views.length) : 0,
    ])
  )

  return NextResponse.json({
    insights: {
      totalScored: scored.length,
      avgScore: (scored.reduce((s, p) => s + (p.eval_score ?? 0), 0) / scored.length).toFixed(1),
      tagInsights,
      scoreDistribution,
      avgViewsByBucket,
      topPost: sorted[0] ?? null,
    },
    summary,
  })
}
