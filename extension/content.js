// Orianna content script — extracts post data from TikTok, Instagram, YouTube

function parseNumber(str) {
  if (!str) return null
  const s = str.replace(/,/g, '').trim()
  const match = s.match(/^([\d.]+)\s*([KMBkmb]?)/)
  if (!match) return null
  const num = parseFloat(match[1])
  const suffix = match[2].toUpperCase()
  if (suffix === 'K') return Math.round(num * 1_000)
  if (suffix === 'M') return Math.round(num * 1_000_000)
  if (suffix === 'B') return Math.round(num * 1_000_000_000)
  return Math.round(num)
}

function trySelectors(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el && el.textContent.trim()) return el.textContent.trim()
    } catch {}
  }
  return null
}

function extractHashtags(text) {
  if (!text) return []
  const matches = text.match(/#[\w\u00C0-\u024F\u0400-\u04FF]+/g) ?? []
  return matches.map(h => h.slice(1))
}

// ─── TikTok Video ─────────────────────────────────────────────────────────

function extractTikTok() {
  const url = window.location.href
  if (!url.includes('/video/') && !url.includes('/photo/')) return null

  const caption = trySelectors([
    '[data-e2e="browse-video-desc"]',
    '[data-e2e="video-desc"]',
    '.tt-video-meta-caption',
    '[class*="DivVideoDescContainer"] span',
    'h1[data-e2e="video-title"]',
  ])

  const viewsRaw = trySelectors([
    '[data-e2e="video-views"]',
    'strong[data-e2e="video-views"]',
    '[class*="StrongVideoCount"]',
  ])

  const likesRaw = trySelectors([
    '[data-e2e="like-count"]',
    'strong[data-e2e="like-count"]',
  ])

  const commentsRaw = trySelectors([
    '[data-e2e="comment-count"]',
    'strong[data-e2e="comment-count"]',
  ])

  const sharesRaw = trySelectors([
    '[data-e2e="share-count"]',
    'strong[data-e2e="share-count"]',
  ])

  const savesRaw = trySelectors([
    '[data-e2e="undefined-count"]',
    '[data-e2e="collect-count"]',
  ])

  const handleMatch = url.match(/tiktok\.com\/@([^/?]+)/)
  const handle = handleMatch?.[1] ?? trySelectors([
    '[data-e2e="browse-username"]',
    '[data-e2e="video-author-uniqueid"]',
    'a[href*="/@"] span',
  ])

  const audio = trySelectors([
    '[data-e2e="browse-music"]',
    '[data-e2e="video-music"]',
    'a[href*="/music/"]',
    '[class*="DivMusicInfo"] span',
  ])

  const videoEl = document.querySelector('video')
  const duration = videoEl ? Math.round(videoEl.duration) || null : null

  return {
    pageType: 'video',
    platform: 'tiktok',
    url,
    handle,
    caption,
    hashtags: extractHashtags(caption),
    views: parseNumber(viewsRaw),
    likes: parseNumber(likesRaw),
    comments: parseNumber(commentsRaw),
    shares: parseNumber(sharesRaw),
    saves: parseNumber(savesRaw),
    audio,
    duration,
  }
}

// ─── TikTok Profile ───────────────────────────────────────────────────────

function extractTikTokProfile() {
  const url = window.location.href
  const handleMatch = url.match(/tiktok\.com\/@([^/?]+)/)
  if (!handleMatch) return null

  const handle = handleMatch[1]

  // Scrape video grid — each item has a view count overlay
  const videos = []
  const seen = new Set()

  // Method 1: Try structured grid items
  const gridItems = document.querySelectorAll(
    '[data-e2e="user-post-item"], [data-e2e="user-post-item-list"] > div, [class*="DivItemContainer"], [class*="DivVideoContainer"], [class*="ItemContainer"]'
  )

  gridItems.forEach(item => {
    const link = item.querySelector('a[href*="/video/"], a[href*="/photo/"]')
    const videoUrl = link?.href ?? null
    if (!videoUrl || seen.has(videoUrl)) return
    seen.add(videoUrl)

    // View count is typically in a strong or span overlay on the thumbnail
    const viewEl = item.querySelector(
      'strong[data-e2e="video-views"], [class*="VideoCount"] strong, [class*="video-count"], span[class*="view"]'
    )
    let views = null
    if (viewEl) {
      views = parseNumber(viewEl.textContent)
    } else {
      // Fallback: look for any text that looks like a number with K/M suffix
      const spans = item.querySelectorAll('strong, span')
      for (const s of spans) {
        const t = s.textContent.trim()
        if (/^\d[\d.]*[KMB]?$/i.test(t)) {
          views = parseNumber(t)
          break
        }
      }
    }

    videos.push({ url: videoUrl, views, title: null })
  })

  // Method 2: Fallback — find all video/photo links on the page
  if (videos.length === 0) {
    const allLinks = document.querySelectorAll('a[href*="/video/"], a[href*="/photo/"]')
    allLinks.forEach(link => {
      const videoUrl = link.href
      if (seen.has(videoUrl)) return
      seen.add(videoUrl)

      // Try to get view count from parent container
      let views = null
      const parent = link.closest('div')
      if (parent) {
        const spans = parent.querySelectorAll('strong, span')
        for (const s of spans) {
          const t = s.textContent.trim()
          if (/^\d[\d.]*[KMB]?$/i.test(t)) {
            views = parseNumber(t)
            break
          }
        }
      }

      videos.push({ url: videoUrl, views, title: null })
    })
  }

  return {
    pageType: 'profile',
    platform: 'tiktok',
    url,
    handle,
    videos,
  }
}

// ─── Instagram Video ──────────────────────────────────────────────────────

function extractInstagram() {
  const url = window.location.href
  const isReel = url.includes('/reel/') || url.includes('/p/')
  if (!isReel) return null

  const caption = trySelectors([
    'article h1',
    '._aacl._aaco._aacu._aacx._aad7._aade span',
    'div[class*="Caption"] span',
    'article div[role="button"] span',
    'h1._aacl',
  ])

  const viewsRaw = trySelectors([
    'span[class*="view"]',
    '[class*="videoViewCount"]',
    'section span[class*="view"]',
    'span._aacl._aaco._aacu._aacx._aad7._aade',
  ])

  const likesRaw = trySelectors([
    'a[href*="/liked_by/"] span',
    'section span.html-span',
    'button[type="button"] span._aacl',
  ])

  const commentsRaw = trySelectors([
    'a[href*="comments"] span',
    'span[class*="comment"]',
  ])

  const handleMatch = url.match(/instagram\.com\/(?:reel|p)\/[^/]+\/?/)
  const handleEl = document.querySelector('header a[href*="/"] span, a[role="link"] span._aacl')
  const handle = handleEl?.textContent?.trim() ??
    document.querySelector('header a[href]')?.getAttribute('href')?.replace(/\//g, '') ?? null

  const audio = trySelectors([
    'a[href*="/audio/"]',
    '[class*="AudioTitle"]',
    'span[class*="audio"]',
  ])

  const videoEl = document.querySelector('video')
  const duration = videoEl ? Math.round(videoEl.duration) || null : null

  return {
    pageType: 'video',
    platform: 'instagram',
    url,
    handle,
    caption,
    hashtags: extractHashtags(caption),
    views: parseNumber(viewsRaw),
    likes: parseNumber(likesRaw),
    comments: parseNumber(commentsRaw),
    shares: null,
    saves: null,
    audio,
    duration,
  }
}

// ─── Instagram Profile ────────────────────────────────────────────────────

function extractInstagramProfile() {
  const url = window.location.href
  // Skip reserved paths
  const reserved = ['/explore', '/direct', '/accounts', '/stories']
  if (reserved.some(r => url.includes(r))) return null

  // Extract handle from URL: instagram.com/username/ or instagram.com/username/reels/
  const pathMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)(?:\/reels)?\/?/)
  if (!pathMatch) return null
  const handle = pathMatch[1]

  // Scrape post/reel links from the grid
  const videos = []
  const links = document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]')
  const seen = new Set()

  links.forEach(link => {
    const href = link.href
    if (seen.has(href)) return
    seen.add(href)
    videos.push({ url: href, views: null, title: null })
  })

  return {
    pageType: 'profile',
    platform: 'instagram',
    url,
    handle,
    videos,
  }
}

