'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, X, ExternalLink, Loader2 } from 'lucide-react'
import { CoachChat } from './coach-chat'
import type { CoachMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  unreadCount?: number
}

export function FloatingCoach({ unreadCount = 0 }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleOpen() {
    setOpen(true)
    if (history !== null) return
    setLoading(true)
    try {
      const res = await fetch('/api/coach/history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history ?? [])
      } else {
        setHistory([])
      }
    } catch {
      setHistory([])
    }
    setLoading(false)
  }

  if (hidden) return null

  return (
    <>
      {/* Bubble */}
      {!open && (
        <button
          onClick={handleOpen}
          aria-label="Open AI Coach"
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
        >
          <MessageSquare size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-background animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="absolute right-full mr-3 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden sm:block">
            Ask Orianna
          </span>
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[400px] sm:h-[640px] sm:max-h-[calc(100vh-3rem)]">
          {/* Mobile backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] sm:hidden"
            onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Open full coach"
                  title="Open full coach"
                >
                  <ExternalLink size={15} />
                </Link>
                <button
                  onClick={() => setOpen(false)}
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
      )}
    </>
  )
}
