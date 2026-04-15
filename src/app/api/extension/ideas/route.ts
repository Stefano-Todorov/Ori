import { NextRequest } from 'next/server'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import { checkFeature } from '@/lib/usage'
import { createServiceClient } from '@/lib/supabase/service'

async function persistThumbnail(userId: string, base64: string | null | undefined): Promise<string | null> {
  if (!base64) return null
  try {
    const buffer = Buffer.from(base64, 'base64')
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const service = createServiceClient()
    const { error } = await service.storage
      .from('thumbnails')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false })
    if (error) {
      console.error('[extension/ideas] thumbnail upload error:', error.message)
      return null
    }
    return service.storage.from('thumbnails').getPublicUrl(path).data.publicUrl
  } catch (err) {
    console.error('[extension/ideas] thumbnail crash:', err)
    return null
  }
}

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

  const rows = await Promise.all(
    (ideas as Array<{ idea: string; inspiration_url?: string; thumbnail_url?: string; thumbnail_base64?: string; source?: string; tags?: string[] }>).map(async (item) => {
      const persisted = await persistThumbnail(user.id, item.thumbnail_base64)
      return {
        user_id: user.id,
        idea: item.idea,
        inspiration_url: item.inspiration_url || null,
        thumbnail_url: persisted ?? item.thumbnail_url ?? null,
        source: item.source || null,
        tags: item.tags ?? [],
      }
    })
  )

  const { error } = await supabase.from('content_ideas').insert(rows)
  if (error) {
    console.error('[extension/ideas] DB error:', error.message)
    return errorResponse('Failed to save ideas', 500)
  }

  return jsonResponse({ ok: true, count: rows.length })
}
