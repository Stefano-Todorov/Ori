// Orianna popup script

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwb3dldGtrbXBwYWZmcWJndnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY2MTYsImV4cCI6MjA4ODMyMjYxNn0.fpFGFag1jQrP7ZWYlRgILOC7LuAg8nCDZTGGPciGkCM'
const ORIANNA_URL = 'https://ori-nine.vercel.app'

const app = document.getElementById('app')

// ─── State ──────────────────────────────────────────────────────────────────

let state = {
  auth: null,
  postData: null,
  competitors: [],
  allTags: [],
  selectedTags: [],
  matchedCompetitor: null,
  view: 'loading',
  ideas: [],
  analysis: null,
  saving: null,
  messages: {},
  errors: {},
  showCompetitorPrompt: false,
  showDuplicatePrompt: false,
  showTagDropdown: false,
  dontAskCompetitor: false,
  focusModeEnabled: false,
  focusPlatformsOpen: false,
  focusBlockedPlatforms: { tiktok: true, instagram: true, youtube: true, youtubeShorts: true, twitter: true, reddit: true, facebook: true, snapchat: true, threads: true },
  showCreateInspo: false,
  createInspoItems: [''],
  createInspoTags: [],
  showCreateInspoTagDropdown: false,
  sortedPosts: [],
  sortBy: 'views',
  sortCount: 25,
  bookmarkPosts: [],
  bookmarkLimit: 'all',
  loadingBookmarks: false,
  importProgress: null,
  importError: null,
  showLoginForm: false,
  currentTipIndex: 0,
}

const SORT_TIPS = [
  '💡 The first 3 seconds determine 80% of completion rate',
  '💡 Posts with a hook in the first 2 seconds get 3× more views',
  '💡 Saves matter more than likes for the IG algorithm',
  '💡 Captions under 100 characters outperform longer ones on Reels',
  '💡 Top creators in your niche post 4–5× per week',
  '💡 Posting at the same time daily trains the algorithm faster',
  '💡 Comments-per-view is the #1 signal of "this resonated"',
  '💡 Watching your top videos = pattern recognition for your niche',
]

let tipIntervalId = null

function startTipRotation() {
  if (tipIntervalId) clearInterval(tipIntervalId)
  tipIntervalId = setInterval(() => {
    setState({ currentTipIndex: (state.currentTipIndex + 1) % SORT_TIPS.length })
  }, 3500)
}

function stopTipRotation() {
  if (tipIntervalId) { clearInterval(tipIntervalId); tipIntervalId = null }
}

// Listen for streamed partial results from content.js while a sort is in flight
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'SORT_PROGRESS' && state.saving === 'sorting' && Array.isArray(msg.posts)) {
    setState({ sortedPosts: msg.posts })
  }
})

function setState(patch) {
  state = { ...state, ...patch }
  render()
}

const LOGO_SVG = '<svg class="logo-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#ls)"/></svg>'

const FOCUS_PLATFORM_LABELS = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube',
  youtubeShorts: 'YouTube Shorts', twitter: 'Twitter / X', reddit: 'Reddit',
  facebook: 'Facebook', snapchat: 'Snapchat', threads: 'Threads',
}

function renderFocusToggle() {
  const isOn = state.focusModeEnabled
  return `<div class="header-focus ${isOn ? 'on' : ''}" id="focus-toggle" title="Focus Mode — hides distracting content (feeds, recommendations, shorts) on social media so you can stay on task.">
    <span class="header-focus-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
    <span class="header-focus-label">Focus</span>
    <div class="focus-switch ${isOn ? 'on' : ''}">
      <div class="focus-switch-knob"></div>
    </div>
  </div>`
}

function renderFocusPlatforms() {
  const p = state.focusBlockedPlatforms
  const enabledCount = Object.keys(FOCUS_PLATFORM_LABELS).filter(k => p[k]).length
  const total = Object.keys(FOCUS_PLATFORM_LABELS).length
  const isOpen = state.focusPlatformsOpen
  return `<div class="focus-dropdown">
    <div class="focus-dropdown-header" id="focus-dropdown-toggle">
      <span class="focus-dropdown-label">Blocked platforms</span>
      <span class="focus-dropdown-count">${enabledCount}/${total}</span>
      <span class="focus-dropdown-arrow ${isOpen ? 'open' : ''}">▸</span>
    </div>
    ${isOpen ? `<div class="focus-platforms">${
      Object.entries(FOCUS_PLATFORM_LABELS).map(([key, label]) =>
        `<div class="focus-platform-row" data-platform="${key}">
          <span class="focus-platform-name">${label}</span>
          <div class="focus-platform-switch ${p[key] ? 'on' : ''}">
            <div class="focus-switch-knob"></div>
          </div>
        </div>`
      ).join('')
    }</div>` : ''}
  </div>`
}

function renderHeader({ showAuth = false } = {}) {
  const platforms = renderFocusPlatforms()
  if (!showAuth) {
    return `<div class="header-wrap">
      <div class="header">
        <span class="logo">${LOGO_SVG}Orianna</span>
        <div class="header-right">${renderFocusToggle()}</div>
      </div>
      ${platforms}
    </div>`
  }
  return `<div class="header-wrap">
    <div class="header">
      <span class="logo">${LOGO_SVG}Orianna</span>
      <div class="header-right">
        <a class="dashboard-link" href="${ORIANNA_URL}/dashboard" target="_blank">Dashboard</a>
        ${renderFocusToggle()}
      </div>
    </div>
    ${platforms}
  </div>`
}

function renderUserBar() {
  if (!state.auth?.isLoggedIn) return ''
  return `<div class="user-bar">
    <span class="user-email">${state.auth?.email ?? ''}</span>
    <span style="color:#27272a">&middot;</span>
    <button class="logout-btn" id="logout-btn">Sign out</button>
  </div>`
}


async function handleFocusModeToggle() {
  const newVal = !state.focusModeEnabled
  chrome.storage.local.set({ focusModeEnabled: newVal })
  setState({ focusModeEnabled: newVal })

  // Directly notify the active tab (in case its content script predates the storage listener)
  const FOCUS_DOMAINS = ['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'reddit.com', 'facebook.com', 'fb.com', 'snapchat.com', 'threads.net']
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id && tab.url && FOCUS_DOMAINS.some(d => tab.url.includes(d))) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'FOCUS_CHECK', enabled: newVal })
    } catch {
      // Content script not loaded or outdated — inject fresh copy and retry
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
        await chrome.tabs.sendMessage(tab.id, { type: 'FOCUS_CHECK', enabled: newVal })
      } catch {}
    }
  }
}

function handlePlatformToggle(platform) {
  const updated = { ...state.focusBlockedPlatforms, [platform]: !state.focusBlockedPlatforms[platform] }
  chrome.storage.local.set({ focusBlockedPlatforms: updated })
  setState({ focusBlockedPlatforms: updated })
}