// ─── YouTube Video ────────────────────────────────────────────────────────

function extractYouTube() {
  const url = window.location.href
  if (!url.includes('/watch') && !url.includes('/shorts/')) return null

  const title = trySelectors([
    'h1.ytd-watch-metadata yt-formatted-string',
    'h1.title.ytd-video-primary-info-renderer',
    '#title h1',
    'h1[class*="title"]',
  ])

  const viewsRaw = trySelectors([
    'ytd-watch-info-text span.bold.style-scope',
    'span.view-count',
    '#info-text span.bold',
    'ytd-video-view-count-renderer span.view-count',
  ])

  let likes = null
  const likeBtn = document.querySelector(
    'ytd-toggle-button-renderer[is-icon-button] button[aria-label*="like"], ' +
    '#segmented-like-button button[aria-label]'
  )
  if (likeBtn) {
    const label = likeBtn.getAttribute('aria-label') ?? ''
    const m = label.match(/[\d,.]+[KMB]?/)
    if (m) likes = parseNumber(m[0])
  }

  const handle = trySelectors([
    'ytd-channel-name #channel-name a',
    '#owner #channel-name a',
    'ytd-video-owner-renderer #channel-name a',
    '#upload-info a',
  ])

  const durationEl = document.querySelector('.ytp-time-duration')
  let duration = null
  if (durationEl) {
    const parts = durationEl.textContent.trim().split(':').map(Number)
    if (parts.length === 2) duration = parts[0] * 60 + parts[1]
    if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  const descEl = document.querySelector('#description-inline-expander, #description ytd-text-inline-expander, #snippet-text')
  const description = descEl?.innerText?.slice(0, 500) ?? null

  return {
    pageType: 'video',
    platform: 'youtube',
    url,
    handle,
    caption: title,
    hashtags: extractHashtags(description),
    views: parseNumber(viewsRaw),
    likes,
    comments: null,
    shares: null,
    saves: null,
    audio: null,
    duration,
    description,
  }
}

// ─── YouTube Profile ──────────────────────────────────────────────────────

function extractYouTubeProfile() {
  const url = window.location.href
  // Match /@username or /c/username or /channel/ID
  const handleMatch = url.match(/youtube\.com\/(@[^/?]+|c\/[^/?]+|channel\/[^/?]+)/)
  if (!handleMatch) return null

  const handle = handleMatch[1].replace(/^@/, '')

  const videos = []

  // Method 1: Try parsing ytInitialData JSON for richest data
  try {
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
      const text = script.textContent
      if (!text.includes('ytInitialData')) continue

      const match = text.match(/var\s+ytInitialData\s*=\s*({.+?});/)
        || text.match(/window\["ytInitialData"\]\s*=\s*({.+?});/)
      if (!match) continue

      const data = JSON.parse(match[1])

      // Navigate the nested structure to find video renderers
      function findVideos(obj) {
        if (!obj || typeof obj !== 'object') return
        if (obj.videoId && obj.title) {
          const viewText = obj.viewCountText?.simpleText
            || obj.viewCountText?.runs?.map(r => r.text).join('')
            || obj.shortViewCountText?.simpleText
            || null
          videos.push({
            url: `https://www.youtube.com/watch?v=${obj.videoId}`,
            title: obj.title?.runs?.[0]?.text || obj.title?.simpleText || null,
            views: parseNumber(viewText),
          })
          return
        }
        for (const key of Object.keys(obj)) {
          if (Array.isArray(obj[key])) {
            obj[key].forEach(item => findVideos(item))
          } else if (typeof obj[key] === 'object') {
            findVideos(obj[key])
          }
        }
      }

      findVideos(data)
      break
    }
  } catch {}

  // Method 2: Fallback to DOM scraping if JSON parsing didn't find enough
  if (videos.length < 3) {
    const renderers = document.querySelectorAll(
      'ytd-rich-grid-media, ytd-grid-video-renderer, ytd-video-renderer'
    )
    renderers.forEach(el => {
      const titleEl = el.querySelector('#video-title')
      const link = el.querySelector('a#thumbnail, a[href*="/watch"]')
      const metaLine = el.querySelector('#metadata-line span, .inline-metadata-item')

      const videoUrl = link?.href ?? null
      if (!videoUrl || videos.some(v => v.url === videoUrl)) return

      videos.push({
        url: videoUrl,
        title: titleEl?.textContent?.trim() ?? null,
        views: metaLine ? parseNumber(metaLine.textContent) : null,
      })
    })
  }

  return {
    pageType: 'profile',
    platform: 'youtube',
    url,
    handle,
    videos,
  }
}

