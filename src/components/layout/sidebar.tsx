'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  Bookmark,
  Lightbulb,
  Settings,
  LogOut,
  CalendarClock,
  Play,
  Sparkles,
  X,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UsageBar } from '@/components/layout/usage-bar'
import { useMobileSidebar } from './mobile-sidebar-context'
import { useCoach } from '@/components/coach/coach-context'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ href: '/dashboard', label: 'Home', icon: Home }],
  },
  {
    label: 'Create',
    items: [
      { href: '/dashboard/ideas', label: 'Ideas', icon: Lightbulb },
      { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarClock },
    ],
  },
  {
    label: 'Research',
    items: [
      { href: '/dashboard/inspo', label: 'Inspiration', icon: Bookmark },
      { href: '/dashboard/competitors', label: 'Competitors', icon: Users },
      { href: '/dashboard/my-videos', label: 'My Videos', icon: Play },
    ],
  },
]

const SETTINGS_ITEM: NavItem = { href: '/dashboard/settings', label: 'Settings', icon: Settings }

function SidebarContent({ onNavClick, onboardingPending = false }: { onNavClick?: () => void; onboardingPending?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { unread, openCoach } = useCoach()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleCoachClick() {
    openCoach()
    onNavClick?.()
  }

  return (
    <>
      <div className="p-6 border-b border-border flex items-center gap-3">
        <img src="/brand/logo-mark.svg" alt="" className="w-8 h-8 rounded-lg" />
        <h1 className="text-lg font-semibold text-foreground leading-tight tracking-tight">Orianna</h1>
      </div>

      {/* Talk to coach — primary action, always visible above the nav */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={handleCoachClick}
          className={cn(
            'relative w-full flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-semibold transition-all',
            'bg-purple-500/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-200',
            'hover:bg-purple-500/20 dark:hover:bg-purple-500/25 hover:text-purple-800 dark:hover:text-purple-100',
            unread > 0
              ? 'border-2 border-red-500'
              : 'border border-purple-500/40 hover:border-purple-500/60'
          )}
        >
          <MessageSquare size={15} />
          <span className="flex-1 text-left">Talk to coach</span>
          {unread > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-extrabold flex items-center justify-center border-2 border-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {onboardingPending && (
          <Link
            href="/onboarding"
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-3',
              pathname === '/onboarding'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-600/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600/20'
            )}
          >
            <Sparkles size={16} />
            Finish onboarding
          </Link>
        )}

        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && 'mt-5')}>
            {section.label && (
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-2">
        <Link
          href={SETTINGS_ITEM.href}
          onClick={onNavClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            pathname === SETTINGS_ITEM.href || pathname.startsWith(SETTINGS_ITEM.href)
              ? 'bg-purple-600 text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings size={16} />
          {SETTINGS_ITEM.label}
        </Link>
      </div>

      <UsageBar />

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
    </>
  )
}

export function Sidebar({ onboardingPending = false }: { onboardingPending?: boolean }) {
  const pathname = usePathname()
  const { isOpen, close } = useMobileSidebar()

  useEffect(() => {
    close()
  }, [pathname, close])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-sidebar flex-col h-full">
        <SidebarContent onboardingPending={onboardingPending} />
      </aside>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={close}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-sidebar flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={close}
              className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors z-10"
              aria-label="Close menu"
            >
              <X size={18} className="text-muted-foreground" />
            </button>
            <SidebarContent onNavClick={close} onboardingPending={onboardingPending} />
          </aside>
        </div>
      )}
    </>
  )
}