function wireFocusToggle() {
  document.getElementById('focus-toggle')?.addEventListener('click', handleFocusModeToggle)
  document.getElementById('focus-dropdown-toggle')?.addEventListener('click', () => {
    setState({ focusPlatformsOpen: !state.focusPlatformsOpen })
  })
  document.querySelectorAll('.focus-platform-row').forEach(row => {
    row.addEventListener('click', () => handlePlatformToggle(row.dataset.platform))
  })
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' })

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const isSupportedUrl = tab?.url && (tab.url.includes('tiktok.com') || tab.url.includes('instagram.com'))

  // If not logged in, still try to detect page type for sort functionality
  if (!auth.isLoggedIn) {
    let postData = null
    if (isSupportedUrl) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' })
          postData = result?.data ?? null
        } catch {
          if (attempt === 0) {
            try {
              await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
            } catch {}
          }
        }
        if (postData) break
        if (attempt < 2) await new Promise(r => setTimeout(r, 800))
      }
    }
    const focusStored = await chrome.storage.local.get(['focusModeEnabled', 'focusBlockedPlatforms'])
    setState({
      view: 'login', auth, postData,
      focusModeEnabled: focusStored.focusModeEnabled ?? false,
      focusBlockedPlatforms: { ...state.focusBlockedPlatforms, ...(focusStored.focusBlockedPlatforms ?? {}) },
    })
    return
  }

  // Load "don't ask again" preference
  const stored = await chrome.storage.local.get(['dontAskCompetitor', 'focusModeEnabled', 'focusBlockedPlatforms'])
  const dontAskCompetitor = stored.dontAskCompetitor ?? false
  const focusModeEnabled = stored.focusModeEnabled ?? false
  const focusBlockedPlatforms = { ...state.focusBlockedPlatforms, ...(stored.focusBlockedPlatforms ?? {}) }
  // Persist merged defaults so new platforms (like youtubeShorts) get saved
  chrome.storage.local.set({ focusBlockedPlatforms })

  setState({ auth, dontAskCompetitor, focusModeEnabled, focusBlockedPlatforms })

  let postData = null
  // Try extraction, with retries for SPA navigation (DOM may not be ready)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' })
      postData = result?.data ?? null
    } catch {
      // Content script not injected — inject it and retry
      if (isSupportedUrl && attempt === 0) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
        } catch {}
      }
    }
    if (postData) break
    if (attempt < 2 && isSupportedUrl) await new Promise(r => setTimeout(r, 800))
  }

  let competitors = []
  let allTags = []
  let socialAccounts = []
  let autoSyncEnabled = true
  try {
    const ctx = await chrome.runtime.sendMessage({ type: 'GET_CONTEXT' })
    competitors = ctx.competitors ?? []
    socialAccounts = ctx.socialAccounts ?? []
    autoSyncEnabled = ctx.profile?.auto_sync_own_profile ?? true
    const serverTags = ctx.allTags ?? []
    // Merge server tags with locally cached tags so tags survive post deletion
    const cached = await chrome.storage.local.get('inspoTags')
    const cachedTags = cached.inspoTags ?? []
    allTags = [...new Set([...serverTags, ...cachedTags])].sort()
    chrome.storage.local.set({ inspoTags: allTags })
  } catch {}

  // Auto-detect competitor match by handle (case-insensitive, supports linked groups)
  let matchedCompetitor = null
  if (postData?.handle) {
    const h = postData.handle.toLowerCase()
    matchedCompetitor = competitors.find(c =>
      c.handles ? c.handles.some(ch => ch === h) : c.handle.toLowerCase() === h
    ) ?? null
  }

  // Route to correct view based on page type
  const view = postData?.pageType === 'profile' ? 'profile'
             : postData?.pageType === 'bookmarks' ? 'bookmarks'
             : 'main'

  if (view === 'bookmarks') {
    // Show bookmarks view immediately with basic post data, then enrich
    const basicPosts = (postData.posts ?? []).map(p => ({ ...p, checked: true, views: p.views ?? null, likes: null, comments: null }))
    setState({ view, postData, competitors, matchedCompetitor, allTags, bookmarkPosts: basicPosts, loadingBookmarks: true })
    // Fetch enriched data with metrics/thumbnails
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_BOOKMARKS' })
      if (result?.posts?.length > 0) {
        const enriched = result.posts.map(p => ({ ...p, checked: true }))
        setState({ bookmarkPosts: enriched, loadingBookmarks: false })
      } else {
        setState({ loadingBookmarks: false })
      }
    } catch {
      setState({ loadingBookmarks: false })
    }
    return
  }

  // Check if this is the user's OWN profile
  const isOwnProfile = postData?.pageType === 'profile' && postData?.handle &&
    socialAccounts.some(a => a.platform === postData.platform && a.username?.toLowerCase() === postData.handle.toLowerCase())

  setState({ view, postData, competitors, matchedCompetitor, allTags, socialAccounts, autoSyncEnabled, isOwnProfile })

  // Auto-sync if on own profile and enabled
  if (isOwnProfile && autoSyncEnabled) {
    const syncKey = `lastSync_${postData.platform}`
    const stored = await chrome.storage.local.get(syncKey)
    const lastSync = stored[syncKey] ? new Date(stored[syncKey]).getTime() : 0
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    if (lastSync < oneHourAgo) {
      handleSyncMyVideos()
    }
  }

  // Pre-warm the sort cache the moment the profile view renders, so by the
  // time the user reads the popup the leaderboard is already populated.
  if (view === 'profile' && state.sortedPosts.length === 0 && state.saving !== 'sorting') {
    runSort(state.sortBy ?? 'views', state.sortCount ?? 25)
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function handleLogin(email, password) {
  setState({ errors: { login: null }, saving: 'login' })
  const result = await chrome.runtime.sendMessage({
    type: 'LOGIN', email, password, anonKey: SUPABASE_ANON_KEY,
  })
  setState({ saving: null })
  if (result.error) {
    setState({ errors: { login: result.error } })
    return
  }
  setState({ auth: { isLoggedIn: true, email } })
  init()
}

async function handleLogout() {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' })
  setState({ view: 'login', auth: { isLoggedIn: false }, postData: null, competitors: [] })
}

async function handleSaveInspiration(force) {
  if (!state.postData) return
  setState({ saving: 'inspiration', errors: {}, messages: {}, showDuplicatePrompt: false })
  const tagsPayload = state.selectedTags.length > 0 ? { tags: state.selectedTags } : {}
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_POST',
    payload: { type: 'inspiration', ...state.postData, ...tagsPayload, ...(force ? { force } : {}) },
  })
  setState({ saving: null })
  if (result.error) {
    if (result.duplicate) setState({ showDuplicatePrompt: true })
    else setState({ errors: { inspiration: result.error } })
    return
  }
  setState({ messages: { inspiration: force === 'replace' ? 'Replaced' : 'Saved' }, createInspoTags: state.selectedTags, selectedTags: [] })
}

function toggleTag(tag) {
  const tags = state.selectedTags.includes(tag)
    ? state.selectedTags.filter(t => t !== tag)
    : [...state.selectedTags, tag]
  setState({ selectedTags: tags })
}

function addNewTag() {
  const input = document.getElementById('new-tag-input')
  if (!input) return
  const tag = input.value.trim().toLowerCase()
  if (!tag) return
  if (!state.selectedTags.includes(tag)) {
    setState({ selectedTags: [...state.selectedTags, tag] })
  }
  if (!state.allTags.includes(tag)) {
    const updated = [...state.allTags, tag].sort()
    setState({ allTags: updated })
    chrome.storage.local.set({ inspoTags: updated })
    chrome.runtime.sendMessage({ type: 'SYNC_TAGS', tags: updated })
  }
  input.value = ''
}

