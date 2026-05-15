'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

interface Props {
  text: string
  /** Which side of the trigger to render on. Defaults to `bottom`. */
  placement?: 'top' | 'bottom'
  /** Which edge of the trigger to align to. Defaults to `start` (left). */
  align?: 'start' | 'end'
}

const TOOLTIP_WIDTH = 256
const GAP = 8
const VIEWPORT_PADDING = 8

export function InfoTooltip({ text, placement = 'bottom', align = 'start' }: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; side: 'top' | 'bottom' } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Position the tooltip — auto-flip if requested side has no room.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return
    const tr = triggerRef.current.getBoundingClientRect()
    const tt = tooltipRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth

    // Decide vertical side, with auto-flip.
    let side: 'top' | 'bottom' = placement
    if (side === 'bottom' && tr.bottom + GAP + tt.height > vh - VIEWPORT_PADDING && tr.top - GAP - tt.height > VIEWPORT_PADDING) {
      side = 'top'
    } else if (side === 'top' && tr.top - GAP - tt.height < VIEWPORT_PADDING && tr.bottom + GAP + tt.height < vh - VIEWPORT_PADDING) {
      side = 'bottom'
    }

    const top = side === 'top' ? tr.top - tt.height - GAP : tr.bottom + GAP

    // Horizontal alignment with clamping inside the viewport.
    let left = align === 'end' ? tr.right - tt.width : tr.left
    if (left + tt.width > vw - VIEWPORT_PADDING) left = vw - VIEWPORT_PADDING - tt.width
    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING

    setCoords({ top, left, side })
  }, [open, placement, align, text])

  // Reposition on scroll/resize while open.
  useEffect(() => {
    if (!open) return
    function reposition() {
      if (!triggerRef.current || !tooltipRef.current) return
      const tr = triggerRef.current.getBoundingClientRect()
      const tt = tooltipRef.current.getBoundingClientRect()
      const vh = window.innerHeight
      const vw = window.innerWidth

      let side: 'top' | 'bottom' = placement
      if (side === 'bottom' && tr.bottom + GAP + tt.height > vh - VIEWPORT_PADDING && tr.top - GAP - tt.height > VIEWPORT_PADDING) side = 'top'
      else if (side === 'top' && tr.top - GAP - tt.height < VIEWPORT_PADDING && tr.bottom + GAP + tt.height < vh - VIEWPORT_PADDING) side = 'bottom'

      const top = side === 'top' ? tr.top - tt.height - GAP : tr.bottom + GAP
      let left = align === 'end' ? tr.right - tt.width : tr.left
      if (left + tt.width > vw - VIEWPORT_PADDING) left = vw - VIEWPORT_PADDING - tt.width
      if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING

      setCoords({ top, left, side })
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, placement, align])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (tooltipRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const side = coords?.side ?? placement
  const isTop = side === 'top'
  const isEnd = align === 'end'
  const arrowClass = `absolute w-2 h-2 rotate-45 bg-[#16161e] border-white/10 ${
    isTop ? 'top-full -mt-1 border-r border-b' : 'bottom-full -mb-1 border-l border-t'
  } ${isEnd ? 'right-3' : 'left-3'}`

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-purple-400/60 hover:text-purple-400 hover:bg-purple-500/10 transition-all duration-200 p-1 rounded-lg"
        aria-label="More info"
      >
        <HelpCircle size={18} />
      </button>
      {mounted && open &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              width: TOOLTIP_WIDTH,
              visibility: coords ? 'visible' : 'hidden',
              pointerEvents: 'none',
            }}
            className="z-[1000] px-3.5 py-2.5 rounded-xl bg-[#16161e] border border-white/10 shadow-xl text-xs text-muted-foreground leading-relaxed animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {text}
            <div className={arrowClass} />
          </div>,
          document.body,
        )}
    </>
  )
}