// ─── Router ───────────────────────────────────────────────────────────────

function extractCurrentPage() {
  const host = window.location.hostname

  if (host.includes('tiktok.com')) {
    return extractTikTok() || extractTikTokProfile()
  }
  if (host.includes('instagram.com')) {
    return extractInstagram() || extractInstagramProfile()
  }
  if (host.includes('youtube.com')) {
    return extractYouTube() || extractYouTubeProfile()
  }
  return null
}

// ─── Injected Toolbar (Sort Feed style) ──────────────────────────────────

let oriannaToolbarInjected = false
let oriannaOriginalOrder = null // store original DOM order for reset

function fmtNum(n) {
  if (n == null) return '-'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function getViewsFromItem(item) {
  const viewEl = item.querySelector(
    'strong[data-e2e="video-views"], [class*="VideoCount"] strong, [class*="video-count"]'
  )
  if (viewEl) return parseNumber(viewEl.textContent)

  const candidates = item.querySelectorAll('strong, span')
  for (const s of candidates) {
    const t = s.textContent.trim()
    if (/^\d[\d.]*[KMB]?$/i.test(t)) {
      return parseNumber(t)
    }
  }
  return null
}

function findGridAndItems() {
  const host = window.location.hostname

  // Platform-specific link selectors
  let linkSel
  if (host.includes('tiktok.com')) linkSel = 'a[href*="/video/"], a[href*="/photo/"]'
  else if (host.includes('instagram.com')) linkSel = 'a[href*="/reel/"], a[href*="/p/"]'
  else if (host.includes('youtube.com')) {
    // YouTube uses custom elements — handle separately
    const container = document.querySelector(
      '#contents.ytd-rich-grid-renderer, #items.ytd-grid-renderer, ytd-rich-grid-renderer #contents'
    )
    if (!container) return null
    const items = [...container.querySelectorAll(
      ':scope > ytd-rich-grid-media, :scope > ytd-rich-item-renderer, :scope > ytd-grid-video-renderer'
    )]
    if (items.length === 0) return null
    return { container, items, platform: 'youtube' }
  }
  else return null

  const links = [...document.querySelectorAll(linkSel)]
  if (links.length < 2) return null

  // Strategy: for each link, walk up N levels. Find the depth where all links'
  // ancestors share the same parent — that's the grid container, and the ancestors
  // are the grid items.
  for (let depth = 1; depth <= 10; depth++) {
    const ancestors = links.map(link => {
      let el = link
      for (let i = 0; i < depth; i++) el = el?.parentElement
      return el
    }).filter(Boolean)

    // Check if these ancestors share one common parent
    const parents = new Set(ancestors.map(a => a.parentElement).filter(Boolean))
    if (parents.size === 1) {
      const container = [...parents][0]
      // Deduplicate (multiple links might resolve to the same ancestor)
      const uniqueItems = [...new Set(ancestors)]
      if (uniqueItems.length >= 2) {
        const platform = host.includes('tiktok') ? 'tiktok' : 'instagram'
        return { container, items: uniqueItems, platform }
      }
    }
  }

  return null
}

function doSort(count) {
  const grid = findGridAndItems()
  if (!grid) return { success: false, message: 'No video grid found' }

  const { container, items, platform } = grid

  // Save original order for reset
  if (!oriannaOriginalOrder) {
    oriannaOriginalOrder = [...container.children]
  }

  // Extract views from each item
  const itemsWithViews = items.map(item => {
    let views = null
    if (platform === 'youtube') {
      const metaLine = item.querySelector('#metadata-line span, .inline-metadata-item')
      if (metaLine) views = parseNumber(metaLine.textContent)
    } else {
      views = getViewsFromItem(item)
    }
    return { el: item, views }
  })

  // Sort by views descending
  itemsWithViews.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))

  const toShow = itemsWithViews.slice(0, count)
  const toHide = itemsWithViews.slice(count)

  toShow.forEach(({ el }) => {
    el.style.display = ''
    container.appendChild(el)
  })
  toHide.forEach(({ el }) => {
    el.style.display = 'none'
    container.appendChild(el)
  })

  return { success: true, sorted: toShow.length, total: items.length }
}

