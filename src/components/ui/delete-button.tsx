'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface Props {
  onDelete: () => Promise<void>
}

export function DeleteButton({ onDelete }: Props) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    await onDelete()
    setPending(false)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 size={14} />
    </Button>
  )
}
