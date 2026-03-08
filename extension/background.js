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
    const text = await res.text()
    throw new Error(text || `API error: ${res.status}`)
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

    case 'DOWNLOAD_VIDEO': {
      const { url, handle, platform } = msg
      if (!url) throw new Error('No video URL available')
      const filename = `${handle || 'video'}_${platform || 'clip'}_${Date.now()}.mp4`

      // TikTok: use tikwm.com API
      if (platform === 'tiktok' || url.includes('tiktok.com')) {
        try {
          console.log('[Orianna] Trying tikwm for TikTok download...')
          const res = await fetch('https://www.tikwm.com/api/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `url=${encodeURIComponent(url)}&hd=1`,
          })
          if (res.ok) {
            const json = await res.json()
            const videoUrl = json?.data?.hdplay || json?.data?.play
            if (videoUrl) {
              await chrome.downloads.download({ url: videoUrl, filename })
              return { ok: true }
            }
          }
        } catch (err) {
          console.log('[Orianna] tikwm error:', err.message)
        }
      }

      // Instagram: use direct video URL from content script (passed by popup)
      if (msg.directUrl) {
        try {
          console.log('[Orianna] Downloading IG video from direct URL...')
          await chrome.downloads.download({ url: msg.directUrl, filename })
          return { ok: true }
        } catch (err) {
          console.log('[Orianna] IG direct download failed:', err.message)
        }
      }

      // Fallback for TikTok only
      if (url.includes('tiktok.com')) {
        await chrome.tabs.create({ url: `https://snaptik.app#url=${encodeURIComponent(url)}` })
        return { ok: true, openedSite: true }
      }

      throw new Error('Could not get video URL — try refreshing the page and try again')
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`)
  }
}