function doReset() {
  if (!oriannaOriginalOrder) return
  const grid = findGridAndItems()
  if (!grid) return

  // Restore original order and show all
  oriannaOriginalOrder.forEach(el => {
    el.style.display = ''
    grid.container.appendChild(el)
  })
  oriannaOriginalOrder = null
}

function doExportCSV() {
  const grid = findGridAndItems()
  if (!grid) return

  const { items, platform } = grid
  const rows = [['#', 'Views', 'URL']]

  const itemsWithViews = items.map(item => {
    let views = null
    if (platform === 'youtube') {
      const metaLine = item.querySelector('#metadata-line span, .inline-metadata-item')
      if (metaLine) views = parseNumber(metaLine.textContent)
    } else {
      views = getViewsFromItem(item)
    }
    const link = item.querySelector('a[href*="/video/"], a[href*="/photo/"], a[href*="/reel/"], a[href*="/p/"], a[href*="/watch"], a#thumbnail')
    const url = link?.href ?? ''
    return { views, url }
  })

  // Sort for export
  itemsWithViews.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))

  itemsWithViews.forEach((v, i) => {
    rows.push([i + 1, v.views ?? 0, v.url])
  })

  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orianna-${platform}-export.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function injectToolbar() {
  if (oriannaToolbarInjected) return
  if (document.getElementById('orianna-toolbar')) return

  const grid = findGridAndItems()
  if (!grid) return

  oriannaToolbarInjected = true

  const bar = document.createElement('div')
  bar.id = 'orianna-toolbar'
  bar.innerHTML = `
    <style>
      #orianna-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        margin: 12px 0;
        background: #18181b;
        border: 1px solid #27272a;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #fafafa;
        z-index: 9999;
        flex-wrap: wrap;
      }
      #orianna-toolbar .ori-logo {
        font-weight: 700;
        font-size: 14px;
        color: #818cf8;
        letter-spacing: -0.3px;
        white-space: nowrap;
      }
      #orianna-toolbar .ori-sep {
        width: 1px;
        height: 20px;
        background: #27272a;
      }
      #orianna-toolbar select {
        background: #09090b;
        border: 1px solid #3f3f46;
        border-radius: 6px;
        color: #fafafa;
        padding: 5px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      #orianna-toolbar button {
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.15s;
        white-space: nowrap;
      }
      #orianna-toolbar .ori-sort-btn {
        background: #6366f1;
        color: #fff;
      }
      #orianna-toolbar .ori-sort-btn:hover { background: #4f46e5; }
      #orianna-toolbar .ori-reset-btn {
        background: transparent;
        color: #a1a1aa;
        border: 1px solid #27272a;
      }
      #orianna-toolbar .ori-reset-btn:hover { background: #27272a; color: #fafafa; }
      #orianna-toolbar .ori-export-btn {
        background: transparent;
        color: #4ade80;
        border: 1px solid #27272a;
      }
      #orianna-toolbar .ori-export-btn:hover { background: #27272a; }
      #orianna-toolbar .ori-status {
        font-size: 11px;
        color: #71717a;
        margin-left: auto;
      }
    </style>
    <span class="ori-logo">Orianna</span>
    <span class="ori-sep"></span>
    <span style="font-size:12px;color:#a1a1aa">Show top</span>
    <select id="ori-count">
      <option value="10">10</option>
      <option value="25" selected>25</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
    <button class="ori-sort-btn" id="ori-sort">Sort by most views</button>
    <button class="ori-reset-btn" id="ori-reset">Reset</button>
    <button class="ori-export-btn" id="ori-export">Export CSV</button>
    <span class="ori-status" id="ori-status">${grid.items.length} videos loaded</span>
  `

  // Insert toolbar above the grid container
  grid.container.parentElement.insertBefore(bar, grid.container)

  // Wire events
  document.getElementById('ori-sort').addEventListener('click', () => {
    const count = parseInt(document.getElementById('ori-count').value)
    const result = doSort(count)
    const statusEl = document.getElementById('ori-status')
    if (result.success) {
      statusEl.textContent = `Showing top ${result.sorted} of ${result.total} by views`
      statusEl.style.color = '#4ade80'
    } else {
      statusEl.textContent = result.message
      statusEl.style.color = '#ef4444'
    }
  })

  document.getElementById('ori-reset').addEventListener('click', () => {
    doReset()
    const statusEl = document.getElementById('ori-status')
    const grid = findGridAndItems()
    statusEl.textContent = grid ? `${grid.items.length} videos loaded — default order` : 'Reset'
    statusEl.style.color = '#71717a'
  })

  document.getElementById('ori-export').addEventListener('click', () => {
    doExportCSV()
    const statusEl = document.getElementById('ori-status')
    statusEl.textContent = 'CSV exported!'
    statusEl.style.color = '#4ade80'
  })
}

// Auto-inject toolbar when on a profile page
function tryInjectToolbar() {
  const page = extractCurrentPage()
  if (page?.pageType === 'profile') {
    // Small delay to let the grid render
    setTimeout(() => injectToolbar(), 500)
  }
}

// Run on load and on URL changes (SPA navigation)
tryInjectToolbar()

// Watch for SPA navigation (TikTok, Instagram, YouTube are all SPAs)
let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    oriannaToolbarInjected = false
    oriannaOriginalOrder = null
    // Remove old toolbar if it exists
    document.getElementById('orianna-toolbar')?.remove()
    setTimeout(() => tryInjectToolbar(), 1000)
  }
})
urlObserver.observe(document.body, { childList: true, subtree: true })

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const data = extractCurrentPage()
    sendResponse({ data })
  }
  if (msg.type === 'SORT_GRID') {
    const result = doSort(msg.count ?? 25)
    sendResponse(result)
  }
  return true
})
