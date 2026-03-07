import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function MetricsCards({ totalPosts, totalViews, totalLikes, avgEngagement }: Props) {
  const cards = [
    {
      title: 'Total Posts',
      value: totalPosts.toString(),
      icon: Video,
      description: 'Across all platforms',
    },
    {
      title: 'Total Views',
      value: formatNumber(totalViews),
      icon: Eye,
      description: 'All-time views',
    },
    {
      title: 'Total Likes',
      value: formatNumber(totalLikes),
      icon: Heart,
      description: 'All-time likes',
    },
    {
      title: 'Avg Engagement',
      value: `${avgEngagement.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Likes / Views ratio',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
