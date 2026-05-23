'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, ExternalLink, Loader2 } from 'lucide-react'
import { CoachChat } from './coach-chat'
import { useCoach } from './coach-context'
import type { CoachMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

// Renders only the slide-up chat drawer. The trigger button lives in the
// sidebar / mobile header — see useCoach() consumers.
export function CoachDrawer() {
  const pathname = usePathname()
  const { open, closeCoach } = useCoach()
  const [history, setHistory] = useState<CoachMessage[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Hide on the full coach page and during onboarding
  const hidden = pathname === '/dashboard/coach' || pathname.startsWith('/onboarding')

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (open && typeof window !== 'undefined' && window.innerWidth < 640) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCoach() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeCoach])

  // Load history the first time the drawer opens
  useEffect(() => {
    if (!open || history !== null) return
    let cancelled = false
    setLoading(true)
    fetch('/api/coach/history')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setHistory(data?.history ?? []) })
      .catch(() => { if (!cancelled) setHistory([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, history])

  if (hidden || !open) return null

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[400px] sm:h-[640px] sm:max-h-[calc(100vh-3rem)]">
      {/* Mobile backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] sm:hidden"
        onClick={closeCoach}
      />
      <div
        className={cn(
          'absolute inset-0 sm:relative sm:inset-auto sm:w-full sm:h-full',
          'bg-background border border-border sm:rounded-2xl shadow-2xl shadow-black/20',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-bottom-4 fade-in duration-200'
        )}
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gradient-to-r from-purple-600/[0.06] to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              O
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground leading-tight">AI Coach</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Always here to help</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/coach"
              onClick={closeCoach}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open full coach"
              title="Open full coach"
            >
              <ExternalLink size={15} />
            </Link>
            <button
              onClick={closeCoach}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {loading || history === null ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CoachChat initialHistory={history} />
        )}
      </div>
    </div>
  )
}
