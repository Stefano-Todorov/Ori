// Orianna background service worker

const SUPABASE_URL = 'https://zpowetkkmppaffqbgvzq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwb3dldGtrbXBwYWZmcWJndnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY2MTYsImV4cCI6MjA4ODMyMjYxNn0.fpFGFag1jQrP7ZWYlRgILOC7LuAg8nCDZTGGPciGkCM'
const ORIANNA_API = 'https://ori-nine.vercel.app'

// ─── Auth ───────────────────────────────────────────────────────────────────

async function getAuth() {
  return chrome.storage.session.get(['accessToken', 'refreshToken', 'expiresAt', 'userEmail'])
}

async function setAuth({ accessToken, refreshToken, expiresAt, userEmail }) {
  await chrome.storage.session.set({ accessToken, refreshToken, expiresAt, userEmail })
}

async function clearAuth() {
  await chrome.storage.session.remove(['accessToken', 'refreshToken', 'expiresAt', 'userEmail'])
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
    if (!res.ok) {
      console.warn('[Orianna BG] thumbnail fetch failed:', res.status, url)
      return null
    }
    const blob = await res.blob()
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  } catch (err) {
    console.warn('[Orianna BG] thumbnail fetch error:', err.message, url)
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
      const payload = { ...msg.payload }
      if (payload.thumbnail && !payload.thumbnail_base64) {
        payload.thumbnail_base64 = await fetchThumbnailBase64(payload.thumbnail)
      }
      return apiPost('/api/extension/save', payload)
    }

    case 'ADD_COMPETITOR': {
      return apiPost('/api/extension/save', {
        type: 'add-competitor',
        handle: msg.handle,
        platform: msg.platform,
      })
    }

    case 'CREATE_IDEAS': {
      const ideas = await Promise.all(msg.ideas.map(async i => ({
        idea: i.idea,
        inspiration_url: i.url,
        thumbnail_url: i.thumbnail,
        thumbnail_base64: i.thumbnail ? await fetchThumbnailBase64(i.thumbnail) : null,
        source: `extension: @${i.handle} (${i.platform})`,
        tags: i.tags ?? [],
      })))
      const payload = { ideas }
      console.log('[Orianna BG] CREATE_IDEAS payload:', JSON.stringify(payload))
      return apiPost('/api/extension/ideas', payload)
    }

    case 'DOWNLOAD_VIDEO': {
      const { postUrl, handle, platform } = msg
      if (!postUrl) return { error: 'No post URL' }
      const resolved = await apiPost('/api/extension/resolve-video', { url: postUrl, platform })
      if (resolved?.error) return { error: resolved.error }
      const videoUrl = resolved?.videoUrl
      if (!videoUrl) return { error: 'Could not resolve video URL' }
      const safeHandle = (handle || 'video').replace(/[^a-zA-Z0-9_-]/g, '_')
      const filename = `orianna/${platform || 'video'}-${safeHandle}-${Date.now()}.mp4`
      await chrome.downloads.download({ url: videoUrl, filename, saveAs: false })
      return { ok: true }
    }

    case 'BULK_IMPORT': {
      const { platform, posts } = msg
      if (!posts || posts.length === 0) return { ingested: 0, skipped: 0 }

      // Save posts first with CDN URLs (small payload)
      const result = await apiPost('/api/extension/ingest', {
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

      // Then persist thumbnails to Supabase Storage in the background
      // (one at a time to avoid large payloads)
      const thumbPosts = posts.filter(p => p.thumbnail && p.url)
      if (thumbPosts.length > 0) {
        ;(async () => {
          const BATCH = 5
          for (let i = 0; i < thumbPosts.length; i += BATCH) {
            const batch = thumbPosts.slice(i, i + BATCH)
            await Promise.all(batch.map(async (p) => {
              try {
                const b64 = await fetchThumbnailBase64(p.thumbnail)
                if (!b64) return
                await apiPost('/api/extension/persist-thumb', {
                  post_url: p.url,
                  thumbnail_base64: b64,
                })
              } catch {}
            }))
          }
          console.log('[Orianna BG] Finished persisting', thumbPosts.length, 'thumbnails')
        })()
      }

      return result
    }

    case 'SYNC_MY_VIDEOS': {
      const { platform, follower_count, posts } = msg
      if (!posts || posts.length === 0) return { synced: 0, new: 0, updated: 0, suggested_links: [] }
      const result = await apiPost('/api/extension/sync-my-videos', { platform, follower_count, posts })

      // Persist thumbnails to Supabase Storage in the background
      const thumbsToSync = posts.filter(p => p.thumbnail && p.url)
      if (thumbsToSync.length > 0) {
        ;(async () => {
          const BATCH = 5
          for (let i = 0; i < thumbsToSync.length; i += BATCH) {
            const batch = thumbsToSync.slice(i, i + BATCH)
            await Promise.all(batch.map(async (p) => {
              try {
                const b64 = await fetchThumbnailBase64(p.thumbnail)
                if (!b64) return
                await apiPost('/api/extension/persist-thumb', {
                  post_url: p.url,
                  thumbnail_base64: b64,
                })
              } catch {}
            }))
          }
          console.log('[Orianna BG] Finished persisting', thumbsToSync.length, 'my-video thumbnails')
        })()
      }

      return result
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
      if (!url.startsWith('https://')) throw new Error('Invalid URL')
      await chrome.tabs.create({ url, active: true })
      return { ok: true }
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`)
  }
}

// ─── Focus Mode enforcement ────────────────────────────────────────────────
// Watch for tab navigations to blocked domains and ensure the overlay is shown.
// This is more reliable than relying solely on the content script's auto-injection.

const FOCUS_DOMAINS = ['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'reddit.com', 'facebook.com', 'fb.com', 'snapchat.com', 'threads.net']

const DOMAIN_TO_PLATFORM = {
  'tiktok.com': 'tiktok', 'instagram.com': 'instagram', 'youtube.com': 'youtube',
  'youtu.be': 'youtube', 'twitter.com': 'twitter', 'x.com': 'twitter',
  'reddit.com': 'reddit', 'facebook.com': 'facebook', 'fb.com': 'facebook',
  'snapchat.com': 'snapchat', 'threads.net': 'threads',
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (!FOCUS_DOMAINS.some(d => tab.url.includes(d))) return

  const stored = await chrome.storage.local.get(['focusModeEnabled', 'focusBlockedPlatforms'])
  if (!stored.focusModeEnabled) return

  // Check if any relevant platform is blocked for this domain
  // YouTube needs special handling: even if 'youtube' (full block) is off,
  // 'youtubeShorts' might be on, so we still need to inject the content script
  const platforms = stored.focusBlockedPlatforms ?? {}
  const matchedDomain = FOCUS_DOMAINS.find(d => tab.url.includes(d))
  const platform = matchedDomain ? DOMAIN_TO_PLATFORM[matchedDomain] : null
  if (platform === 'youtube') {
    // Skip only if BOTH youtube and youtubeShorts are off
    if (platforms.youtube === false && platforms.youtubeShorts === false) return
  } else if (platform && platforms[platform] === false) return

  // Content script should already be injected (manifest), but send FOCUS_CHECK to be sure
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'FOCUS_CHECK', enabled: true })
  } catch {
    // Content script not ready — inject and retry
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
      await chrome.tabs.sendMessage(tabId, { type: 'FOCUS_CHECK', enabled: true })
    } catch {}
  }
})

