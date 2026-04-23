import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
        <Icon size={22} className="text-purple-400" />
      </div>
      <div className="space-y-1.5">
        <p className="font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 transition-all duration-200 shadow-lg shadow-purple-500/20"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
