'use client'

import { Menu, MessageSquare } from 'lucide-react'
import { useMobileSidebar } from './mobile-sidebar-context'
import { useCoach } from '@/components/coach/coach-context'
import { cn } from '@/lib/utils'

export function MobileHeader() {
  const { open } = useMobileSidebar()
  const { unread, openCoach } = useCoach()

  return (
    <header className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-background shrink-0">
      <button
        onClick={open}
        className="p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <div className="flex items-center gap-2.5">
        <img src="/brand/logo-mark.svg" alt="" className="w-7 h-7 rounded-md" />
        <span className="text-lg font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">
          Orianna
        </span>
      </div>
      <button
        type="button"
        onClick={openCoach}
        aria-label="Talk to coach"
        className={cn(
          'relative ml-auto w-9 h-9 rounded-full flex items-center justify-center text-white transition-all',
          'bg-gradient-to-br from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600',
          unread > 0
            ? 'shadow-md shadow-red-500/40 ring-2 ring-red-500/50'
            : 'shadow-sm shadow-purple-600/25'
        )}
      >
        <MessageSquare size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-background">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </header>
  )
}
