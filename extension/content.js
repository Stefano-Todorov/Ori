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
  const gridItems = document.querySelectorAll(
    '[data-e2e="user-post-item"], [data-e2e="user-post-item-list"] > div, [class*="DivItemContainer"]'
  )

  gridItems.forEach(item => {
    const link = item.querySelector('a[href*="/video/"], a[href*="/photo/"]')
    const videoUrl = link?.href ?? null

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

    if (videoUrl) {
      videos.push({ url: videoUrl, views, title: null })
    }
  })

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
  const reserved = ['/explore', '/direct', '/accounts', '/stories', '/reels/']
  if (reserved.some(r => url.includes(r))) return null

  // Extract handle from URL: instagram.com/username/
  const pathMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/)
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const data = extractCurrentPage()
    sendResponse({ data })
  }
  return true
})
