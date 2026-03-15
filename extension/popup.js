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
}

function setState(patch) {
  state = { ...state, ...patch }
  render()
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' })
  if (!auth.isLoggedIn) {
    setState({ view: 'login', auth })
    return
  }

  // Load "don't ask again" preference
  const stored = await chrome.storage.local.get(['dontAskCompetitor'])
  const dontAskCompetitor = stored.dontAskCompetitor ?? false

  setState({ auth, dontAskCompetitor })

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const isSupportedUrl = tab?.url && (tab.url.includes('tiktok.com') || tab.url.includes('instagram.com'))

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
  try {
    const ctx = await chrome.runtime.sendMessage({ type: 'GET_CONTEXT' })
    competitors = ctx.competitors ?? []
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

  setState({ view, postData, competitors, matchedCompetitor, allTags })
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

async function handleAnalyze() {
  if (!state.postData) return
  setState({ saving: 'analyze', errors: {}, analysis: null })
  const result = await chrome.runtime.sendMessage({
    type: 'ANALYZE_POST', postData: state.postData,
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { analyze: result.error } })
  else setState({ analysis: result.analysis ?? '' })
}

async function handleOpenPost() {
  if (!state.postData?.url) return
  await chrome.runtime.sendMessage({
    type: 'OPEN_VIDEO',
    url: state.postData.url,
  })
}

async function handleGetIdeas() {
  if (!state.postData) return
  setState({ saving: 'ideas', errors: {}, messages: {} })
  const result = await chrome.runtime.sendMessage({
    type: 'GET_IDEAS', postData: state.postData, count: 1,
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { ideas: result.error } })
  else setState({ view: 'ideas', ideas: result.ideas ?? [] })
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

async function handleSort() {
  const sortBy = document.getElementById('sort-by')?.value ?? 'views'
  const sortCount = parseInt(document.getElementById('sort-count')?.value ?? '25')
  setState({ saving: 'sorting', errors: {}, sortBy, sortCount })

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SORTED_METRICS', sortBy })
    if (result.error) {
      setState({ saving: null, errors: { sort: result.error } })
    } else {
      setState({ saving: null, sortedPosts: result.posts ?? [] })
    }
  } catch (err) {
    setState({ saving: null, errors: { sort: 'Could not fetch metrics from page' } })
  }
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
    app.innerHTML = `
      <div class="header"><span class="logo"><svg class="logo-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#ls)"/></svg>Orianna</span></div>
      <div class="login-section">
        <h2>Sign in to Orianna</h2>
        <p>Use your Orianna account credentials</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="email" type="email" placeholder="Email" />
          <input id="password" type="password" placeholder="Password" />
          ${state.errors.login ? `<div class="error-msg">${state.errors.login}</div>` : ''}
          <button class="btn btn-primary" id="login-btn" ${state.saving === 'login' ? 'disabled' : ''}>
            ${state.saving === 'login' ? '<span class="spinner"></span>' : 'Sign in'}
          </button>
        </div>
      </div>
      <div class="footer-links">
        <a href="https://ori-nine.vercel.app/legal/privacy" target="_blank">Privacy</a>
        <span class="dot">&middot;</span>
        <a href="https://ori-nine.vercel.app/legal/terms" target="_blank">Terms</a>
      </div>
    `
    document.getElementById('login-btn').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim()
      const password = document.getElementById('password').value
      if (email && password) handleLogin(email, password)
    })
    document.getElementById('password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('login-btn').click()
    })
    return
  }

  if (state.view === 'ideas') {
    const idea = state.ideas[0]

    app.innerHTML = `
      <div class="header">
        <span class="logo"><svg class="logo-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#ls)"/></svg>Orianna</span>
        <span class="user-email">${state.auth?.email ?? ''}</span>
      </div>
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
    `
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
      <div class="header">
        <span class="logo"><svg class="logo-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#ls)"/></svg>Orianna</span>
        <div class="header-right">
          <span class="user-email">${state.auth?.email ?? ''}</span>
          <button class="logout-btn" id="logout-btn">Sign out</button>
        </div>
      </div>

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
          <button class="btn btn-primary" id="import-btn" ${state.saving === 'bulk-import' || checkedCount === 0 ? 'disabled' : ''}>
            ${state.saving === 'bulk-import' ? '<span class="spinner"></span> Importing...' : `Import ${checkedCount} as Inspo`}
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
    `

    document.getElementById('logout-btn')?.addEventListener('click', handleLogout)
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
            ${post.thumb ? `<img class="sorted-thumb" src="${post.thumb}" />` : `<div class="sorted-thumb"></div>`}
            <div class="sorted-metrics">
              <div class="sorted-metric-row">
                ${post.views != null ? `<span class="${sortBy === 'views' ? 'primary' : 'val'}">👁 ${fmt(post.views)}</span>` : ''}
                ${post.likes != null ? `<span class="${sortBy === 'likes' ? 'primary' : 'val'}">❤️ ${fmt(post.likes)}</span>` : ''}
                ${post.comments != null ? `<span class="${sortBy === 'comments' ? 'primary' : 'val'}">💬 ${fmt(post.comments)}</span>` : ''}
              </div>
              <div class="sorted-url">${post.href.replace(/https?:\/\/(www\.)?(instagram|tiktok)\.com/, '')}</div>
            </div>
            <div class="sorted-actions">
              <button class="btn-open" data-url="${escHtml(post.href)}">Open</button>
              <button class="btn-goto" data-url="${escHtml(post.href)}">Go to</button>
            </div>
          </div>
        `).join('')
      : ''

    app.innerHTML = `
      <div class="header">
        <span class="logo"><svg class="logo-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#ls)"/></svg>Orianna</span>
        <div class="header-right">
          <span class="user-email">${state.auth?.email ?? ''}</span>
          <button class="logout-btn" id="logout-btn">Sign out</button>
        </div>
      </div>

      <div class="profile-header">
        <span class="platform-badge ${(p.platform || '').toLowerCase()}">${p.platform}</span>
        <span class="detected-handle">@${p.handle}</span>
        ${mc && mc.platforms.some(pl => pl.toLowerCase() === (p.platform || '').toLowerCase()) ? `<span class="competitor-tag">Tracked</span>` : ''}
        ${mc && mc.platforms.some(pl => pl.toLowerCase() === (p.platform || '').toLowerCase()) ? `<span style="font-size:10px;color:#3f3f46;margin-left:auto">${mc.postCount} tracked</span>` : ''}
        ${mc && !mc.platforms.some(pl => pl.toLowerCase() === (p.platform || '').toLowerCase()) ? `<span style="font-size:10px;color:#a78bfa;margin-left:auto">Tracked on ${mc.platforms.map(pl => pl.charAt(0).toUpperCase() + pl.slice(1)).join(', ')}</span>` : ''}
      </div>

      ${!mc || !mc.platforms.some(pl => pl.toLowerCase() === (p.platform || '').toLowerCase()) ? `
        <div class="profile-actions">
          <button class="btn btn-outline" id="add-competitor-btn" ${state.saving === 'add-competitor' ? 'disabled' : ''}>
            ${state.saving === 'add-competitor' ? '<span class="spinner"></span> Adding...' : mc ? `Also track on ${p.platform}` : `Track @${p.handle} as Competitor`}
          </button>
          ${state.messages.addCompetitor ? `<div class="success-msg">${state.messages.addCompetitor}</div>` : ''}
          ${state.errors.addCompetitor ? `<div class="error-msg">${state.errors.addCompetitor}</div>` : ''}
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
          <button class="btn btn-primary" id="sort-btn" ${state.saving === 'sorting' ? 'disabled' : ''}>
            ${state.saving === 'sorting' ? '<span class="spinner"></span>' : 'Sort'}
          </button>
        </div>

        ${state.errors.sort ? `<div class="error-msg" style="margin-top:6px">${state.errors.sort}</div>` : ''}

        ${sortedPosts.length > 0 ? `
          <div class="sort-status">
            Showing top ${Math.min(sortCount, sortedPosts.length)} of ${sortedPosts.length} by ${sortBy}
          </div>
        ` : `
          <div class="sort-helper">Click Sort to rank videos by metrics.</div>
        `}
      </div>

      ${sortedPosts.length > 0 ? `
        <div class="sorted-list">${listHtml}</div>
        <div class="sort-export">
          <button class="btn btn-outline" id="export-btn" style="font-size:11px">Export CSV</button>
        </div>
      ` : ''}
    `

    // Wire events
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout)
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
    <div class="header">
      <span class="logo"><svg class="logo-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#ls)"/></svg>Orianna</span>
      <div class="header-right">
        <span class="user-email">${state.auth?.email ?? ''}</span>
        <button class="logout-btn" id="logout-btn">Sign out</button>
      </div>
    </div>

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
          <button class="btn btn-primary save-main-btn" id="inspiration-btn" ${state.saving ? 'disabled' : ''}>
            ${state.saving === 'inspiration' ? '<span class="spinner"></span> Saving...' : '💾 Save as Inspiration'}
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
        ${state.errors.inspiration ? `<div class="error-msg">${state.errors.inspiration}</div>` : ''}

        <button class="btn btn-secondary-alt" id="create-inspo-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'create-inspo' ? '<span class="spinner"></span> Saving...' : '✨ Create from Inspo'}
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
        ${state.errors.createInspo ? `<div class="error-msg">${state.errors.createInspo}</div>` : ''}

        <button class="btn btn-secondary" id="ideas-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'ideas' ? '<span class="spinner"></span> Generating...' : '🎬 Generate Video Idea'}
        </button>
        ${state.errors.ideas ? `<div class="error-msg">${state.errors.ideas}</div>` : ''}

        <button class="btn btn-outline" id="analyze-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'analyze' ? '<span class="spinner"></span> Analyzing...' : '💡 Why Did It Do Well?'}
        </button>
        ${state.errors.analyze ? `<div class="error-msg">${state.errors.analyze}</div>` : ''}

      </div>

      ${state.analysis ? `
        <div class="analysis-result">
          <div class="analysis-title">Why it performed well</div>
          <div class="analysis-text">${state.analysis.split('\n').map(line => {
            const l = line.trim()
            if (!l) return ''
            return `<div class="analysis-bullet">${l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>`
          }).join('')}</div>
        </div>
      ` : ''}
    ` : `
      <div class="no-post">
        Navigate to a TikTok or Instagram video to capture it.
      </div>
    `}
  `

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout)

  if (hasPost) {
    document.getElementById('inspiration-btn')?.addEventListener('click', () => handleSaveInspiration())
    document.getElementById('tag-dropdown-btn')?.addEventListener('click', () => setState({ showTagDropdown: !state.showTagDropdown }))
    document.getElementById('ideas-btn')?.addEventListener('click', handleGetIdeas)
    document.getElementById('analyze-btn')?.addEventListener('click', handleAnalyze)
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
