'use client'

import { Menu } from 'lucide-react'
import { useMobileSidebar } from './mobile-sidebar-context'

export function MobileHeader() {
  const { open } = useMobileSidebar()

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
    </header>
  )
}
