import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evalScript } from '@/lib/eval'
import { z } from 'zod'

const RequestSchema = z.object({
  postId: z.string().uuid(),
  scriptText: z.string().min(10, 'Script text must be at least 10 characters'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { postId, scriptText } = parsed.data

  // Verify the post belongs to this user
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const evalResult = await evalScript(scriptText)

  // Save the script text and eval results to the post
  await supabase
    .from('posts')
    .update({
      script_text: scriptText,
      eval_score: evalResult.score,
      eval_tags: evalResult.tags,
    })
    .eq('id', postId)
    .eq('user_id', user.id)

  return NextResponse.json({ eval: evalResult })
}
