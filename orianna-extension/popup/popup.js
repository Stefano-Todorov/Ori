// Orianna Extension Popup

const dot = document.getElementById('dot')
const statusText = document.getElementById('status-text')
const captureSection = document.getElementById('capture-section')
const captureBtn = document.getElementById('capture-btn')
const captureTrendingBtn = document.getElementById('capture-trending-btn')
const result = document.getElementById('result')
const apiBaseInput = document.getElementById('api-base-input')
const saveUrlBtn = document.getElementById('save-url-btn')

let currentTab = null
let currentPlatform = null

async function init() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  currentTab = tab
  const url = tab?.url ?? ''

  if (url.includes('tiktok.com/@')) {
    currentPlatform = 'tiktok'
    document.getElementById('subtitle').textContent = 'TikTok profile detected'
    captureSection.style.display = 'block'
  } else if (url.includes('instagram.com/') && !url.includes('/p/') && !url.includes('/reel/')) {
    currentPlatform = 'instagram'
    document.getElementById('subtitle').textContent = 'Instagram profile detected'
    captureSection.style.display = 'block'
  } else {
    document.getElementById('subtitle').textContent = 'Browse to a TikTok or Instagram profile to capture'
  }

  // Check connection status
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' })
  if (status?.connected) {
    dot.classList.add('connected')
    statusText.textContent = 'Connected to Orianna'
  } else {
    statusText.textContent = 'Not connected — make sure you\'re logged in'
  }

  // Load saved API base
  const { apiBase } = await chrome.storage.local.get(['apiBase'])
  if (apiBase) apiBaseInput.value = apiBase
}

async function captureProfile(isTrending = false) {
  if (!currentTab || !currentPlatform) return

  captureBtn.disabled = true
  captureTrendingBtn.disabled = true
  showResult('Capturing posts...', 'info')

  const messageType = currentPlatform === 'tiktok' ? 'SCRAPE_TIKTOK' : 'SCRAPE_INSTAGRAM'

  let scrapeResult
  try {
    scrapeResult = await chrome.tabs.sendMessage(currentTab.id, { type: messageType })
  } catch (e) {
    showResult('Could not scrape — try refreshing the page', 'error')
    captureBtn.disabled = false
    captureTrendingBtn.disabled = false
    return
  }

  if (!scrapeResult?.posts?.length) {
    showResult('No posts found on this page. Scroll down to load more posts first.', 'error')
    captureBtn.disabled = false
    captureTrendingBtn.disabled = false
    return
  }

  const ingestResult = await chrome.runtime.sendMessage({
    type: 'INGEST_POSTS',
    payload: {
      platform: currentPlatform,
      competitor_handle: scrapeResult.handle,
      is_trending: isTrending,
      posts: scrapeResult.posts,
    },
  })

  if (ingestResult?.ok) {
    showResult(`Captured ${scrapeResult.posts.length} posts from @${scrapeResult.handle}!`, 'success')
  } else {
    showResult(ingestResult?.data?.error ?? 'Failed — are you logged into Orianna?', 'error')
  }

  captureBtn.disabled = false
  captureTrendingBtn.disabled = false
}

function showResult(msg, type = 'info') {
  result.style.display = 'block'
  result.textContent = msg
  result.className = `result ${type}`
}

captureBtn?.addEventListener('click', () => captureProfile(false))
captureTrendingBtn?.addEventListener('click', () => captureProfile(true))

saveUrlBtn?.addEventListener('click', async () => {
  const url = apiBaseInput.value.trim().replace(/\/$/, '')
  if (!url) return
  await chrome.runtime.sendMessage({ type: 'SET_API_BASE', url })
  showResult('URL saved!', 'success')
})

init()
