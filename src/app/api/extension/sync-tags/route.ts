import { NextRequest } from 'next/server'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import { checkFeature } from '@/lib/usage'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(req: NextRequest) {
  const auth = await authenticateExtensionRequest(req, 'extension-sync-tags')
  if ('status' in auth) return auth
  const { user, supabase } = auth

  // Gate: requires extension_full feature
  const hasFullExtension = await checkFeature(user.id, 'extension_full')
  if (!hasFullExtension) {
    return jsonResponse(
      { error: 'upgrade_required', message: 'Full extension features require Pro or Max plan' },
      403,
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
    return jsonResponse({ ok: true, tags: updated })
  }

  // Merge new tags
  if (!Array.isArray(tags)) {
    return errorResponse('tags must be an array', 400)
  }

  const merged = [...new Set([...existing, ...tags])].sort()
  await supabase.from('profiles').update({ inspo_tags: merged }).eq('user_id', user.id)

  return jsonResponse({ ok: true, tags: merged })
}
