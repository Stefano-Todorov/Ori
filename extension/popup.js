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
  sortedPosts: [],
  sortBy: 'views',
  sortCount: 25,
  bookmarkPosts: [],
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
    allTags = ctx.allTags ?? []
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
  setState({ messages: { inspiration: force === 'replace' ? 'Replaced' : 'Saved' }, selectedTags: [] })
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
    setState({ allTags: [...state.allTags, tag].sort() })
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

async function handleDownload() {
  if (!state.postData?.url) return
  setState({ saving: 'download', errors: {} })

  let directUrl = null
  // Instagram: get direct video URL from content script (has user's IG cookies)
  if (state.postData.platform === 'instagram' && state.postData.shortcode) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const igResult = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_IG_VIDEO_URL',
        shortcode: state.postData.shortcode,
      })
      directUrl = igResult?.videoUrl ?? null
    } catch {}
  }

  const result = await chrome.runtime.sendMessage({
    type: 'DOWNLOAD_VIDEO',
    url: state.postData.url,
    videoSrc: state.postData.videoSrc,
    directUrl,
    handle: state.postData.handle,
    platform: state.postData.platform,
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { download: result.error } })
  else if (result.openedSite) setState({ messages: { ...state.messages, download: 'Opened downloader site — paste the link there' } })
  else setState({ messages: { ...state.messages, download: 'Download started' } })
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

function toggleBookmarkPost(index) {
  const posts = [...state.bookmarkPosts]
  posts[index] = { ...posts[index], checked: !posts[index].checked }
  setState({ bookmarkPosts: posts })
}

function selectAllBookmarks() {
  setState({ bookmarkPosts: state.bookmarkPosts.map(p => ({ ...p, checked: true })) })
}

function deselectAllBookmarks() {
  setState({ bookmarkPosts: state.bookmarkPosts.map(p => ({ ...p, checked: false })) })
}

async function handleBulkImport() {
  const selected = state.bookmarkPosts.filter(p => p.checked)
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
    setState({
      messages: { addCompetitor: `@${state.postData.handle} added as competitor` },
      matchedCompetitor: { handle: state.postData.handle, platforms: [state.postData.platform], postCount: 0 },
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
      <div class="header"><span class="logo">Orianna</span></div>
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
        <span class="logo">Orianna</span>
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
    const posts = state.bookmarkPosts
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
        <span class="logo">Orianna</span>
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
          <button class="btn-text" id="select-all-btn">Select all</button>
          <button class="btn-text" id="deselect-all-btn">Deselect all</button>
          <span class="bookmark-count">${checkedCount} of ${posts.length} selected</span>
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
        <span class="logo">Orianna</span>
        <div class="header-right">
          <span class="user-email">${state.auth?.email ?? ''}</span>
          <button class="logout-btn" id="logout-btn">Sign out</button>
        </div>
      </div>

      <div class="profile-header">
        <span class="platform-badge ${(p.platform || '').toLowerCase()}">${p.platform}</span>
        <span class="detected-handle">@${p.handle}</span>
        ${mc ? `<span class="competitor-tag">Tracked</span>` : ''}
        ${mc ? `<span style="font-size:10px;color:#3f3f46;margin-left:auto">${mc.postCount} tracked</span>` : ''}
      </div>

      ${!mc ? `
        <div class="profile-actions">
          <button class="btn btn-outline" id="add-competitor-btn" ${state.saving === 'add-competitor' ? 'disabled' : ''}>
            ${state.saving === 'add-competitor' ? '<span class="spinner"></span> Adding...' : `Track @${p.handle} as Competitor`}
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
      <span class="logo">Orianna</span>
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
                  <button class="tag-option ${state.selectedTags.includes(t) ? 'active' : ''}" data-tag="${escHtml(t)}">
                    ${state.selectedTags.includes(t) ? '✓ ' : ''}${escHtml(t)}
                  </button>
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

        <button class="btn btn-secondary" id="ideas-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'ideas' ? '<span class="spinner"></span> Generating...' : '🎬 Get Video Idea'}
        </button>
        ${state.errors.ideas ? `<div class="error-msg">${state.errors.ideas}</div>` : ''}

        <button class="btn btn-outline" id="analyze-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'analyze' ? '<span class="spinner"></span> Analyzing...' : '💡 Why Did It Do Well?'}
        </button>
        ${state.errors.analyze ? `<div class="error-msg">${state.errors.analyze}</div>` : ''}

        <button class="btn btn-ghost" id="download-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'download' ? '<span class="spinner"></span> Downloading...' : '⬇️ Download Video'}
        </button>
        ${state.messages.download ? `<div class="success-msg">${state.messages.download}</div>` : ''}
        ${state.errors.download ? `<div class="error-msg">${state.errors.download}</div>` : ''}
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
    document.getElementById('download-btn')?.addEventListener('click', handleDownload)
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
  }
}

// Start
init()
