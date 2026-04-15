import { NextRequest } from 'next/server'
import { authenticateExtensionRequest, optionsResponse, jsonResponse, errorResponse } from '@/lib/extension-auth'
import { checkUsage, incrementUsage } from '@/lib/usage'
import { resolveVideoUrl } from '@/lib/video-resolve'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(req: NextRequest) {
  const auth = await authenticateExtensionRequest(req, 'download')
  if (auth instanceof Response) return auth
  const { user } = auth

  const usage = await checkUsage(user.id, 'downloads')
  if (!usage.allowed) {
    return errorResponse(`You've used all ${usage.limit} downloads this month. Upgrade for more.`, 429)
  }

  let body: { url?: string; platform?: string }
  try { body = await req.json() } catch { return errorResponse('Invalid JSON', 400) }
  const { url, platform } = body
  if (!url) return errorResponse('Missing url', 400)

  const videoUrl = await resolveVideoUrl(url, platform ?? '')
  if (!videoUrl) return errorResponse('Could not resolve video URL', 404)

  await incrementUsage(user.id, 'downloads')
  return jsonResponse({ videoUrl })
}
