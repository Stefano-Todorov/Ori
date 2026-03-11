'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  Bookmark,
  Lightbulb,
  Settings,
  LogOut,
  CalendarClock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/coach', label: 'AI Coach', icon: MessageSquare },
  { href: '/dashboard/scripts', label: 'Scripts', icon: FileText },
  { href: '/dashboard/competitors', label: 'Competitors', icon: Users },
  { href: '/dashboard/inspo', label: 'Inspo', icon: Bookmark },
  { href: '/dashboard/ideas', label: 'Ideas', icon: Lightbulb },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarClock },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">Orianna</h1>
        <p className="text-xs text-muted-foreground mt-0.5">AI Content Coach</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'text-muted-foreground hover:bg-purple-500/8 hover:text-foreground'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
