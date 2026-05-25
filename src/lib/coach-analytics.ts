// Pre-compute coaching patterns from raw posts so the coach doesn't have to
// eyeball 50 rows and infer trends on every message. The output is a tight
// "USER PATTERNS" block that gets injected into the system prompt.

export interface PostForAnalytics {
  views: number
  likes: number
  shares: number
  saves: number
  platform: string
  posted_at: string | null
  hook_text: string | null
  hashtags?: string[] | null
  duration_seconds?: number | null
}

// ─── Hook formula classification ─────────────────────────────────
// Rule-based — fast, deterministic, no AI call. Misclassifies edge cases
// but is consistent enough to surface "POV crushes for you" patterns.
function classifyHook(hook: string | null): string | null {
  if (!hook) return null
  const h = hook.trim()
  if (h.length < 3) return null
  const lower = h.toLowerCase()

  if (/^(pov|me when|when you)\b/.test(lower)) return 'POV'
  if (/^\d+\s+(things|reasons|ways|tips|signs|ideas|mistakes|secrets|truths|hacks|rules|lessons)/i.test(h)) return 'List/Number'
  if (h.endsWith('?')) return 'Question'
  if (/^(don'?t|never|stop|avoid|the worst|please don'?t)\b/i.test(lower)) return 'Negative/Warning'
  if (/^(story time|storytime|let me tell you|let me share|imagine|picture this|what if)/i.test(lower)) return 'Storytelling'
  if (/^(here'?s|the secret|nobody tells you|truth is|fact|the real reason)/i.test(lower)) return 'Insider/Secret'
  if (/\d{2,}%|\$\d|^\d{3,}/.test(h)) return 'Statistic'
  if (/^(unpopular opinion|hot take|controversial|i hate|i love)/i.test(lower)) return 'Controversial'
  return 'Direct/Bold'
}

interface HookStat {
  formula: string
  avgViews: number
  count: number
}

function analyzeHooks(posts: PostForAnalytics[]): HookStat[] {
  const groups: Record<string, number[]> = {}
  for (const p of posts) {
    const formula = classifyHook(p.hook_text)
    if (!formula) continue
    if (!groups[formula]) groups[formula] = []
    groups[formula].push(p.views)
  }
  return Object.entries(groups)
    .filter(([, vs]) => vs.length >= 3)
    .map(([formula, vs]) => ({
      formula,
      avgViews: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
      count: vs.length,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
}

// ─── Posting time patterns ──────────────────────────────────────
function dayInTz(date: Date, tz?: string | null): number {
  if (!tz) return date.getUTCDay()
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    return map[formatter.format(date)] ?? date.getUTCDay()
  } catch {
    return date.getUTCDay()
  }
}

function hourInTz(date: Date, tz?: string | null): number {
  if (!tz) return date.getUTCHours()
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false })
    return parseInt(formatter.format(date), 10)
  } catch {
    return date.getUTCHours()
  }
}

interface DayStat {
  best: string
  bestAvg: number
  worst: string
  worstAvg: number
  significant: boolean
}

function analyzeDayOfWeek(posts: PostForAnalytics[], tz?: string | null): DayStat | null {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const groups: Record<number, number[]> = {}
  for (const p of posts) {
    if (!p.posted_at) continue
    const dayIdx = dayInTz(new Date(p.posted_at), tz)
    if (!groups[dayIdx]) groups[dayIdx] = []
    groups[dayIdx].push(p.views)
  }
  const stats = Object.entries(groups)
    .filter(([, vs]) => vs.length >= 2)
    .map(([d, vs]) => ({
      day: dayNames[Number(d)],
      avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
    }))
  if (stats.length < 2) return null
  stats.sort((a, b) => b.avg - a.avg)
  const best = stats[0]
  const worst = stats[stats.length - 1]
  return {
    best: best.day,
    bestAvg: best.avg,
    worst: worst.day,
    worstAvg: worst.avg,
    significant: best.avg > worst.avg * 1.5,
  }
}

interface HourStat {
  best: string
  bestAvg: number
  worst: string
  worstAvg: number
  significant: boolean
}

function analyzeHourBand(posts: PostForAnalytics[], tz?: string | null): HourStat | null {
  const labels: Record<string, string> = {
    morning: 'morning (6am-12pm)',
    afternoon: 'afternoon (12-5pm)',
    evening: 'evening (5-9pm)',
    late: 'late night (9pm-6am)',
  }
  const groups: Record<string, number[]> = { morning: [], afternoon: [], evening: [], late: [] }
  for (const p of posts) {
    if (!p.posted_at) continue
    const hour = hourInTz(new Date(p.posted_at), tz)
    let bucket: keyof typeof groups
    if (hour >= 6 && hour < 12) bucket = 'morning'
    else if (hour >= 12 && hour < 17) bucket = 'afternoon'
    else if (hour >= 17 && hour < 21) bucket = 'evening'
    else bucket = 'late'
    groups[bucket].push(p.views)
  }
  const stats = Object.entries(groups)
    .filter(([, vs]) => vs.length >= 2)
    .map(([band, vs]) => ({
      band: labels[band],
      avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
    }))
  if (stats.length < 2) return null
  stats.sort((a, b) => b.avg - a.avg)
  const best = stats[0]
  const worst = stats[stats.length - 1]
  return {
    best: best.band,
    bestAvg: best.avg,
    worst: worst.band,
    worstAvg: worst.avg,
    significant: best.avg > worst.avg * 1.5,
  }
}

// ─── Hashtag performance ────────────────────────────────────────
interface HashtagStat {
  tag: string
  avgViews: number
  count: number
}

function analyzeHashtags(posts: PostForAnalytics[]): HashtagStat[] {
  const tagPosts: Record<string, number[]> = {}
  for (const p of posts) {
    if (!p.hashtags || p.hashtags.length === 0) continue
    for (const raw of p.hashtags) {
      const clean = raw.trim().toLowerCase().replace(/^#/, '')
      if (!clean) continue
      if (!tagPosts[clean]) tagPosts[clean] = []
      tagPosts[clean].push(p.views)
    }
  }
  return Object.entries(tagPosts)
    .filter(([, vs]) => vs.length >= 3)
    .map(([tag, vs]) => ({
      tag: '#' + tag,
      avgViews: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
      count: vs.length,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
}

// ─── Engagement DNA ─────────────────────────────────────────────
// Compares share/like and save/like ratios between top-third performers
// and bottom-third. If hits skew toward shares = your content spreads;
// toward saves = it's reference-worthy.
function analyzeEngagementDna(posts: PostForAnalytics[]): string | null {
  if (posts.length < 6) return null
  const sorted = [...posts].sort((a, b) => b.views - a.views)
  const third = Math.max(2, Math.floor(sorted.length / 3))
  const top = sorted.slice(0, third)
  const bottom = sorted.slice(-third)
  const avgRatio = (group: PostForAnalytics[], field: 'shares' | 'saves') => {
    const ratios = group
      .filter(p => p.likes > 0)
      .map(p => p[field] / p.likes)
    if (ratios.length === 0) return 0
    return ratios.reduce((a, b) => a + b, 0) / ratios.length
  }
  const topShare = avgRatio(top, 'shares')
  const bottomShare = avgRatio(bottom, 'shares')
  const topSave = avgRatio(top, 'saves')
  const bottomSave = avgRatio(bottom, 'saves')

  if (topShare > bottomShare * 2 && topShare > 0.03) {
    return `Hits get SHARED — ${(topShare * 100).toFixed(1)}% share-to-like on your top third vs ${(bottomShare * 100).toFixed(1)}% on flops. Lean into shareable content (relatable POVs, hot takes, "send this to someone who...").`
  }
  if (topSave > bottomSave * 2 && topSave > 0.03) {
    return `Hits get SAVED — ${(topSave * 100).toFixed(1)}% save-to-like on your top third vs ${(bottomSave * 100).toFixed(1)}% on flops. Reference content works for you (tutorials, lists, frameworks).`
  }
  if (topShare > 0.05) {
    return `Your top posts have strong share velocity (${(topShare * 100).toFixed(1)}% share-to-like).`
  }
  if (topSave > 0.05) {
    return `Your top posts get saved heavily (${(topSave * 100).toFixed(1)}% save-to-like) — reference-worthy material is your strength.`
  }
  return null
}

// ─── Video length sweet spot ────────────────────────────────────
function analyzeLength(posts: PostForAnalytics[]): string | null {
  const withDuration = posts.filter(p => p.duration_seconds != null && p.duration_seconds > 0)
  if (withDuration.length < 5) return null
  const buckets: Record<string, number[]> = {
    '<15s': [],
    '15-30s': [],
    '30-45s': [],
    '45-60s': [],
    '60s+': [],
  }
  for (const p of withDuration) {
    const d = p.duration_seconds!
    let bucket: keyof typeof buckets
    if (d < 15) bucket = '<15s'
    else if (d < 30) bucket = '15-30s'
    else if (d < 45) bucket = '30-45s'
    else if (d < 60) bucket = '45-60s'
    else bucket = '60s+'
    buckets[bucket].push(p.views)
  }
  const stats = Object.entries(buckets)
    .filter(([, vs]) => vs.length >= 2)
    .map(([bucket, vs]) => ({
      bucket,
      avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
      count: vs.length,
    }))
  if (stats.length < 2) return null
  stats.sort((a, b) => b.avg - a.avg)
  const best = stats[0]
  const worst = stats[stats.length - 1]
  if (best.avg < worst.avg * 1.5) return null
  return `${best.bucket} videos avg ${best.avg.toLocaleString()} views (${best.count} posts) vs ${worst.bucket} at ${worst.avg.toLocaleString()}. Keep videos in the ${best.bucket} band.`
}

// ─── Top entry point ────────────────────────────────────────────
export function buildAnalyticsBlock(
  posts: PostForAnalytics[],
  timezone?: string | null,
): string {
  if (posts.length < 5) return ''

  const sections: string[] = []

  const hooks = analyzeHooks(posts)
  if (hooks.length > 0) {
    const lines = hooks.slice(0, 3).map((h, i) =>
      `${i + 1}. ${h.formula} — avg ${h.avgViews.toLocaleString()} views (${h.count} posts)`
    )
    sections.push(`Top hook formulas by avg views:\n${lines.join('\n')}`)
  }

  if (posts.length >= 10) {
    const day = analyzeDayOfWeek(posts, timezone)
    if (day && day.significant) {
      sections.push(`Best posting day: ${day.best} (avg ${day.bestAvg.toLocaleString()} views) — worst is ${day.worst} at ${day.worstAvg.toLocaleString()}.`)
    }

    const hour = analyzeHourBand(posts, timezone)
    if (hour && hour.significant) {
      sections.push(`Best time of day: ${hour.best} (avg ${hour.bestAvg.toLocaleString()} views) — worst is ${hour.worst} at ${hour.worstAvg.toLocaleString()}.`)
    }
  }

  const hashtags = analyzeHashtags(posts)
  if (hashtags.length > 0) {
    const lines = hashtags.slice(0, 5).map(t => `- ${t.tag}: ${t.avgViews.toLocaleString()} avg views (${t.count} uses)`)
    sections.push(`Top hashtags by avg views (≥3 uses):\n${lines.join('\n')}`)
  }

  const dna = analyzeEngagementDna(posts)
  if (dna) sections.push(`Engagement DNA: ${dna}`)

  const length = analyzeLength(posts)
  if (length) sections.push(`Length sweet spot: ${length}`)

  if (sections.length === 0) return ''

  return `\n\nUSER PATTERNS (pre-computed from ${posts.length} posts — these are the strongest signals; use them as the basis for advice):\n\n${sections.join('\n\n')}`
}