function addCreateInspoTag() {
  const input = document.getElementById('ci-new-tag-input')
  if (!input) return
  const tag = input.value.trim().toLowerCase()
  if (!tag) return
  if (!state.createInspoTags.includes(tag)) {
    setState({ createInspoTags: [...state.createInspoTags, tag] })
  }
  if (!state.allTags.includes(tag)) {
    const updated = [...state.allTags, tag].sort()
    setState({ allTags: updated })
    chrome.storage.local.set({ inspoTags: updated })
    chrome.runtime.sendMessage({ type: 'SYNC_TAGS', tags: updated })
  }
  input.value = ''
}

async function handleCompetitorYes() {
  if (!state.postData?.handle) return
  setState({ saving: 'add-competitor-prompt', showCompetitorPrompt: false })
  const result = await chrome.runtime.sendMessage({
    type: 'ADD_COMPETITOR',
    handle: state.postData.handle,
    platform: state.postData.platform,
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { inspiration: result.error } })
  else setState({
    messages: { inspiration: `Saved + @${state.postData.handle} added as competitor` },
    matchedCompetitor: { handle: state.postData.handle, platforms: [state.postData.platform], postCount: 0 },
  })
}

async function handleCompetitorNo() {
  const dontAsk = document.getElementById('dont-ask-checkbox')?.checked ?? false
  if (dontAsk) {
    await chrome.storage.local.set({ dontAskCompetitor: true })
    state.dontAskCompetitor = true
  }
  setState({ showCompetitorPrompt: false })
}

async function handleDownload() {
  if (!state.postData) return
  setState({ saving: 'download', errors: {}, messages: {} })

  if (!state.postData.url) {
    setState({ saving: null, errors: { download: 'No post URL detected on this page.' } })
    return
  }

  const result = await chrome.runtime.sendMessage({
    type: 'DOWNLOAD_VIDEO',
    postUrl: state.postData.url,
    handle: state.postData.handle,
    platform: state.postData.platform,
  })
  setState({ saving: null })
  if (result?.error) setState({ errors: { download: result.error } })
  else setState({ messages: { download: 'Download started' } })
}

async function handleCreateInspo() {
  const items = state.createInspoItems.filter(t => t.trim())
  if (items.length === 0) return
  // Combine tags from both pickers (create-inspo panel + main picker), dedup
  const tags = [...new Set([...state.createInspoTags, ...state.selectedTags])]
  console.log('[Orianna] handleCreateInspo tags:', { createInspoTags: state.createInspoTags, selectedTags: state.selectedTags, finalTags: tags, items })
  setState({ saving: 'create-inspo', errors: {}, messages: {} })
  const msg = {
    type: 'CREATE_IDEAS',
    ideas: items.map(idea => ({
      idea: idea.trim(),
      url: state.postData.url,
      thumbnail: state.postData.thumbnail,
      handle: state.postData.handle,
      platform: state.postData.platform,
      tags: [...tags],
    })),
  }
  console.log('[Orianna] Sending CREATE_IDEAS:', JSON.stringify(msg))
  const result = await chrome.runtime.sendMessage(msg)
  setState({ saving: null })
  if (result.error) {
    setState({ errors: { createInspo: result.error } })
  } else {
    setState({
      messages: { createInspo: `${items.length} idea${items.length > 1 ? 's' : ''} saved` },
      createInspoItems: [''],
      createInspoTags: [],
      showCreateInspo: false,
      showCreateInspoTagDropdown: false,
    })
  }
}

function toggleBookmarkPost(index) {
  const posts = [...state.bookmarkPosts]
  posts[index] = { ...posts[index], checked: !posts[index].checked }
  const list = document.querySelector('.bookmark-list')
  const scrollTop = list ? list.scrollTop : 0
  setState({ bookmarkPosts: posts })
  const newList = document.querySelector('.bookmark-list')
  if (newList) newList.scrollTop = scrollTop
}

function getVisibleLimit() {
  return state.bookmarkLimit === 'all' ? state.bookmarkPosts.length : parseInt(state.bookmarkLimit)
}

function selectAllBookmarks() {
  const list = document.querySelector('.bookmark-list')
  const scrollTop = list ? list.scrollTop : 0
  const limit = getVisibleLimit()
  setState({ bookmarkPosts: state.bookmarkPosts.map((p, i) => ({ ...p, checked: i < limit ? true : p.checked })) })
  const newList = document.querySelector('.bookmark-list')
  if (newList) newList.scrollTop = scrollTop
}

function deselectAllBookmarks() {
  const list = document.querySelector('.bookmark-list')
  const scrollTop = list ? list.scrollTop : 0
  const limit = getVisibleLimit()
  setState({ bookmarkPosts: state.bookmarkPosts.map((p, i) => ({ ...p, checked: i < limit ? false : p.checked })) })
  const newList = document.querySelector('.bookmark-list')
  if (newList) newList.scrollTop = scrollTop
}

async function handleBulkImport() {
  const limit = getVisibleLimit()
  const selected = state.bookmarkPosts.slice(0, limit).filter(p => p.checked)
  if (selected.length === 0) return
  setState({ saving: 'bulk-import', importError: null, importProgress: null })

  const result = await chrome.runtime.sendMessage({
    type: 'BULK_IMPORT',
    platform: state.postData.platform,
    posts: selected,
  })

  setState({ saving: null })
  if (result.error) {
    setState({ importError: result.error })
  } else {
    setState({ importProgress: { imported: result.ingested ?? 0, skipped: result.skipped ?? 0, total: selected.length } })
  }
}

async function runSort(sortBy, sortCount) {
  setState({ saving: 'sorting', errors: {}, sortBy, sortCount, sortedPosts: [], currentTipIndex: 0 })
  startTipRotation()

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SORTED_METRICS', sortBy, sortCount })
    stopTipRotation()
    if (result.error) {
      setState({ saving: null, errors: { sort: result.error } })
    } else {
      setState({ saving: null, sortedPosts: result.posts ?? [] })
    }
  } catch (err) {
    stopTipRotation()
    setState({ saving: null, errors: { sort: 'Could not fetch metrics from page' } })
  }
}

async function handleSort() {
  const sortBy = document.getElementById('sort-by')?.value ?? state.sortBy ?? 'views'
  const sortCount = parseInt(document.getElementById('sort-count')?.value ?? String(state.sortCount ?? 25))
  await runSort(sortBy, sortCount)
}

