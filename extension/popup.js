// Orianna popup script

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwb3dldGtrbXBwYWZmcWJndnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY2MTYsImV4cCI6MjA4ODMyMjYxNn0.fpFGFag1jQrP7ZWYlRgILOC7LuAg8nCDZTGGPciGkCM' // set this
const ORIANNA_URL = 'https://ori-nine.vercel.app'

const app = document.getElementById('app')

// ─── State ──────────────────────────────────────────────────────────────────

let state = {
  auth: null,         // { isLoggedIn, email }
  postData: null,     // extracted from content script
  competitors: [],    // from API
  selectedCompetitor: '',
  view: 'loading',   // 'loading' | 'login' | 'main' | 'ideas'
  ideas: [],
  saving: null,       // 'swipe' | 'competitor' | 'ideas' | null
  messages: {},       // { swipe?: string, competitor?: string, ideas?: string }
  errors: {},
}

function setState(patch) {
  state = { ...state, ...patch }
  render()
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Check auth
  const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' })
  if (!auth.isLoggedIn) {
    setState({ view: 'login', auth })
    return
  }
  setState({ auth })

  // 2. Get page data from content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let postData = null
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' })
    postData = result?.data ?? null
  } catch {}

  // 3. Load context (competitors list)
  let competitors = []
  try {
    const ctx = await chrome.runtime.sendMessage({ type: 'GET_CONTEXT' })
    competitors = ctx.competitors ?? []
  } catch {}

  setState({
    view: 'main',
    postData,
    competitors,
    selectedCompetitor: competitors[0]?.handle ?? '',
  })
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function handleLogin(email, password) {
  setState({ errors: { login: null }, saving: 'login' })
  const result = await chrome.runtime.sendMessage({
    type: 'LOGIN',
    email,
    password,
    anonKey: SUPABASE_ANON_KEY,
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

async function handleSaveSwipe() {
  if (!state.postData) return
  setState({ saving: 'swipe', errors: {}, messages: {} })
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_POST',
    payload: { type: 'swipe', ...state.postData },
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { swipe: result.error } })
  else setState({ messages: { swipe: '✓ Saved to Swipe File' } })
}

async function handleSaveCompetitor() {
  if (!state.postData) return
  setState({ saving: 'competitor', errors: {}, messages: {} })
  const handle = state.selectedCompetitor || state.postData.handle
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_POST',
    payload: { type: 'competitor', competitorHandle: handle, ...state.postData },
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { competitor: result.error } })
  else setState({ messages: { competitor: '✓ Saved to Competitors' } })
}

async function handleGetIdeas() {
  if (!state.postData) return
  setState({ saving: 'ideas', errors: {}, messages: {} })
  const result = await chrome.runtime.sendMessage({
    type: 'GET_IDEAS',
    postData: state.postData,
  })
  setState({ saving: null })
  if (result.error) setState({ errors: { ideas: result.error } })
  else setState({ view: 'ideas', ideas: result.ideas ?? [] })
}

