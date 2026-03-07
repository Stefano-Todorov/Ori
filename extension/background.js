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

    case 'GET_IDEAS': {
      // 1. Take screenshot of active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 })
      const base64 = screenshotDataUrl.split(',')[1]

      // 2. Claude vision extracts stats from screenshot
      const visionResult = await apiPost('/api/competitors/extract-vision', {
        imageBase64: base64,
        mediaType: 'image/jpeg',
      })

      // 3. Generate ideas from the extracted post data
      const merged = { ...msg.postData, ...visionResult }
      const ideasResult = await apiPost('/api/competitors/ideas', {
        handle: merged.handle ?? msg.postData.handle,
        platform: merged.platform ?? msg.postData.platform,
        caption: merged.caption ?? msg.postData.caption,
        hookText: merged.hook_text ?? null,
        views: merged.views ?? msg.postData.views,
        likes: merged.likes ?? msg.postData.likes,
        url: msg.postData.url,
      })

      return { ideas: ideasResult.ideas ?? [] }
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`)
  }
}
