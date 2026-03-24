// Orianna Extension - Background Service Worker
const API_BASE = 'https://orianna.vercel.app' // Production URL (users can override in popup settings)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INGEST_POSTS') {
    ingestPosts(message.payload).then(sendResponse)
    return true // Keep channel open for async response
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['authToken', 'apiBase'], (data) => {
      sendResponse({ connected: !!data.authToken, apiBase: data.apiBase || API_BASE })
    })
    return true
  }

  if (message.type === 'SET_API_BASE') {
    chrome.storage.local.set({ apiBase: message.url })
    sendResponse({ ok: true })
    return true
  }
})

async function ingestPosts(payload) {
  const { apiBase } = await chrome.storage.local.get(['apiBase'])
  const base = apiBase || API_BASE

  try {
    const res = await fetch(`${base}/api/extension/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send session cookies
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    return { ok: res.ok, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
