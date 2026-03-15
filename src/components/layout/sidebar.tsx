'use client'

import { useState, useEffect, useRef } from 'react'
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
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UsageBar } from '@/components/layout/usage-bar'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/coach', label: 'AI Coach', icon: MessageSquare },
  { href: '/dashboard/scripts', label: 'Scripts', icon: FileText },
  { href: '/dashboard/competitors', label: 'Competitors', icon: Users },
  { href: '/dashboard/inspo', label: 'Inspo', icon: Bookmark },
  { href: '/dashboard/ideas', label: 'Ideas', icon: Lightbulb },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarClock },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const STORAGE_KEY = 'orianna-nav-order'

function getOrderedItems(): NavItem[] {
  if (typeof window === 'undefined') return DEFAULT_NAV_ITEMS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_NAV_ITEMS
    const order: string[] = JSON.parse(saved)
    const itemMap = new Map(DEFAULT_NAV_ITEMS.map(item => [item.href, item]))
    const ordered: NavItem[] = []
    for (const href of order) {
      const item = itemMap.get(href)
      if (item) {
        ordered.push(item)
        itemMap.delete(href)
      }
    }
    // Append any new items not in saved order
    for (const item of itemMap.values()) {
      ordered.push(item)
    }
    return ordered
  } catch {
    return DEFAULT_NAV_ITEMS
  }
}

function saveOrder(items: NavItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(i => i.href)))
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [items, setItems] = useState(DEFAULT_NAV_ITEMS)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)

  useEffect(() => {
    setItems(getOrderedItems())
  }, [])

  function handleDragStart(e: React.DragEvent, idx: number) {
    dragRef.current = idx
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    // Needed for Firefox
    e.dataTransfer.setData('text/plain', String(idx))
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overIdx !== idx) setOverIdx(idx)
  }

  function handleDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault()
    const fromIdx = dragRef.current
    if (fromIdx === null || fromIdx === dropIdx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(dropIdx, 0, moved)
    setItems(next)
    saveOrder(next)
    setDragIdx(null)
    setOverIdx(null)
  }

  function handleDragEnd() {
    setDragIdx(null)
    setOverIdx(null)
    dragRef.current = null
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <img src="/brand/logo-mark.svg" alt="" className="w-9 h-9 rounded-lg" />
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent leading-tight">Orianna</h1>
          <p className="text-[10px] text-muted-foreground">AI Content Coach</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((item, idx) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const isDragging = dragIdx === idx
          const isOver = overIdx === idx && dragIdx !== idx

          return (
            <div
              key={item.href}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group relative transition-all duration-150',
                isDragging && 'opacity-30',
                isOver && 'before:absolute before:inset-x-0 before:-top-0.5 before:h-0.5 before:bg-purple-500 before:rounded-full'
              )}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/20'
                    : 'text-muted-foreground hover:bg-purple-500/8 hover:text-foreground'
                )}
              >
                <GripVertical
                  size={12}
                  className={cn(
                    'shrink-0 cursor-grab active:cursor-grabbing transition-opacity',
                    isActive ? 'text-white/50' : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'
                  )}
                />
                <Icon size={16} />
                {item.label}
              </Link>
            </div>
          )
        })}
      </nav>

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
    </aside>
  )
}
