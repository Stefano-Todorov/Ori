'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface Props {
  text: string
}

export function InfoTooltip({ text }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-purple-400/60 hover:text-purple-400 hover:bg-purple-500/10 transition-all duration-200 p-1 rounded-lg"
        aria-label="More info"
      >
        <HelpCircle size={18} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 px-3.5 py-2.5 rounded-xl bg-[#16161e] border border-white/10 shadow-xl text-xs text-muted-foreground leading-relaxed animate-in fade-in-0 zoom-in-95 duration-150">
          {text}
          <div className="absolute left-3 bottom-full w-2 h-2 rotate-45 bg-[#16161e] border-l border-t border-white/10" />
        </div>
      )}
    </div>
  )
}
