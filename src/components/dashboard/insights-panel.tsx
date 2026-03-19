'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, BarChart3, Target, Zap } from 'lucide-react'

interface TagInsight {
  tag: string
  count: number
  avgViews: number
}

interface Insights {
  totalScored: number
  avgScore: string
  tagInsights: TagInsight[]
  scoreDistribution: Record<string, number>
  avgViewsByBucket: Record<string, number>
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/insights')
      .then(res => res.json())
      .then(data => {
        setInsights(data.insights)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Loading insights...</p>
        </CardContent>
      </Card>
    )
  }

  if (!insights || insights.totalScored < 5) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Not enough data yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Score at least 5 videos to unlock performance insights. Add scripts to your videos in My Videos, or generate scripts to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  const topTags = insights.tagInsights.slice(0, 5)
  const weakTags = [...insights.tagInsights].sort((a, b) => a.avgViews - b.avgViews).slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-bold text-foreground">What&apos;s Working</h2>
        <span className="text-xs text-muted-foreground ml-auto">{insights.totalScored} videos scored</span>
      </div>

      {/* Score overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{insights.avgScore}</p>
            <p className="text-[11px] text-muted-foreground">Avg Score /10</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{fmt(insights.avgViewsByBucket.high ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Avg views (8-10)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-500">{fmt(insights.avgViewsByBucket.medium ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Avg views (5-7)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{fmt(insights.avgViewsByBucket.low ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Avg views (1-4)</p>
          </CardContent>
        </Card>
      </div>

      {/* Winning patterns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm font-semibold text-foreground">Top Patterns</p>
            </div>
            <div className="space-y-2">
              {topTags.map((tag, i) => (
                <div key={tag.tag} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                    {tag.tag}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{fmt(tag.avgViews)} avg views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-500" />
              <p className="text-sm font-semibold text-foreground">Areas to Improve</p>
            </div>
            <div className="space-y-2">
              {weakTags.map((tag) => (
                <div key={tag.tag} className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                    {tag.tag}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{fmt(tag.avgViews)} avg views</span>
                </div>
              ))}
              {weakTags.length === 0 && (
                <p className="text-xs text-muted-foreground">Not enough data to identify weak patterns yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
