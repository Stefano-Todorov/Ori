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
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md"
        aria-label="More info"
      >
        <HelpCircle size={15} />
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 px-3.5 py-2.5 rounded-xl bg-[#16161e] border border-white/10 shadow-xl text-xs text-muted-foreground leading-relaxed animate-in fade-in-0 zoom-in-95 duration-150">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45 bg-[#16161e] border-r border-b border-white/10" />
        </div>
      )}
    </div>
  )
}
