'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Post {
  views: number
  likes: number
  platform: string
  posted_at: string | null
  engagement_rate: number | null
}

interface Props {
  posts: Post[]
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function buildViewsOverTime(posts: Post[]) {
  const byMonth: Record<string, { views: number; count: number }> = {}

  for (const post of posts) {
    if (!post.posted_at) continue
    const date = new Date(post.posted_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { views: 0, count: 0 }
    byMonth[key].views += post.views
    byMonth[key].count += 1
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, { views }]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      views,
    }))
}

function buildPlatformBreakdown(posts: Post[]) {
  const byPlatform: Record<string, { views: number; engagement: number; count: number }> = {}

  for (const post of posts) {
    if (!byPlatform[post.platform]) byPlatform[post.platform] = { views: 0, engagement: 0, count: 0 }
    byPlatform[post.platform].views += post.views
    byPlatform[post.platform].engagement += post.engagement_rate ?? 0
    byPlatform[post.platform].count += 1
  }

  return Object.entries(byPlatform).map(([platform, { views, engagement, count }]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    avgViews: Math.round(views / count),
    avgEngagement: parseFloat((engagement / count).toFixed(1)),
  }))
}

const PLATFORM_COLORS: Record<string, string> = {
  Tiktok: '#000000',
  Instagram: '#E1306C',
  Youtube: '#FF0000',
}

export function AnalyticsCharts({ posts }: Props) {
  const viewsData = buildViewsOverTime(posts)
  const platformData = buildPlatformBreakdown(posts)

  if (posts.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
        <p className="text-sm font-bold text-foreground">Views Over Time</p>
        {viewsData.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Not enough dated posts to show a trend. Make sure your CSV includes post dates.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} width={45} className="fill-muted-foreground" />
              <Tooltip
                formatter={(v: number | undefined) => v != null ? formatNumber(v) : ''}
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', fontSize: '13px' }}
              />
              <Line type="monotone" dataKey="views" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
        <p className="text-sm font-bold text-foreground">Avg Views by Platform</p>
        {platformData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No platform data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="platform" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} width={45} className="fill-muted-foreground" />
              <Tooltip
                formatter={(v: number | undefined) => v != null ? formatNumber(v) : ''}
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', fontSize: '13px' }}
              />
              <Bar dataKey="avgViews" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