function handleExportCSV() {
  const posts = state.sortedPosts ?? []
  if (!posts.length) return
  const sortBy = state.sortBy ?? 'views'
  const count = state.sortCount ?? 25
  const rows = [['#', 'Views', 'Likes', 'Comments', 'URL']]
  posts.slice(0, count).forEach((p, i) => {
    rows.push([i + 1, p.views ?? '', p.likes ?? '', p.comments ?? '', p.href ?? ''])
  })
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orianna-sorted-${sortBy}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleAddCompetitor() {
  if (!state.postData?.handle) return
  setState({ saving: 'add-competitor', errors: {}, messages: {} })
  const result = await chrome.runtime.sendMessage({
    type: 'ADD_COMPETITOR',
    handle: state.postData.handle,
    platform: state.postData.platform,
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { addCompetitor: result.error } })
  else {
    const existingPlatforms = state.matchedCompetitor?.platforms ?? []
    const newPlatforms = [...new Set([...existingPlatforms, state.postData.platform])]
    setState({
      messages: { addCompetitor: `@${state.postData.handle} added as competitor on ${state.postData.platform}` },
      matchedCompetitor: { handle: state.postData.handle, platforms: newPlatforms, postCount: state.matchedCompetitor?.postCount ?? 0 },
    })
  }
}


async function handleSyncMyVideos() {
  if (!state.postData?.handle || !state.postData?.platform) return
  setState({ saving: 'syncing-videos', errors: {}, messages: {}, syncResult: null })

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_OWN_PROFILE', limit: 50 })

    if (!result || !result.posts || result.posts.length === 0) {
      setState({ saving: null, errors: { sync: 'No posts found on this profile page. Try scrolling down to load more videos.' } })
      return
    }

    const syncResult = await chrome.runtime.sendMessage({
      type: 'SYNC_MY_VIDEOS',
      platform: result.platform,
      follower_count: result.follower_count,
      posts: result.posts,
    })

    if (syncResult.error) {
      setState({ saving: null, errors: { sync: syncResult.error } })
      return
    }

    // Store last sync timestamp
    const syncKey = `lastSync_${result.platform}`
    await chrome.storage.local.set({ [syncKey]: new Date().toISOString() })

    setState({
      saving: null,
      syncResult,
      messages: { sync: `Synced ${syncResult.synced} videos (${syncResult.new} new, ${syncResult.updated} updated)` },
    })
  } catch (err) {
    setState({ saving: null, errors: { sync: err.message || 'Sync failed' } })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function escHtml(str) {
  return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  if (state.view === 'loading') {
    app.innerHTML = `<div class="no-post">Loading...</div>`
    return
  }

  if (state.view === 'login') {
    const p = state.postData
    const isProfile = p?.pageType === 'profile'
    const hasPost = !!p && !isProfile
    const sortedPosts = state.sortedPosts ?? []
    const sortBy = state.sortBy ?? 'views'
    const sortCount = state.sortCount ?? 25

    const sortListHtml = sortedPosts.length > 0
      ? sortedPosts.slice(0, sortCount).map((post, i) => `
          <div class="sorted-item" title="${escHtml(post.href)}">
            <span class="sorted-rank">${i + 1}</span>
            ${post.thumb ? `<img class="sorted-thumb" src="${escHtml(post.thumb)}" />` : `<div class="sorted-thumb"></div>`}
            <div class="sorted-metrics">
              <div class="sorted-metric-row">
                ${post.views != null ? `<span class="${sortBy === 'views' ? 'primary' : 'val'}">👁 ${fmt(post.views)}</span>` : ''}
                ${post.likes != null ? `<span class="${sortBy === 'likes' ? 'primary' : 'val'}">❤️ ${fmt(post.likes)}</span>` : ''}
                ${post.comments != null ? `<span class="${sortBy === 'comments' ? 'primary' : 'val'}">💬 ${fmt(post.comments)}</span>` : ''}
              </div>
              <div class="sorted-url">${escHtml(post.href.replace(/https?:\/\/(www\.)?(instagram|tiktok)\.com/, ''))}</div>
            </div>
            <div class="sorted-actions">
              <button class="btn-open" data-url="${escHtml(post.href)}">Open</button>
              <button class="btn-goto" data-url="${escHtml(post.href)}">Go to</button>
            </div>
          </div>
        `).join('')
      : ''

    app.innerHTML = `
      ${renderHeader()}

      ${isProfile ? `
        <div class="profile-header">
          <div class="profile-header-row">
            <span class="platform-badge ${(p.platform || '').toLowerCase()}">${escHtml(p.platform)}</span>
            <span class="detected-handle">@${escHtml(p.handle)}</span>
          </div>
        </div>

        <div class="sort-box">
          <div class="sort-controls">
            <span class="sort-label">Sort by</span>
            <select id="sort-by">
              <option value="views" ${sortBy === 'views' ? 'selected' : ''}>Views</option>
              <option value="likes" ${sortBy === 'likes' ? 'selected' : ''}>Likes</option>
              <option value="comments" ${sortBy === 'comments' ? 'selected' : ''}>Comments</option>
            </select>
            <span class="sort-label">Top</span>
            <select id="sort-count">
              <option value="10" ${sortCount === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${sortCount === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${sortCount === 50 ? 'selected' : ''}>50</option>
            </select>
            <button class="btn btn-primary" id="sort-btn" ${state.saving === 'sorting' ? 'disabled' : ''}>
              ${state.saving === 'sorting' ? '<span class="spinner"></span>' : 'Sort'}
            </button>
          </div>
          ${state.errors.sort ? `<div class="error-msg" style="margin-top:6px">${escHtml(state.errors.sort)}</div>` : ''}
          ${state.saving === 'sorting' ? `
            <div class="sort-status">
              ${sortedPosts.length > 0
                ? `Ranking ${sortedPosts.length} so far &middot; still fetching...`
                : `Loading top ${sortCount} by ${sortBy}...`}
            </div>
            <div class="sort-tip" key="${state.currentTipIndex}">${SORT_TIPS[state.currentTipIndex % SORT_TIPS.length]}</div>
          ` : sortedPosts.length > 0 ? `
            <div class="sort-status">
              Showing top ${Math.min(sortCount, sortedPosts.length)} of ${sortedPosts.length} by ${sortBy}
            </div>
          ` : `
            <div class="sort-helper">Click Sort to rank videos by metrics.</div>
          `}
        </div>

        ${state.saving === 'sorting' && sortedPosts.length === 0 ? `
          <div class="sorted-list">
            ${Array.from({ length: Math.min(sortCount, 8) }, (_, i) => `
              <div class="sorted-item skeleton">
                <span class="sorted-rank skeleton-rank">${i + 1}</span>
                <div class="sorted-thumb skeleton-box"></div>
                <div class="sorted-metrics">
                  <div class="skeleton-line skeleton-box"></div>
                  <div class="skeleton-line short skeleton-box"></div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : sortedPosts.length > 0 ? `
          <div class="sorted-list">${sortListHtml}</div>
          ${state.saving !== 'sorting' ? `
            <div class="sort-export">
              <button class="btn btn-outline" id="export-btn" style="font-size:11px">Export CSV</button>
            </div>
          ` : ''}
        ` : ''}

        <div class="locked-teasers">
          <button class="btn btn-locked outline">🔒 Track as Competitor</button>
        </div>
      ` : hasPost ? `
        <div class="detected">
          <div class="detected-row">
            <span class="platform-badge ${(p.platform || '').toLowerCase()}">${p.platform}</span>
            <span class="detected-handle">@${p.handle || 'unknown'}</span>
          </div>
          ${p.caption ? `<div class="detected-caption">${escHtml(p.caption)}</div>` : ''}
          ${(p.views != null || p.likes != null) ? (() => {
            const eng = p.views > 0 ? (((p.likes || 0) + (p.comments || 0) + (p.shares || 0)) / p.views * 100).toFixed(1) : null
            return `
            <div class="stats-row">
              ${p.views != null ? `<div>👁 <span class="stat-num">${fmt(p.views)}</span> <span class="stat-label">views</span></div>` : ''}
              ${p.likes != null ? `<div>❤️ <span class="stat-num">${fmt(p.likes)}</span> <span class="stat-label">likes</span></div>` : ''}
              ${p.comments != null ? `<div>💬 <span class="stat-num">${fmt(p.comments)}</span> <span class="stat-label">comments</span></div>` : ''}
              ${p.shares != null ? `<div>📤 <span class="stat-num">${fmt(p.shares)}</span> <span class="stat-label">shares</span></div>` : ''}
              ${eng != null ? `<div>⚡ <span class="stat-num stat-eng">${eng}%</span> <span class="stat-label">eng</span></div>` : ''}
            </div>`
          })() : ''}
        </div>
        <div class="locked-teasers">
          <button class="btn btn-locked primary">🔒 Save as Inspiration</button>
          <button class="btn btn-locked secondary">🔒 Download</button>
        </div>
      ` : `
        <div class="no-post">
          <span style="font-size:20px;display:block;margin-bottom:6px">✦</span>
        Open any TikTok or Instagram post<br>to capture, analyze, or download it
        </div>
      `}

      ${!state.showLoginForm && (hasPost || isProfile) ? `
        <div class="login-bar">
          <span class="login-bar-text">Sign in for free to unlock</span>
          <button class="login-bar-btn primary" id="show-login-btn">Sign in</button>
          <a class="login-bar-btn secondary" href="${ORIANNA_URL}/signup" target="_blank">Sign up</a>
        </div>
      ` : `
        <div class="login-expand">
          <div class="login-row">
            <input id="email" type="email" placeholder="Email" />
            <input id="password" type="password" placeholder="Password" />
            <button class="btn btn-primary" id="login-btn" ${state.saving === 'login' ? 'disabled' : ''}>
              ${state.saving === 'login' ? '<span class="spinner"></span>' : 'Sign in'}
            </button>
          </div>
          ${state.errors.login ? `<div class="error-msg">${escHtml(state.errors.login)}</div>` : ''}
          <div class="signup-link">No account? <a href="${ORIANNA_URL}/signup" target="_blank">Sign up free</a></div>
        </div>
      `}

      <div class="footer-links">
        <a href="${ORIANNA_URL}" target="_blank">Open Orianna</a>
        <span class="dot">&middot;</span>
        <a href="${ORIANNA_URL}/legal/privacy" target="_blank">Privacy</a>
        <span class="dot">&middot;</span>
        <a href="${ORIANNA_URL}/legal/terms" target="_blank">Terms</a>
      </div>

    `
    wireFocusToggle()
    document.getElementById('show-login-btn')?.addEventListener('click', () => {
      setState({ showLoginForm: true })
    })
    document.getElementById('login-btn')?.addEventListener('click', () => {
      const email = document.getElementById('email').value.trim()
      const password = document.getElementById('password').value
      if (email && password) handleLogin(email, password)
    })
    document.getElementById('password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('login-btn').click()
    })
    // Sort functionality works without login
    document.getElementById('sort-btn')?.addEventListener('click', handleSort)
    document.getElementById('export-btn')?.addEventListener('click', handleExportCSV)
    document.querySelectorAll('.btn-open[data-url]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        chrome.tabs.create({ url: btn.dataset.url, active: false })
      })
    })
    document.querySelectorAll('.btn-goto[data-url]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        chrome.tabs.update(tab.id, { url: btn.dataset.url })
        window.close()
      })
    })
    return
  }

  if (state.view === 'ideas') {
    const idea = state.ideas[0]

    app.innerHTML = `
      ${renderHeader({ showAuth: true })}
      <div class="ideas-result">
        <h3>Idea saved to Orianna</h3>
        ${idea ? `
          <div class="idea-item">
            <div class="idea-text">${escHtml(idea.idea)}</div>
            ${idea.hook_idea ? `<div class="idea-hook">"${escHtml(idea.hook_idea)}"</div>` : ''}
          </div>
        ` : ''}
        <a href="${ORIANNA_URL}/dashboard/ideas" target="_blank" class="btn btn-link">Open Ideas Board</a>
        <button class="btn btn-outline" id="back-btn" style="margin-top:6px">Back</button>
      </div>

      ${renderUserBar()}

    `
    wireFocusToggle()
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout)
    document.getElementById('back-btn').addEventListener('click', () => setState({ view: 'main' }))
    return
  }

  // ─── Bookmarks View ───────────────────────────────────────────────────

  if (state.view === 'bookmarks') {
    const allPosts = state.bookmarkPosts
    const limit = state.bookmarkLimit === 'all' ? allPosts.length : parseInt(state.bookmarkLimit)
    const posts = allPosts.slice(0, limit)
    const checkedCount = posts.filter(p => p.checked).length
    const platformLabel = state.postData?.platform === 'instagram' ? 'Saved Posts' : 'Favorites'
    const platformClass = (state.postData?.platform || '').toLowerCase()

    const listHtml = posts.length > 0
      ? posts.map((p, i) => {
          const thumbHtml = p.thumbnail
            ? `<img class="bookmark-thumb" src="${escHtml(p.thumbnail)}" />`
            : `<div class="bookmark-thumb bookmark-thumb-placeholder ${platformClass}"></div>`
          const label = p.caption
            ? escHtml(p.caption.slice(0, 60)) + (p.caption.length > 60 ? '...' : '')
            : p.handle
            ? `@${escHtml(p.handle)}`
            : escHtml(p.url.replace(/https?:\/\/(www\.)?(instagram|tiktok)\.com/, '').slice(0, 40))
          const viewsBadge = p.views ? `<span class="bookmark-views">${fmt(p.views)}</span>` : ''
          return `
            <label class="bookmark-item ${p.checked ? '' : 'unchecked'}" data-index="${i}">
              <input type="checkbox" ${p.checked ? 'checked' : ''} data-index="${i}" />
              ${thumbHtml}
              <span class="bookmark-label">${label}</span>
              ${viewsBadge}
            </label>
          `
        }).join('')
      : ''

    app.innerHTML = `
      ${renderHeader({ showAuth: true })}

      <div class="bookmark-header">
        <span class="platform-badge ${platformClass}">${state.postData?.platform ?? ''}</span>
        <span class="bookmark-title">${platformLabel}</span>
      </div>

      ${state.loadingBookmarks ? `
        <div class="bookmark-loading">
          <span class="spinner"></span> Loading posts...
        </div>
      ` : posts.length === 0 ? `
        <div class="no-post">No saved posts found. Scroll the page to load more, then reopen the extension.</div>
      ` : `
        <div class="bookmark-controls">
          <button class="btn-bookmark-action" id="select-all-btn">Select all</button>
          <button class="btn-bookmark-action" id="deselect-all-btn">Deselect all</button>
          <span class="bookmark-count">${checkedCount} of ${posts.length} selected</span>
          <select id="bookmark-limit" class="bookmark-limit-select">
            ${[5,10,15,20,30,50,'all'].map(v => {
              const label = v === 'all' ? `All (${allPosts.length})` : v
              return `<option value="${v}" ${String(state.bookmarkLimit) === String(v) ? 'selected' : ''}>${label}</option>`
            }).join('')}
          </select>
        </div>

        <div class="bookmark-list">${listHtml}</div>

        <div class="bookmark-footer">
          <button class="btn btn-primary" id="import-btn" ${state.saving === 'bulk-import' || checkedCount === 0 ? 'disabled' : ''} title="Add the checked saved posts to your Inspo board in one go.">
            ${state.saving === 'bulk-import' ? '<span class="spinner"></span> Importing...' : `Import ${checkedCount} as Inspo`}
            <span class="btn-help">?</span>
          </button>
          ${state.importProgress ? `
            <div class="success-msg">
              Imported ${state.importProgress.imported}${state.importProgress.skipped > 0 ? `, skipped ${state.importProgress.skipped} duplicates` : ''}
              — <a href="${ORIANNA_URL}/dashboard/inspo" target="_blank" style="color:#818cf8;text-decoration:underline;font-size:11px">View Inspo</a>
            </div>
          ` : ''}
          ${state.importError ? `<div class="error-msg">${state.importError}</div>` : ''}
          <div class="bookmark-hint">Scroll the page to load more, then reopen extension</div>
        </div>
      `}

      ${renderUserBar()}

    `

    document.getElementById('logout-btn')?.addEventListener('click', handleLogout)
    wireFocusToggle()
    document.getElementById('select-all-btn')?.addEventListener('click', selectAllBookmarks)
    document.getElementById('deselect-all-btn')?.addEventListener('click', deselectAllBookmarks)
    document.getElementById('import-btn')?.addEventListener('click', handleBulkImport)
    document.getElementById('bookmark-limit')?.addEventListener('change', (e) => {
      const newLimit = e.target.value === 'all' ? state.bookmarkPosts.length : parseInt(e.target.value)
      setState({
        bookmarkLimit: e.target.value,
        bookmarkPosts: state.bookmarkPosts.map((p, i) => ({ ...p, checked: i < newLimit })),
      })
    })
    document.querySelectorAll('.bookmark-item input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => toggleBookmarkPost(parseInt(cb.dataset.index)))
    })
    return
  }

  // ─── Profile View ─────────────────────────────────────────────────────

  if (state.view === 'profile') {
    const p = state.postData
    const mc = state.matchedCompetitor
    const sortedPosts = state.sortedPosts ?? []
    const sortBy = state.sortBy ?? 'views'
    const sortCount = state.sortCount ?? 25

    const listHtml = sortedPosts.length > 0
      ? sortedPosts.slice(0, sortCount).map((post, i) => `
          <div class="sorted-item" title="${escHtml(post.href)}">
            <span class="sorted-rank">${i + 1}</span>
            ${post.thumb ? `<img class="sorted-thumb" src="${escHtml(post.thumb)}" />` : `<div class="sorted-thumb"></div>`}
            <div class="sorted-metrics">
              <div class="sorted-metric-row">
                ${post.views != null ? `<span class="${sortBy === 'views' ? 'primary' : 'val'}">👁 ${fmt(post.views)}</span>` : ''}
                ${post.likes != null ? `<span class="${sortBy === 'likes' ? 'primary' : 'val'}">❤️ ${fmt(post.likes)}</span>` : ''}
                ${post.comments != null ? `<span class="${sortBy === 'comments' ? 'primary' : 'val'}">💬 ${fmt(post.comments)}</span>` : ''}
              </div>
              <div class="sorted-url">${escHtml(post.href.replace(/https?:\/\/(www\.)?(instagram|tiktok)\.com/, ''))}</div>
            </div>
            <div class="sorted-actions">
              <button class="btn-open" data-url="${escHtml(post.href)}">Open</button>
              <button class="btn-goto" data-url="${escHtml(post.href)}">Go to</button>
            </div>
          </div>
        `).join('')
      : ''

    app.innerHTML = `
      ${renderHeader({ showAuth: true })}

      ${(() => {
        const platformLower = (p.platform || '').toLowerCase()
        const isTrackedHere = mc && mc.platforms.some(pl => pl.toLowerCase() === platformLower)
        const isTrackedElsewhere = mc && !isTrackedHere
        const otherPlatforms = isTrackedElsewhere ? mc.platforms.map(pl => pl.charAt(0).toUpperCase() + pl.slice(1)).join(', ') : ''
        return `
      <div class="profile-header">
        <div class="profile-header-row">
          <span class="platform-badge ${platformLower}">${p.platform}</span>
          <span class="detected-handle">@${p.handle}</span>
          ${isTrackedHere ? `<span class="competitor-tag">Tracked</span>` : ''}
        </div>
        ${isTrackedHere ? `<div class="profile-meta">${mc.postCount} ${mc.postCount === 1 ? 'post' : 'posts'} tracked</div>` : ''}
        ${isTrackedElsewhere ? `<div class="profile-meta tracked-on">Also tracked on ${otherPlatforms}</div>` : ''}
        ${!state.isOwnProfile && !isTrackedHere ? `
          <button class="btn-track-inline" id="add-competitor-btn" ${state.saving === 'add-competitor' ? 'disabled' : ''} title="Track this account's posts so you can compare performance and spot what works in your niche.">
            ${state.saving === 'add-competitor' ? '<span class="spinner"></span> Adding...' : mc ? `+ Also track on ${p.platform}` : `+ Track @${p.handle} as Competitor`}
            <span class="btn-help">?</span>
          </button>
          ${state.messages.addCompetitor ? `<div class="success-msg">${state.messages.addCompetitor}</div>` : ''}
          ${state.errors.addCompetitor ? `<div class="error-msg">${escHtml(state.errors.addCompetitor)}</div>` : ''}
        ` : ''}
      </div>
      `})()}

      ${state.isOwnProfile ? `
        <div class="profile-actions">
          <button class="btn btn-primary" id="sync-my-videos-btn" ${state.saving === 'syncing-videos' ? 'disabled' : ''} title="Import your latest posts from this profile into your Orianna dashboard for analytics.">
            ${state.saving === 'syncing-videos' ? '<span class="spinner"></span> Syncing...' : '🔄 Sync My Videos'}
            <span class="btn-help">?</span>
          </button>
          ${state.messages.sync ? `<div class="success-msg">${state.messages.sync}</div>` : ''}
          ${state.errors.sync ? `<div class="error-msg">${escHtml(state.errors.sync)}</div>` : ''}
        </div>
      ` : ''}

      <div class="sort-box">
        <div class="sort-controls">
          <span class="sort-label">Sort by</span>
          <select id="sort-by">
            <option value="views" ${sortBy === 'views' ? 'selected' : ''}>Views</option>
            <option value="likes" ${sortBy === 'likes' ? 'selected' : ''}>Likes</option>
            <option value="comments" ${sortBy === 'comments' ? 'selected' : ''}>Comments</option>
          </select>
          <span class="sort-label">Top</span>
          <select id="sort-count">
            <option value="10" ${sortCount === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${sortCount === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${sortCount === 50 ? 'selected' : ''}>50</option>
          </select>
          <button class="btn btn-primary" id="sort-btn" ${state.saving === 'sorting' ? 'disabled' : ''} title="Rank the visible posts on this profile by views, likes, or comments.">
            ${state.saving === 'sorting' ? '<span class="spinner"></span>' : 'Sort'}
          </button>
        </div>

        ${state.errors.sort ? `<div class="error-msg" style="margin-top:6px">${escHtml(state.errors.sort)}</div>` : ''}

        ${state.saving === 'sorting' ? `
          <div class="sort-status">
            ${sortedPosts.length > 0
              ? `Ranking ${sortedPosts.length} so far &middot; still fetching...`
              : `Loading top ${sortCount} by ${sortBy}...`}
          </div>
          <div class="sort-tip" key="${state.currentTipIndex}">${SORT_TIPS[state.currentTipIndex % SORT_TIPS.length]}</div>
        ` : sortedPosts.length > 0 ? `
          <div class="sort-status">
            Showing top ${Math.min(sortCount, sortedPosts.length)} of ${sortedPosts.length} by ${sortBy}
          </div>
        ` : `
          <div class="sort-helper">Click Sort to rank videos by metrics.</div>
        `}
      </div>

      ${state.saving === 'sorting' && sortedPosts.length === 0 ? `
        <div class="sorted-list">
          ${Array.from({ length: Math.min(sortCount, 8) }, (_, i) => `
            <div class="sorted-item skeleton">
              <span class="sorted-rank skeleton-rank">${i + 1}</span>
              <div class="sorted-thumb skeleton-box"></div>
              <div class="sorted-metrics">
                <div class="skeleton-line skeleton-box"></div>
                <div class="skeleton-line short skeleton-box"></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : sortedPosts.length > 0 ? `
        <div class="sorted-list">${listHtml}</div>
        ${state.saving !== 'sorting' ? `
          <div class="sort-export">
            <button class="btn btn-outline" id="export-btn" style="font-size:11px">Export CSV</button>
          </div>
        ` : ''}
      ` : ''}

      ${renderUserBar()}

    `

    // Wire events
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout)
    wireFocusToggle()
    document.getElementById('sync-my-videos-btn')?.addEventListener('click', handleSyncMyVideos)
    document.getElementById('add-competitor-btn')?.addEventListener('click', handleAddCompetitor)
    document.getElementById('sort-btn')?.addEventListener('click', handleSort)
    document.getElementById('export-btn')?.addEventListener('click', handleExportCSV)

    // Open in background tab
    document.querySelectorAll('.btn-open[data-url]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        chrome.tabs.create({ url: btn.dataset.url, active: false })
      })
    })
    // Go to tab (foreground)
    document.querySelectorAll('.btn-goto[data-url]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        chrome.tabs.create({ url: btn.dataset.url, active: true })
      })
    })

    return
  }

  // ─── Video View (main) ────────────────────────────────────────────────

  const p = state.postData
  const hasPost = !!p
  const mc = state.matchedCompetitor

  app.innerHTML = `
    ${renderHeader({ showAuth: true })}

    ${hasPost ? `
      <div class="detected">
        <div class="detected-row">
          <span class="platform-badge ${(p.platform || '').toLowerCase()}">${p.platform}</span>
          <span class="detected-handle">@${p.handle || 'unknown'}</span>
          ${mc ? '<span class="competitor-tag">Tracked</span>' : ''}
        </div>
        ${p.caption ? `<div class="detected-caption">${escHtml(p.caption)}</div>` : ''}
        ${(p.views != null || p.likes != null) ? (() => {
          const eng = p.views > 0 ? (((p.likes || 0) + (p.comments || 0) + (p.shares || 0)) / p.views * 100).toFixed(1) : null
          return `
          <div class="stats-row">
            ${p.views != null ? `<div>👁 <span class="stat-num">${fmt(p.views)}</span> <span class="stat-label">views</span></div>` : ''}
            ${p.likes != null ? `<div>❤️ <span class="stat-num">${fmt(p.likes)}</span> <span class="stat-label">likes</span></div>` : ''}
            ${p.comments != null ? `<div>💬 <span class="stat-num">${fmt(p.comments)}</span> <span class="stat-label">comments</span></div>` : ''}
            ${p.shares != null ? `<div>📤 <span class="stat-num">${fmt(p.shares)}</span> <span class="stat-label">shares</span></div>` : ''}
            ${p.saves != null ? `<div>🔖 <span class="stat-num">${fmt(p.saves)}</span> <span class="stat-label">saves</span></div>` : ''}
            ${eng != null ? `<div>⚡ <span class="stat-num stat-eng">${eng}%</span> <span class="stat-label">eng</span></div>` : ''}
          </div>`
        })() : ''}
      </div>
      <div class="actions">
        <div class="save-row">
          <button class="btn btn-primary save-main-btn" id="inspiration-btn" ${state.saving ? 'disabled' : ''} title="Save this video to your Inspo board so you can study what works and turn it into your own idea later.">
            ${state.saving === 'inspiration' ? '<span class="spinner"></span> Saving...' : '💾 Save as Inspiration'}
            <span class="btn-help">?</span>
          </button>
          <button class="tag-dropdown-btn" id="tag-dropdown-btn" title="Add tags">🏷️ ▾</button>
        </div>
        ${state.selectedTags.length > 0 ? `
          <div class="selected-tags-row">
            ${state.selectedTags.map(t => `<span class="tag-pill">${escHtml(t)} <span class="tag-remove" data-tag="${escHtml(t)}">×</span></span>`).join('')}
          </div>
        ` : ''}
        ${state.showTagDropdown ? `
          <div class="tag-dropdown-panel" id="tag-dropdown-panel">
            ${state.allTags.length > 0 ? `
              <div class="tag-list">
                ${state.allTags.map(t => `
                  <div class="tag-option-row">
                    <button class="tag-option ${state.selectedTags.includes(t) ? 'active' : ''}" data-tag="${escHtml(t)}">
                      ${state.selectedTags.includes(t) ? '✓ ' : ''}${escHtml(t)}
                    </button>
                    <button class="tag-delete-btn" data-delete-tag="${escHtml(t)}" title="Delete tag">×</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            <div class="tag-new-row">
              <input id="new-tag-input" type="text" placeholder="New tag..." />
              <button class="tag-add-btn" id="add-tag-btn">+</button>
            </div>
          </div>
        ` : ''}
        ${state.showDuplicatePrompt ? `
          <div class="competitor-prompt">
            <div class="competitor-prompt-text">This post was already saved. What would you like to do?</div>
            <div class="competitor-prompt-actions">
              <button class="btn-prompt-yes" id="dup-replace-btn">Replace Old</button>
              <button class="btn-prompt-no" id="dup-keep-btn">Keep Both</button>
            </div>
          </div>
        ` : ''}
        ${state.messages.inspiration ? `<div class="success-msg">${state.messages.inspiration} — <a href="${ORIANNA_URL}/dashboard/inspo" target="_blank" style="color:#818cf8;text-decoration:underline;font-size:11px">View in Inspo</a></div>` : ''}
        ${state.errors.inspiration ? `<div class="error-msg">${escHtml(state.errors.inspiration)}</div>` : ''}

        <button class="btn btn-secondary-alt" id="create-inspo-btn" ${state.saving ? 'disabled' : ''} title="Turn this video into a content idea on your Ideas board — describe what you'd do differently.">
          ${state.saving === 'create-inspo' ? '<span class="spinner"></span> Saving...' : '✨ Create from Inspo'}
          <span class="btn-help">?</span>
        </button>
        ${state.showCreateInspo ? `
          <div class="create-inspo-panel">
            ${state.createInspoItems.map((item, i) => `
              <div class="create-inspo-row">
                <textarea class="create-inspo-input" data-index="${i}"
                  placeholder="What is the video about?"
                  rows="1">${escHtml(item)}</textarea>
                ${state.createInspoItems.length > 1 ? `<button class="create-inspo-remove" data-index="${i}">&times;</button>` : ''}
              </div>
            `).join('')}
            ${state.createInspoTags.length > 0 ? `
              <div class="selected-tags-row">
                ${state.createInspoTags.map(t => `<span class="tag-pill">${escHtml(t)} <span class="create-inspo-tag-remove" data-citag="${escHtml(t)}">×</span></span>`).join('')}
              </div>
            ` : ''}
            ${state.showCreateInspoTagDropdown ? `
              <div class="tag-dropdown-panel" id="create-inspo-tag-panel">
                ${state.allTags.length > 0 ? `
                  <div class="tag-list">
                    ${state.allTags.map(t => `
                      <button class="ci-tag-option ${state.createInspoTags.includes(t) ? 'active' : ''}" data-citag="${escHtml(t)}">
                        ${state.createInspoTags.includes(t) ? '✓ ' : ''}${escHtml(t)}
                      </button>
                    `).join('')}
                  </div>
                ` : ''}
                <div class="tag-new-row">
                  <input id="ci-new-tag-input" type="text" placeholder="New tag..." />
                  <button class="tag-add-btn" id="ci-add-tag-btn">+</button>
                </div>
              </div>
            ` : ''}
            <div class="create-inspo-actions">
              <button class="btn-text" id="add-another-btn">+ Add another</button>
              <div class="save-row ci-save-row">
                <button class="btn-prompt-yes save-main-btn" id="save-inspo-btn"
                  ${state.saving === 'create-inspo' ? 'disabled' : ''}>
                  ${state.saving === 'create-inspo' ? '<span class="spinner"></span>' : 'Save'}
                </button>
                <button class="tag-dropdown-btn" id="create-inspo-tag-btn" title="Add tags">🏷️ ▾</button>
              </div>
            </div>
          </div>
        ` : ''}
        ${state.messages.createInspo ? `<div class="success-msg">${state.messages.createInspo} — <a href="${ORIANNA_URL}/dashboard/ideas" target="_blank" style="color:#818cf8;text-decoration:underline;font-size:11px">View Ideas</a></div>` : ''}
        ${state.errors.createInspo ? `<div class="error-msg">${escHtml(state.errors.createInspo)}</div>` : ''}

        <button class="btn btn-secondary" id="download-btn" ${state.saving ? 'disabled' : ''} title="Download this video to your device — no watermark.">
          ${state.saving === 'download' ? '<span class="spinner"></span> Downloading...' : '⬇️ Download'}
          <span class="btn-help">?</span>
        </button>
        ${state.messages.download ? `<div class="success-msg">${escHtml(state.messages.download)}</div>` : ''}
        ${state.errors.download ? `<div class="error-msg">${escHtml(state.errors.download)}</div>` : ''}

      </div>

    ` : `
      <div class="no-post">
        <span style="font-size:20px;display:block;margin-bottom:6px">✦</span>
        Open any TikTok or Instagram post<br>to capture, analyze, or download it
      </div>
    `}

    ${renderUserBar()}
  `

  wireFocusToggle()
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout)

  if (hasPost) {
    document.getElementById('inspiration-btn')?.addEventListener('click', () => handleSaveInspiration())
    document.getElementById('tag-dropdown-btn')?.addEventListener('click', () => setState({ showTagDropdown: !state.showTagDropdown }))
    document.getElementById('download-btn')?.addEventListener('click', handleDownload)
    document.getElementById('dup-replace-btn')?.addEventListener('click', () => handleSaveInspiration('replace'))
    document.getElementById('dup-keep-btn')?.addEventListener('click', () => handleSaveInspiration('keep'))
    document.getElementById('add-tag-btn')?.addEventListener('click', addNewTag)
    document.getElementById('new-tag-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addNewTag() })
    document.querySelectorAll('.tag-option').forEach(btn => {
      btn.addEventListener('click', () => toggleTag(btn.dataset.tag))
    })
    document.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); toggleTag(btn.dataset.tag) })
    })
    document.querySelectorAll('.tag-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const tag = btn.dataset.deleteTag
        if (!tag || !confirm(`Delete tag "${tag}"? It will be removed from all posts.`)) return
        const updated = state.allTags.filter(t => t !== tag)
        setState({ allTags: updated, selectedTags: state.selectedTags.filter(t => t !== tag) })
        chrome.storage.local.set({ inspoTags: updated })
        chrome.runtime.sendMessage({ type: 'DELETE_TAG', tag })
      })
    })
    // Create from Inspo
    document.getElementById('create-inspo-btn')?.addEventListener('click', () => {
      const opening = !state.showCreateInspo
      const patch = { showCreateInspo: opening }
      // Carry over any tags selected in the main tag picker
      if (opening && state.selectedTags.length > 0) {
        // Merge main picker tags into create-inspo tags (avoid duplicates)
        const merged = [...new Set([...state.createInspoTags, ...state.selectedTags])]
        patch.createInspoTags = merged
      }
      setState(patch)
    })
    document.getElementById('add-another-btn')?.addEventListener('click', () => {
      setState({ createInspoItems: [...state.createInspoItems, ''] })
    })
    document.getElementById('save-inspo-btn')?.addEventListener('click', handleCreateInspo)
    document.querySelectorAll('.create-inspo-input').forEach(input => {
      // Auto-resize textarea to fit content
      function autoResize() {
        input.style.height = 'auto'
        input.style.height = input.scrollHeight + 'px'
      }
      autoResize()
      input.addEventListener('input', (e) => {
        autoResize()
        const items = [...state.createInspoItems]
        items[parseInt(e.target.dataset.index)] = e.target.value
        state.createInspoItems = items
      })
    })
    document.querySelectorAll('.create-inspo-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const items = state.createInspoItems.filter((_, i) => i !== parseInt(btn.dataset.index))
        setState({ createInspoItems: items.length ? items : [''] })
      })
    })
    // Create from Inspo — tag picker
    document.getElementById('create-inspo-tag-btn')?.addEventListener('click', () => {
      setState({ showCreateInspoTagDropdown: !state.showCreateInspoTagDropdown })
    })
    document.querySelectorAll('.ci-tag-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.citag
        const tags = state.createInspoTags.includes(tag)
          ? state.createInspoTags.filter(t => t !== tag)
          : [...state.createInspoTags, tag]
        setState({ createInspoTags: tags })
      })
    })
    document.querySelectorAll('.create-inspo-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        setState({ createInspoTags: state.createInspoTags.filter(t => t !== btn.dataset.citag) })
      })
    })
    document.getElementById('ci-add-tag-btn')?.addEventListener('click', addCreateInspoTag)
    document.getElementById('ci-new-tag-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCreateInspoTag() })
  }
}

// Start
init()
