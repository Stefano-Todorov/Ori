'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  storageKey: string
  title: string
  children: React.ReactNode
}

export function DismissibleTip({ storageKey, title, children }: Props) {
  const [dismissed, setDismissed] = useState(true) // Start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(`tip-${storageKey}`) === 'dismissed')
  }, [storageKey])

  if (dismissed) return null

  function handleDismiss() {
    localStorage.setItem(`tip-${storageKey}`, 'dismissed')
    setDismissed(true)
  }

  return (
    <div className="relative bg-purple-500/[0.04] border border-purple-500/15 rounded-2xl p-5 text-sm">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Dismiss"
      >
        <X size={14} />
      </button>
      <p className="font-bold text-foreground mb-1.5 pr-6">{title}</p>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  )
}
