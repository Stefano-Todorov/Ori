// Orianna background service worker

const SUPABASE_URL = 'https://zpowetkkmppaffqbgvzq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwb3dldGtrbXBwYWZmcWJndnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY2MTYsImV4cCI6MjA4ODMyMjYxNn0.fpFGFag1jQrP7ZWYlRgILOC7LuAg8nCDZTGGPciGkCM'
const ORIANNA_API = 'https://ori-nine.vercel.app'

// ─── Auth ───────────────────────────────────────────────────────────────────

async function getAuth() {
  return chrome.storage.local.get(['accessToken', 'refreshToken', 'expiresAt', 'userEmail'])
}

async function setAuth({ accessToken, refreshToken, expiresAt, userEmail }) {
  await chrome.storage.local.set({ accessToken, refreshToken, expiresAt, userEmail })
}

async function clearAuth() {
  await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt', 'userEmail'])
}

async function getValidToken() {
  const auth = await getAuth()
  if (!auth.accessToken) return null

  // Refresh if within 5 minutes of expiry
  const expiresAt = auth.expiresAt ? new Date(auth.expiresAt) : null
  if (expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    return await refreshToken(auth.refreshToken)
  }

  return auth.accessToken
}

async function refreshToken(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    await clearAuth()
    return null
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await setAuth({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    userEmail: (await getAuth()).userEmail,
  })
  return data.access_token
}

// ─── API helpers ────────────────────────────────────────────────────────────

async function apiGet(path) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authenticated')
  const res = await fetch(`${ORIANNA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function apiPost(path, body) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authenticated')
  const res = await fetch(`${ORIANNA_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let data
    try { data = await res.json() } catch { data = { error: `API error: ${res.status}` } }
    // Return error object directly so callers can check flags like `duplicate`
    return { error: data.error || `API error: ${res.status}`, ...data }
  }
  return res.json()
}

// ─── Thumbnail helper ────────────────────────────────────────────────────────

async function fetchThumbnailBase64(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  } catch {
    return null
  }
}

// ─── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => sendResponse({ error: err.message }))
  return true
})

async function handleMessage(msg) {
  switch (msg.type) {

    case 'LOGIN': {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: msg.anonKey },
        body: JSON.stringify({ email: msg.email, password: msg.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error_description || data.msg || 'Login failed')

      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
      await setAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        userEmail: msg.email,
      })
      return { ok: true, email: msg.email }
    }

    case 'LOGOUT': {
      await clearAuth()
      return { ok: true }
    }

    case 'GET_AUTH': {
      const auth = await getAuth()
      return { isLoggedIn: !!auth.accessToken, email: auth.userEmail ?? null }
    }

    case 'GET_CONTEXT': {
      return apiGet('/api/extension/context')
    }

    case 'SAVE_POST': {
      return apiPost('/api/extension/save', msg.payload)
    }

    case 'ADD_COMPETITOR': {
      return apiPost('/api/extension/save', {
        type: 'add-competitor',
        handle: msg.handle,
        platform: msg.platform,
      })
    }

    case 'GET_IDEAS': {
      const p = msg.postData
      const thumbB64 = await fetchThumbnailBase64(p.thumbnail)
      const ideasResult = await apiPost('/api/competitors/ideas', {
        handle: p.handle,
        platform: p.platform,
        caption: p.caption,
        hookText: p.hook_text ?? null,
        views: p.views,
        likes: p.likes,
        url: p.url,
        count: msg.count ?? 1,
        imageBase64: thumbB64,
      })
      return { ideas: ideasResult.ideas ?? [] }
    }

    case 'CREATE_IDEAS': {
      const payload = {
        ideas: msg.ideas.map(i => ({
          idea: i.idea,
          inspiration_url: i.url,
          thumbnail_url: i.thumbnail,
          source: `extension: @${i.handle} (${i.platform})`,
          tags: i.tags ?? [],
        })),
      }
      console.log('[Orianna BG] CREATE_IDEAS payload:', JSON.stringify(payload))
      return apiPost('/api/extension/ideas', payload)
    }

    case 'ANALYZE_POST': {
      const p2 = msg.postData
      const thumbB64_2 = await fetchThumbnailBase64(p2.thumbnail)
      const analyzeResult = await apiPost('/api/competitors/analyze', {
        handle: p2.handle,
        platform: p2.platform,
        caption: p2.caption,
        hookText: p2.hook_text ?? null,
        views: p2.views,
        likes: p2.likes,
        comments: p2.comments,
        url: p2.url,
        imageBase64: thumbB64_2,
      })
      return { analysis: analyzeResult.analysis ?? '' }
    }

    case 'BULK_IMPORT': {
      const { platform, posts } = msg
      if (!posts || posts.length === 0) return { ingested: 0, skipped: 0 }
      return apiPost('/api/extension/ingest', {
        platform,
        is_trending: true,
        posts: posts.map(p => ({
          url: p.url,
          caption: p.caption ?? null,
          views: p.views ?? 0,
          likes: p.likes ?? 0,
          comments: p.comments ?? 0,
          shares: p.shares ?? 0,
          saves: p.saves ?? 0,
          hashtags: [],
          thumbnail: p.thumbnail ?? null,
        })),
      })
    }

    case 'SYNC_TAGS': {
      return apiPost('/api/extension/sync-tags', { tags: msg.tags })
    }

    case 'DELETE_TAG': {
      return apiPost('/api/extension/sync-tags', { deleteTag: msg.tag })
    }

    case 'OPEN_VIDEO': {
      const { url } = msg
      if (!url) throw new Error('No video URL available')
      await chrome.tabs.create({ url, active: true })
      return { ok: true }
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`)
  }
}

