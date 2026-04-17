import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RequestSchema = z.object({
  postId: z.string().uuid(),
  scriptId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { postId, scriptId } = parsed.data

  // Get the script to copy text to the post
  const { data: script } = await supabase
    .from('scripts')
    .select('hook, body, cta')
    .eq('id', scriptId)
    .eq('user_id', user.id)
    .single()

  if (!script) return NextResponse.json({ error: 'Script not found' }, { status: 404 })

  // Link the post to the script
  const { error } = await supabase
    .from('posts')
    .update({
      linked_script_id: scriptId,
      script_text: `HOOK: ${script.hook}\n\nBODY:\n${script.body}${script.cta ? `\n\nCTA: ${script.cta}` : ''}`,
    })
    .eq('id', postId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[posts/link-script] DB error:', error.message)
    return NextResponse.json({ error: 'Failed to link script' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
