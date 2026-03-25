import { NextRequest } from 'next/server'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import { checkFeature } from '@/lib/usage'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(req: NextRequest) {
  const auth = await authenticateExtensionRequest(req, 'extension-ideas')
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
  const { ideas } = body

  if (!Array.isArray(ideas) || ideas.length === 0) {
    return errorResponse('No ideas provided', 400)
  }

  const rows = ideas.map((item: { idea: string; inspiration_url?: string; thumbnail_url?: string; source?: string; tags?: string[] }) => ({
    user_id: user.id,
    idea: item.idea,
    inspiration_url: item.inspiration_url || null,
    thumbnail_url: item.thumbnail_url || null,
    source: item.source || null,
    tags: item.tags ?? [],
  }))

  const { error } = await supabase.from('content_ideas').insert(rows)
  if (error) {
    return errorResponse(error.message, 500)
  }

  return jsonResponse({ ok: true, count: rows.length })
}
