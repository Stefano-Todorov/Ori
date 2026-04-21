import { NextRequest } from 'next/server'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const Schema = z.object({
  post_url: z.string(),
  thumbnail_base64: z.string(),
})

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(req: NextRequest) {
  const auth = await authenticateExtensionRequest(req, 'extension-persist-thumb')
  if ('status' in auth) return auth
  const { user, supabase } = auth

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return errorResponse('Invalid payload', 400)

  const { post_url, thumbnail_base64 } = parsed.data

  try {
    const buffer = Buffer.from(thumbnail_base64, 'base64')
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const service = createServiceClient()
    const { error: uploadError } = await service.storage
      .from('thumbnails')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) {
      console.error('[persist-thumb] upload error:', uploadError.message)
      return errorResponse('Upload failed', 500)
    }

    const publicUrl = service.storage.from('thumbnails').getPublicUrl(path).data.publicUrl

    await supabase
      .from('posts')
      .update({ thumbnail_url: publicUrl })
      .eq('user_id', user.id)
      .eq('url', post_url)

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('[persist-thumb] crash:', err)
    return errorResponse('Failed to persist thumbnail', 500)
  }
}
