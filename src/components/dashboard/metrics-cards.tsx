import { Eye, Heart, TrendingUp, Video } from 'lucide-react'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

interface Props {
  totalPosts: number
  totalViews: number
  totalLikes: number
  avgEngagement: number
}

const CARDS = [
  { title: 'Total Posts', icon: Video, description: 'Across all platforms', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { title: 'Total Views', icon: Eye, description: 'All-time views', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { title: 'Total Likes', icon: Heart, description: 'All-time likes', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { title: 'Avg Engagement', icon: TrendingUp, description: 'Likes / Views ratio', color: 'text-green-500', bg: 'bg-green-500/10' },
]

export function MetricsCards({ totalPosts, totalViews, totalLikes, avgEngagement }: Props) {
  const values = [
    totalPosts.toString(),
    formatNumber(totalViews),
    formatNumber(totalLikes),
    `${avgEngagement.toFixed(1)}%`,
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.icon
        return (
          <div key={card.title} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
                {card.title}
              </p>
              <span className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center`}>
                <Icon size={16} className={card.color} />
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{values[i]}</p>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </div>
        )
      })}
    </div>
  )
}
