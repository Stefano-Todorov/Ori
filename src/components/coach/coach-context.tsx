'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface CoachContextValue {
  open: boolean
  unread: number
  openCoach: () => void
  closeCoach: () => void
}

const CoachContext = createContext<CoachContextValue | null>(null)

interface ProviderProps {
  initialUnread?: number
  children: ReactNode
}

export function CoachProvider({ initialUnread = 0, children }: ProviderProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialUnread)

  // Refresh unread count on mount and on every dashboard navigation.
  useEffect(() => {
    let cancelled = false
    fetch('/api/coach/unread', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !cancelled) setUnread(d.count ?? 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  const openCoach = useCallback(() => {
    setOpen(true)
    setUnread(0) // opening clears the badge (history route also marks read server-side)
  }, [])

  const closeCoach = useCallback(() => setOpen(false), [])

  return (
    <CoachContext.Provider value={{ open, unread, openCoach, closeCoach }}>
      {children}
    </CoachContext.Provider>
  )
}

export function useCoach() {
  const ctx = useContext(CoachContext)
  if (!ctx) throw new Error('useCoach must be used within CoachProvider')
  return ctx
}
