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

// ─── TikTok ────────────────────────────────────────────────────────────────

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

  // Handle from URL or DOM
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

// ─── Instagram ─────────────────────────────────────────────────────────────

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

  // Handle from URL or page
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

// ─── YouTube ───────────────────────────────────────────────────────────────

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

  // YouTube like count is tricky — it's in the aria-label
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

  // Duration from player
  const durationEl = document.querySelector('.ytp-time-duration')
  let duration = null
  if (durationEl) {
    const parts = durationEl.textContent.trim().split(':').map(Number)
    if (parts.length === 2) duration = parts[0] * 60 + parts[1]
    if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  // Description (first few lines = hook context)
  const descEl = document.querySelector('#description-inline-expander, #description ytd-text-inline-expander, #snippet-text')
  const description = descEl?.innerText?.slice(0, 500) ?? null

  return {
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

// ─── Router ────────────────────────────────────────────────────────────────

function extractCurrentPage() {
  const host = window.location.hostname
  if (host.includes('tiktok.com')) return extractTikTok()
  if (host.includes('instagram.com')) return extractInstagram()
  if (host.includes('youtube.com')) return extractYouTube()
  return null
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const data = extractCurrentPage()
    sendResponse({ data })
  }
  return true // keep channel open for async
})
