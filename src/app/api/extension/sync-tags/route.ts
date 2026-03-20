import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkFeature } from '@/lib/usage'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  // Gate: requires extension_full feature
  const hasFullExtension = await checkFeature(user.id, 'extension_full')
  if (!hasFullExtension) {
    return NextResponse.json(
      { error: 'upgrade_required', message: 'Full extension features require Pro or Max plan' },
      { status: 403, headers: corsHeaders },
    )
  }

  const body = await req.json()
  const { tags, deleteTag } = body

  const { data: profile } = await supabase
    .from('profiles')
    .select('inspo_tags')
    .eq('user_id', user.id)
    .single()

  const existing: string[] = profile?.inspo_tags ?? []

  // Delete a single tag
  if (deleteTag && typeof deleteTag === 'string') {
    const updated = existing.filter(t => t !== deleteTag)
    await supabase.from('profiles').update({ inspo_tags: updated }).eq('user_id', user.id)
    // Also remove from all posts
    const { data: posts } = await supabase
      .from('posts')
      .select('id, tags')
      .eq('user_id', user.id)
      .contains('tags', [deleteTag])
    if (posts) {
      await Promise.all(posts.map(p =>
        supabase.from('posts').update({ tags: (p.tags as string[]).filter((t: string) => t !== deleteTag) }).eq('id', p.id)
      ))
    }
    return NextResponse.json({ ok: true, tags: updated }, { headers: corsHeaders })
  }

  // Merge new tags
  if (!Array.isArray(tags)) {
    return NextResponse.json({ error: 'tags must be an array' }, { status: 400, headers: corsHeaders })
  }

  const merged = [...new Set([...existing, ...tags])].sort()
  await supabase.from('profiles').update({ inspo_tags: merged }).eq('user_id', user.id)

  return NextResponse.json({ ok: true, tags: merged }, { headers: corsHeaders })
}