// ─── Render ───────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

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
    const ideasHtml = state.ideas.map((idea, i) => `
      <div class="idea-item">
        <div class="idea-num">Idea ${i + 1}</div>
        <div class="idea-text">${escHtml(idea.idea)}</div>
        ${idea.hook_idea ? `<div class="idea-hook">"${escHtml(idea.hook_idea)}"</div>` : ''}
      </div>
    `).join('')

    app.innerHTML = `
      <div class="header">
        <span class="logo">Orianna</span>
        <span class="user-email">${state.auth?.email ?? ''}</span>
      </div>
      <div class="ideas-result">
        <h3>✓ ${state.ideas.length} ideas saved to Orianna</h3>
        ${ideasHtml}
        <a href="${ORIANNA_URL}/dashboard/ideas" target="_blank" class="btn btn-link">Open Ideas Board →</a>
        <button class="btn btn-outline" id="back-btn" style="margin-top:6px">← Back</button>
      </div>
    `
    document.getElementById('back-btn').addEventListener('click', () => setState({ view: 'main' }))
    return
  }

  // Main view
  const p = state.postData
  const hasPost = !!p

  const detectedHtml = hasPost ? `
    <div class="detected">
      <div class="detected-label">Detected post</div>
      <div class="detected-platform">
        <span class="platform-badge">${p.platform}</span>
        ${p.handle ? `<span class="detected-handle">@${p.handle}</span>` : ''}
      </div>
      ${(p.views || p.likes || p.comments) ? `
        <div class="stats-row">
          ${p.views != null ? `<div class="stat"><div class="stat-num">${fmt(p.views)}</div><div class="stat-label">views</div></div>` : ''}
          ${p.likes != null ? `<div class="stat"><div class="stat-num">${fmt(p.likes)}</div><div class="stat-label">likes</div></div>` : ''}
          ${p.comments != null ? `<div class="stat"><div class="stat-num">${fmt(p.comments)}</div><div class="stat-label">comments</div></div>` : ''}
          ${p.shares != null ? `<div class="stat"><div class="stat-num">${fmt(p.shares)}</div><div class="stat-label">shares</div></div>` : ''}
        </div>
      ` : ''}
      ${p.caption ? `<div class="detected-caption">${escHtml(p.caption)}</div>` : ''}
      ${p.audio ? `<div class="audio-row">♪ ${escHtml(p.audio)}</div>` : ''}
    </div>
  ` : `
    <div class="no-post">
      Navigate to a TikTok, Instagram Reel, or YouTube video to capture it.
    </div>
  `

  const competitorOptions = state.competitors
    .map(c => `<option value="${c.handle}" ${state.selectedCompetitor === c.handle ? 'selected' : ''}>@${c.handle} (${c.platform})</option>`)
    .join('')

  app.innerHTML = `
    <div class="header">
      <span class="logo">Orianna</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="user-email">${state.auth?.email ?? ''}</span>
        <button class="logout-btn" id="logout-btn">Sign out</button>
      </div>
    </div>

    ${detectedHtml}

    ${hasPost ? `
      <div class="actions">
        <button class="btn btn-outline" id="swipe-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'swipe' ? '<span class="spinner"></span> Saving...' : '+ Save to Swipe File'}
        </button>
        ${state.messages.swipe ? `<div class="success-msg">${state.messages.swipe}</div>` : ''}
        ${state.errors.swipe ? `<div class="error-msg">${state.errors.swipe}</div>` : ''}

        <div class="divider"></div>

        <div class="competitor-row">
          <span class="competitor-label">Competitor:</span>
          <select id="competitor-select" style="flex:1">
            ${competitorOptions}
            <option value="__custom__">Enter handle...</option>
          </select>
        </div>
        <div id="custom-handle-wrap" style="display:none">
          <input id="custom-handle" type="text" placeholder="@handle (without @)" />
        </div>
        <button class="btn btn-outline" id="competitor-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'competitor' ? '<span class="spinner"></span> Saving...' : '+ Track as Competitor Post'}
        </button>
        ${state.messages.competitor ? `<div class="success-msg">${state.messages.competitor}</div>` : ''}
        ${state.errors.competitor ? `<div class="error-msg">${state.errors.competitor}</div>` : ''}

        <div class="divider"></div>

        <button class="btn btn-ai" id="ideas-btn" ${state.saving ? 'disabled' : ''}>
          ${state.saving === 'ideas' ? '<span class="spinner"></span> Generating ideas...' : '✦ Get Video Ideas'}
        </button>
        ${state.errors.ideas ? `<div class="error-msg">${state.errors.ideas}</div>` : ''}
      </div>
    ` : ''}
  `

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout)

  if (hasPost) {
    document.getElementById('swipe-btn')?.addEventListener('click', handleSaveSwipe)
    document.getElementById('competitor-btn')?.addEventListener('click', handleSaveCompetitor)
    document.getElementById('ideas-btn')?.addEventListener('click', handleGetIdeas)

    const select = document.getElementById('competitor-select')
    const customWrap = document.getElementById('custom-handle-wrap')
    select?.addEventListener('change', (e) => {
      if (e.target.value === '__custom__') {
        customWrap.style.display = 'block'
        setState({ selectedCompetitor: '' })
      } else {
        customWrap.style.display = 'none'
        setState({ selectedCompetitor: e.target.value })
      }
    })

    document.getElementById('custom-handle')?.addEventListener('input', (e) => {
      setState({ selectedCompetitor: e.target.value.replace('@', '') })
    })
  }
}

function escHtml(str) {
  return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Start
init()
