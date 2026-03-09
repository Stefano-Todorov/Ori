// Orianna content script — extracts post data from TikTok and Instagram

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

function getThumbnail() {
  // Try og:image first (most reliable)
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
  if (ogImage) return ogImage
  // Try video poster attribute
  const poster = document.querySelector('video')?.getAttribute('poster')
  if (poster) return poster
  // Try twitter:image
  const twImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
  if (twImage) return twImage
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
  const videoSrc = videoEl?.src || videoEl?.querySelector('source')?.src || null

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
    videoSrc,
    thumbnail: getThumbnail(),
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

// Extract Instagram handle from embedded page JSON data
function extractIgHandleFromPageData() {
  try {
    const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])')
    for (const script of scripts) {
      try {
        const text = script.textContent?.trim()
        if (!text || text.length < 50 || (text[0] !== '{' && text[0] !== '[')) continue
        const data = JSON.parse(text)
        // Search for owner/user username in the JSON
        const username = findUsername(data, 0)
        if (username) return username
      } catch {}
    }
  } catch {}
  return null
}

// Recursively find username in IG page data
function findUsername(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 6) return null
  // Direct owner.username pattern (GraphQL)
  if (obj.owner?.username) return obj.owner.username
  // user.username pattern (v1 API)
  if (obj.user?.username) return obj.user.username
  // shortcode_media.owner pattern
  if (obj.shortcode_media?.owner?.username) return obj.shortcode_media.owner.username
  // Recurse into arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findUsername(item, depth + 1)
      if (found) return found
    }
  } else {
    for (const key of ['data', 'graphql', 'result', 'media', 'items', 'xdt_api__v1__media__shortcode__web_info']) {
      if (obj[key]) {
        const found = findUsername(obj[key], depth + 1)
        if (found) return found
      }
    }
    // Also check items array elements
    if (Array.isArray(obj.items)) {
      for (const item of obj.items) {
        if (item?.user?.username) return item.user.username
        if (item?.owner?.username) return item.owner.username
      }
    }
  }
  return null
}

// Extract Instagram caption from embedded page JSON data
function extractIgCaptionFromPageData() {
  try {
    const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])')
    for (const script of scripts) {
      try {
        const text = script.textContent?.trim()
        if (!text || text.length < 50 || (text[0] !== '{' && text[0] !== '[')) continue
        const data = JSON.parse(text)
        const caption = findCaption(data, 0)
        if (caption) return caption
      } catch {}
    }
  } catch {}
  return null
}

// Recursively find caption text in IG page data
function findCaption(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 6) return null
  // edge_media_to_caption pattern (GraphQL)
  if (obj.edge_media_to_caption?.edges?.[0]?.node?.text) return obj.edge_media_to_caption.edges[0].node.text
  // caption.text pattern (v1 API)
  if (obj.caption?.text) return obj.caption.text
  // shortcode_media pattern
  if (obj.shortcode_media) {
    const found = findCaption(obj.shortcode_media, depth + 1)
    if (found) return found
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findCaption(item, depth + 1)
      if (found) return found
    }
  } else {
    for (const key of ['data', 'graphql', 'result', 'media', 'items', 'xdt_api__v1__media__shortcode__web_info']) {
      if (obj[key]) {
        const found = findCaption(obj[key], depth + 1)
        if (found) return found
      }
    }
    if (Array.isArray(obj.items)) {
      for (const item of obj.items) {
        const found = findCaption(item, depth + 1)
        if (found) return found
      }
    }
  }
  return null
}

// Recursively find stats (play_count, like_count, comment_count) in IG page data
function findIgStats(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 6) return null
  // Direct media stats
  if (obj.play_count != null || obj.like_count != null) {
    return { views: obj.play_count ?? obj.video_play_count ?? null, likes: obj.like_count ?? null, comments: obj.comment_count ?? null }
  }
  // edge_media_preview_like pattern (GraphQL)
  if (obj.edge_media_preview_like?.count != null) {
    return {
      views: obj.video_view_count ?? null,
      likes: obj.edge_media_preview_like.count,
      comments: obj.edge_media_preview_comment?.count ?? obj.edge_media_to_parent_comment?.count ?? null,
    }
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findIgStats(item, depth + 1)
      if (found) return found
    }
  } else {
    for (const key of ['data', 'graphql', 'result', 'media', 'items', 'shortcode_media', 'xdt_api__v1__media__shortcode__web_info']) {
      if (obj[key]) {
        const found = findIgStats(obj[key], depth + 1)
        if (found) return found
      }
    }
    if (Array.isArray(obj.items)) {
      for (const item of obj.items) {
        const found = findIgStats(item, depth + 1)
        if (found) return found
      }
    }
  }
  return null
}

function extractInstagram() {
  const url = window.location.href
  const isReel = url.includes('/reel/') || url.includes('/p/')
  if (!isReel) return null

  // Try DOM selectors first, then embedded JSON, then meta tags for caption
  let caption = trySelectors([
    'article h1',
    '._aacl._aaco._aacu._aacx._aad7._aade span',
    'div[class*="Caption"] span',
    'article div[role="button"] span',
    'h1._aacl',
  ])

  if (!caption) {
    caption = extractIgCaptionFromPageData()
  }

  if (!caption) {
    // og:description often has the caption text
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    if (ogDesc) {
      // Format: "123 likes, 45 comments - Username on Instagram: "caption text""
      const descMatch = ogDesc.match(/on Instagram:\s*["""](.+?)["""]/) || ogDesc.match(/:\s*["""](.+?)["""]/)
      caption = descMatch?.[1] ?? ogDesc
    }
  }

  let viewsRaw = trySelectors([
    'span[class*="view"]',
    '[class*="videoViewCount"]',
    'section span[class*="view"]',
    'span._aacl._aaco._aacu._aacx._aad7._aade',
  ])

  let likesRaw = trySelectors([
    'a[href*="/liked_by/"] span',
    'section span.html-span',
    'button[type="button"] span._aacl',
  ])

  let commentsRaw = trySelectors([
    'a[href*="comments"] span',
    'span[class*="comment"]',
  ])

  // Fallback: parse stats from og:description ("184K likes, 527 comments - username on...")
  if (!likesRaw || !commentsRaw) {
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    if (ogDesc) {
      if (!likesRaw) {
        const lm = ogDesc.match(/([\d,.]+[KMB]?)\s*likes?/i)
        if (lm) likesRaw = lm[1]
      }
      if (!commentsRaw) {
        const cm = ogDesc.match(/([\d,.]+[KMB]?)\s*comments?/i)
        if (cm) commentsRaw = cm[1]
      }
      if (!viewsRaw) {
        const vm = ogDesc.match(/([\d,.]+[KMB]?)\s*views?/i)
        if (vm) viewsRaw = vm[1]
      }
    }
  }

  // Also try embedded JSON for stats
  if (!viewsRaw || !likesRaw) {
    try {
      const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])')
      for (const script of scripts) {
        try {
          const text = script.textContent?.trim()
          if (!text || text.length < 50 || (text[0] !== '{' && text[0] !== '[')) continue
          const data = JSON.parse(text)
          const stats = findIgStats(data, 0)
          if (stats) {
            if (!viewsRaw && stats.views) viewsRaw = String(stats.views)
            if (!likesRaw && stats.likes) likesRaw = String(stats.likes)
            if (!commentsRaw && stats.comments) commentsRaw = String(stats.comments)
            break
          }
        } catch {}
      }
    } catch {}
  }

  // Handle extraction — try multiple methods
  // Method 1: Embedded page JSON data (most reliable)
  let handle = extractIgHandleFromPageData()

  // Method 2: DOM selectors
  if (!handle) {
    // Look for profile link near the post
    const profileLink = document.querySelector('article a[href]:not([href*="/reel/"]):not([href*="/p/"]):not([href*="/explore/"])')
    if (profileLink) {
      const href = profileLink.getAttribute('href')
      const hMatch = href?.match(/^\/([a-zA-Z0-9._]+)\/?$/)
      if (hMatch) handle = hMatch[1]
    }
  }

  // Method 3: URL path — instagram.com/username/reel/xxx (exclude "reel" and "p" themselves)
  if (!handle) {
    const urlMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/(?:reel|p)\//)
    if (urlMatch && urlMatch[1] !== 'reel' && urlMatch[1] !== 'p') {
      handle = urlMatch[1]
    }
  }

  // Method 4: og:title — format: "Username (@handle) on Instagram..." or "@handle on Instagram Reels"
  if (!handle) {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    if (ogTitle) {
      // Try "@handle" pattern first (most reliable)
      const atMatch = ogTitle.match(/@([a-zA-Z0-9._]{1,30})/)
      if (atMatch) {
        handle = atMatch[1]
      } else {
        // Try "Username on Instagram" but only if it looks like a username
        const titleMatch = ogTitle.match(/^([a-zA-Z0-9._]{1,30})\s+on Instagram/)
        if (titleMatch) handle = titleMatch[1]
      }
    }
  }

  // Method 5: og:description — only extract if it looks like a clean username
  if (!handle) {
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    if (ogDesc) {
      const descMatch = ogDesc.match(/^[\d,.]+ likes?,\s*[\d,.]+ comments?\s*-\s*(.+?)\s+on Instagram/)
      if (descMatch) {
        const candidate = descMatch[1].trim()
        if (/^[a-zA-Z0-9._]{1,30}$/.test(candidate)) handle = candidate
      }
    }
  }

  // Method 6: Legacy DOM selectors — username links in post header
  if (!handle) {
    // Try header links that look like profile links
    const headerLinks = document.querySelectorAll('article header a[href], article a[role="link"][href]')
    for (const link of headerLinks) {
      const href = link.getAttribute('href')
      const m = href?.match(/^\/([a-zA-Z0-9._]{1,30})\/?$/)
      if (m) { handle = m[1]; break }
    }
  }
  if (!handle) {
    const handleEl = document.querySelector('header a[href*="/"] span, a[role="link"] span._aacl')
    const candidate = handleEl?.textContent?.trim()
    if (candidate && /^[a-zA-Z0-9._]{1,30}$/.test(candidate)) {
      handle = candidate
    }
  }

  const audio = trySelectors([
    'a[href*="/audio/"]',
    '[class*="AudioTitle"]',
    'span[class*="audio"]',
  ])

  const videoEl = document.querySelector('video')
  const duration = videoEl ? Math.round(videoEl.duration) || null : null
  const videoSrc = videoEl?.src || videoEl?.querySelector('source')?.src || null

  // Extract shortcode for API-based video URL fetch
  const shortcodeMatch = url.match(/\/(reel|p)\/([^/?]+)/)
  const shortcode = shortcodeMatch?.[2] ?? null

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
    videoSrc,
    shortcode,
    thumbnail: getThumbnail(),
  }
}

// Extract best video URL from an IG media node
function getVideoUrlFromNode(node) {
  if (!node) return null
  // v1 API style: video_versions array
  const versions = node.video_versions ?? node.carousel_media?.[0]?.video_versions
  if (versions?.length > 0) {
    return versions.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0].url
  }
  // GraphQL style: video_url field
  if (node.video_url) return node.video_url
  // Nested in media object
  if (node.media?.video_versions?.length > 0) {
    return node.media.video_versions.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0].url
  }
  return null
}

// Recursively find ANY object with the matching shortcode/code that has video data
function findVideoNode(obj, shortcode, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) return null
  // Check if this node matches
  const sc = obj.shortcode ?? obj.code
  if (sc === shortcode) {
    const url = getVideoUrlFromNode(obj)
    if (url) return url
  }
  // Recurse into arrays and objects
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findVideoNode(item, shortcode, depth + 1)
      if (found) return found
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('_')) continue
      const found = findVideoNode(obj[key], shortcode, depth + 1)
      if (found) return found
    }
  }
  return null
}

// Convert Instagram shortcode to numeric media ID
// Shortcodes use a custom base64 alphabet
function shortcodeToMediaId(shortcode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let id = BigInt(0)
  for (const char of shortcode) {
    id = id * BigInt(64) + BigInt(alphabet.indexOf(char))
  }
  return id.toString()
}

// Fetch direct video download URL from Instagram page data or API
async function fetchInstagramVideoUrl(shortcode) {
  if (!shortcode) return null
  console.log('[Orianna] Fetching IG video URL for shortcode:', shortcode)

  // Method 1: Parse embedded <script> tags on the current page
  try {
    const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])')
    for (const script of scripts) {
      try {
        const text = script.textContent?.trim()
        if (!text || text.length < 50 || (text[0] !== '{' && text[0] !== '[')) continue
        const data = JSON.parse(text)
        const url = findVideoNode(data, shortcode)
        if (url) {
          console.log('[Orianna] Found video URL from embedded data')
          return url
        }
      } catch {}
    }
  } catch {}
  console.log('[Orianna] No video URL in embedded data, trying API...')

  // Method 2: Try IG API with numeric media ID (the endpoint needs numeric ID, not shortcode)
  try {
    const mediaId = shortcodeToMediaId(shortcode)
    console.log('[Orianna] Converted shortcode to media ID:', mediaId)
    const res = await fetch(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
      headers: { 'X-IG-App-ID': '936619743392459' },
    })
    if (res.ok) {
      const data = await res.json()
      const item = data?.items?.[0]
      const directUrl = getVideoUrlFromNode(item)
      if (directUrl) {
        console.log('[Orianna] Found video URL from API')
        return directUrl
      }
      // Also try deep search
      const deepUrl = findVideoNode(data, shortcode)
      if (deepUrl) {
        console.log('[Orianna] Found video URL from API deep search')
        return deepUrl
      }
    } else {
      console.log('[Orianna] API returned', res.status)
    }
  } catch (err) {
    console.log('[Orianna] API error:', err.message)
  }

  console.log('[Orianna] Could not find video URL for', shortcode)
  return null
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

// ─── Router ───────────────────────────────────────────────────────────────

function extractCurrentPage() {
  const host = window.location.hostname

  if (host.includes('tiktok.com')) {
    return extractTikTok() || extractTikTokProfile()
  }
  if (host.includes('instagram.com')) {
    return extractInstagram() || extractInstagramProfile()
  }
  return null
}

// ─── Helpers for grid metric extraction ──────────────────────────────────

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

  if (host.includes('tiktok.com')) {
    // Primary: use TikTok's data-e2e attribute (most reliable)
    const ttSelectors = [
      '[data-e2e="user-post-item-list"]',
      '[data-e2e="user-liked-item-list"]',
      '[data-e2e="favorites-item-list"]',
      'div[class*="DivVideoList"]',
      'div[class*="three-column-container"]',
      'div[class*="VideoList"]',
    ]
    for (const sel of ttSelectors) {
      try {
        const container = document.querySelector(sel)
        if (!container) continue
        const items = [...container.children].filter(child =>
          child.querySelector('a[href*="/video/"], a[href*="/photo/"]')
        )
        if (items.length >= 2) return { container, items, platform: 'tiktok' }
      } catch {}
    }
    // Fallback: shared-parent algorithm with all video links
    return findGridBySharedParent('a[href*="/video/"], a[href*="/photo/"]', 'tiktok')
  }

  if (host.includes('instagram.com')) {
    // Instagram: don't try to detect grid structure (it's deeply nested rows).
    // Just collect all unique post/reel links. We'll build our own sorted overlay.
    const allLinks = [...document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]')]
    if (allLinks.length < 2) return null

    const seen = new Set()
    const links = allLinks.filter(a => {
      const href = a.href.split('?')[0]
      if (seen.has(href)) return false
      seen.add(href)
      return true
    })
    if (links.length < 2) return null

    // Find the main grid area — walk up from links to find a container
    // We just need a reference point to insert our overlay before
    let gridArea = links[0]
    for (let i = 0; i < 15; i++) {
      if (!gridArea.parentElement) break
      gridArea = gridArea.parentElement
      // Stop at article or a container that holds most links
      const linksInside = gridArea.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]').length
      if (linksInside >= links.length * 0.8) break
    }

    return { container: gridArea, items: links, platform: 'instagram', useOverlay: true }
  }

  return null
}

// Shared-parent algorithm: walk up from links to find grid container
function findGridBySharedParent(linkSel, platform) {
  const links = [...document.querySelectorAll(linkSel)]
  if (links.length < 2) return null

  for (let depth = 1; depth <= 10; depth++) {
    const ancestors = links.map(link => {
      let el = link
      for (let i = 0; i < depth; i++) el = el?.parentElement
      return el
    }).filter(Boolean)

    const parents = new Set(ancestors.map(a => a.parentElement).filter(Boolean))
    if (parents.size === 1) {
      const container = [...parents][0]
      const uniqueItems = [...new Set(ancestors)]
      if (uniqueItems.length >= 2) {
        return { container, items: uniqueItems, platform }
      }
    }
  }
  return null
}

// Instagram — fetch metrics from embedded page data or GraphQL
let igMetricsCache = new Map() // shortcode → { views, likes, comments }

// Recursively search an object for media nodes with shortcodes
function extractMediaNodes(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results
  // Check if this looks like a media node
  if (obj.shortcode && (obj.like_count != null || obj.edge_liked_by || obj.play_count || obj.video_view_count)) {
    results.push(obj)
    return results
  }
  // Check edges pattern
  if (obj.edges && Array.isArray(obj.edges)) {
    for (const edge of obj.edges) {
      if (edge?.node) extractMediaNodes(edge.node, results)
    }
  }
  // Check items pattern (v1 API style)
  if (Array.isArray(obj.items)) {
    for (const item of obj.items) {
      if (item?.code || item?.shortcode) results.push(item)
    }
  }
  // Recurse into object properties (limit depth by only checking known patterns)
  for (const key of Object.keys(obj)) {
    if (key === 'edge_owner_to_timeline_media' || key === 'edge_felix_video_timeline' ||
        key === 'timeline_media' || key === 'media' || key === 'user' ||
        key === 'data' || key === 'graphql' || key === 'result' ||
        key === 'items' || key === 'feed_items' || key === 'sections' ||
        key === 'xdt_api__v1__feed__user_timeline_graphql_connection') {
      extractMediaNodes(obj[key], results)
    }
  }
  return results
}

function cacheMediaNode(node) {
  const sc = node.shortcode ?? node.code
  if (!sc || igMetricsCache.has(sc)) return
  igMetricsCache.set(sc, {
    views: node.video_view_count ?? node.play_count ?? null,
    likes: node.like_count ?? node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? null,
    comments: node.comment_count ?? node.edge_media_to_comment?.count ?? null,
    thumb: node.display_url ?? node.thumbnail_src ?? node.image_versions2?.candidates?.[0]?.url ?? null,
  })
}

// Helper: fetch with 1 retry on failure
async function fetchWithRetry(url, opts, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts)
      if (res.ok) return res
      if (attempt < retries) {
        console.log(`[Orianna] Fetch ${res.status}, retrying in 1s...`)
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (err) {
      if (attempt < retries) {
        console.log(`[Orianna] Fetch error: ${err.message}, retrying in 1s...`)
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }
  return null
}

async function fetchInstagramMetrics(items) {
  const igHeaders = { 'X-IG-App-ID': '936619743392459' }

  // Extract shortcodes from items (items are <a> links for IG overlay mode)
  const itemShortcodes = []
  for (const item of items) {
    const link = item.tagName === 'A' ? item : item.querySelector('a[href*="/reel/"], a[href*="/p/"]')
    if (!link?.href) continue
    const m = link.href.match(/\/(reel|p)\/([^/?]+)/)
    if (m) itemShortcodes.push({ item, shortcode: m[2] })
  }

  if (igMetricsCache.size === 0) {
    // Method 1: Parse embedded <script> tags (both typed and untyped)
    console.log('[Orianna] Parsing embedded page data...')
    const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])')
    for (const script of scripts) {
      try {
        const text = script.textContent?.trim()
        if (!text || text.length < 50 || text[0] !== '{') continue
        const data = JSON.parse(text)
        const nodes = extractMediaNodes(data)
        nodes.forEach(cacheMediaNode)
      } catch {}
    }
    console.log('[Orianna] Found', igMetricsCache.size, 'posts from embedded data')

    // Method 2: If still empty, try API
    if (igMetricsCache.size === 0) {
      const handle = window.location.pathname.match(/\/([a-zA-Z0-9._]+)/)?.[1]
      if (handle) {
        try {
          console.log('[Orianna] Trying API for', handle)
          const profileRes = await fetchWithRetry(
            `https://www.instagram.com/api/v1/users/web_profile_info/?username=${handle}`,
            { headers: igHeaders }
          )
          if (profileRes) {
            const profileData = await profileRes.json()
            // Also extract media from the profile response itself
            const profileNodes = extractMediaNodes(profileData)
            profileNodes.forEach(cacheMediaNode)

            const userId = profileData?.data?.user?.id
            if (userId) {
              console.log('[Orianna] Got user ID:', userId, '— fetching feed...')
              let nextMaxId = null
              for (let page = 0; page < 5; page++) {
                const feedUrl = `https://www.instagram.com/api/v1/feed/user/${userId}/?count=50${nextMaxId ? `&max_id=${nextMaxId}` : ''}`
                const feedRes = await fetchWithRetry(feedUrl, { headers: igHeaders })
                if (!feedRes) break
                const feedData = await feedRes.json()
                const nodes = extractMediaNodes(feedData)
                nodes.forEach(cacheMediaNode)
                nextMaxId = feedData.next_max_id
                if (!feedData.more_available || !nextMaxId) break
              }
              console.log('[Orianna] Cached', igMetricsCache.size, 'posts from feed API')
            }
          }
        } catch (err) {
          console.log('[Orianna] API error:', err.message)
        }
      }
    }
  }

  // Build metrics map: item element → { views, likes, comments, thumb }
  const metricsMap = new Map()
  const unmatched = []
  for (const { item, shortcode } of itemShortcodes) {
    const cached = igMetricsCache.get(shortcode)
    if (cached) {
      metricsMap.set(item, cached)
    } else {
      unmatched.push({ item, shortcode })
      metricsMap.set(item, { views: null, likes: null, comments: null, thumb: null })
    }
  }

  // Fallback: fetch individual post info for unmatched shortcodes (up to 5)
  if (unmatched.length > 0 && unmatched.length <= 10) {
    console.log('[Orianna] Fetching', Math.min(unmatched.length, 5), 'individual posts...')
    for (const { item, shortcode } of unmatched.slice(0, 5)) {
      try {
        const res = await fetchWithRetry(
          `https://www.instagram.com/api/v1/media/${shortcode}/info/`,
          { headers: igHeaders },
          0  // no retry for individual posts to stay fast
        )
        if (res) {
          const data = await res.json()
          const nodes = extractMediaNodes(data)
          nodes.forEach(cacheMediaNode)
          const cached = igMetricsCache.get(shortcode)
          if (cached) metricsMap.set(item, cached)
        }
      } catch {}
    }
  }

  if (unmatched.length > 0) {
    const stillMissing = unmatched.filter(u => {
      const m = metricsMap.get(u.item)
      return !m || (m.views == null && m.likes == null)
    })
    if (stillMissing.length > 0) {
      console.log('[Orianna] Still unmatched:', stillMissing.map(u => u.shortcode))
    }
  }
  return metricsMap
}

// ─── TikTok — fetch metrics via MAIN world bridge ────────────────────────

let ttMetricsCache = new Map() // videoId → { views, likes, comments, thumb }

// Listen for data from tiktok-bridge.js (runs in MAIN world, can access page JS)
window.addEventListener('message', (e) => {
  if (e.data?.type === 'ORIANNA_TT_DATA' && Array.isArray(e.data.items)) {
    for (const item of e.data.items) {
      if (item.id) {
        ttMetricsCache.set(item.id, {
          views: item.views || null,
          likes: item.likes || null,
          comments: item.comments || null,
          thumb: item.thumb || null,
        })
      }
    }
    console.log(`[Orianna] TikTok bridge: cached ${ttMetricsCache.size} items`)
  }
})

async function fetchTikTokMetrics() {
  // Bridge may have already sent data on page load
  if (ttMetricsCache.size > 0) {
    console.log(`[Orianna] TikTok: already have ${ttMetricsCache.size} cached items`)
    return
  }

  // Request fresh data from tiktok-bridge.js
  console.log('[Orianna] TikTok: requesting data from bridge...')
  window.postMessage({ type: 'ORIANNA_TT_REQUEST' }, '*')

  // Wait up to 5s for bridge response, re-request at 2s if still empty
  await new Promise((resolve) => {
    if (ttMetricsCache.size > 0) { resolve(); return }
    let reRequested = false
    const interval = setInterval(() => {
      if (ttMetricsCache.size > 0) { clearInterval(interval); resolve() }
    }, 150)
    // Re-request at 2s — bridge may have scanned script tags by now
    setTimeout(() => {
      if (ttMetricsCache.size === 0 && !reRequested) {
        reRequested = true
        console.log('[Orianna] TikTok: re-requesting from bridge...')
        window.postMessage({ type: 'ORIANNA_TT_REQUEST' }, '*')
      }
    }, 2000)
    setTimeout(() => { clearInterval(interval); resolve() }, 5000)
  })

  // Fallback: parse <script> tags in content script (isolated world, can read DOM)
  if (ttMetricsCache.size === 0) {
    console.log('[Orianna] TikTok: bridge returned 0 items, trying script tag fallback...')
    try {
      const scripts = document.querySelectorAll('script[type="application/json"], script#__UNIVERSAL_DATA_FOR_REHYDRATION__')
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent)
          extractTikTokItemsFromJSON(data, 0)
        } catch {}
      }
    } catch {}
    console.log(`[Orianna] TikTok: after script fallback, cache has ${ttMetricsCache.size} items`)
  }

  console.log(`[Orianna] TikTok: final cache has ${ttMetricsCache.size} items`)
}

// Recursively extract TikTok video items from JSON data
function extractTikTokItemsFromJSON(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 6) return
  // Direct item with stats
  if (obj.id && (obj.stats || obj.statsV2)) {
    const st = obj.stats || obj.statsV2 || {}
    ttMetricsCache.set(String(obj.id), {
      views: parseInt(st.playCount) || parseInt(st.play_count) || null,
      likes: parseInt(st.diggCount) || parseInt(st.digg_count) || null,
      comments: parseInt(st.commentCount) || parseInt(st.comment_count) || null,
      thumb: obj.video?.cover || obj.video?.dynamicCover || obj.video?.originCover || null,
    })
    return
  }
  // ItemModule pattern
  if (obj.ItemModule && typeof obj.ItemModule === 'object') {
    for (const key of Object.keys(obj.ItemModule)) {
      extractTikTokItemsFromJSON(obj.ItemModule[key], depth + 1)
    }
  }
  // itemList / items arrays
  if (Array.isArray(obj.itemList)) obj.itemList.forEach(it => extractTikTokItemsFromJSON(it, depth + 1))
  if (Array.isArray(obj.items)) obj.items.forEach(it => extractTikTokItemsFromJSON(it, depth + 1))
  // Recurse into known keys
  for (const key of ['data', 'defaultScope', 'webapp.video-detail', 'webapp.user-detail', '__DEFAULT_SCOPE__']) {
    if (obj[key] && typeof obj[key] === 'object') extractTikTokItemsFromJSON(obj[key], depth + 1)
  }
}

// ─── SPA Navigation — reset caches on URL change ─────────────────────────

let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    igMetricsCache = new Map()
    ttMetricsCache = new Map()
  }
})
urlObserver.observe(document.body, { childList: true, subtree: true })

// ─── Message handlers for popup ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const data = extractCurrentPage()
    sendResponse({ data })
  }

  if (msg.type === 'GET_IG_VIDEO_URL') {
    (async () => {
      const videoUrl = await fetchInstagramVideoUrl(msg.shortcode)
      sendResponse({ videoUrl })
    })()
    return true
  }

  if (msg.type === 'GET_SORTED_METRICS') {
    (async () => {
      const grid = findGridAndItems()
      if (!grid) {
        sendResponse({ error: 'No video grid found on this page' })
        return
      }

      const { items, platform } = grid
      const sortBy = msg.sortBy ?? 'views'
      let posts = []

      if (platform === 'instagram') {
        // Instagram: fetch metrics from API, thumbnails from API cache
        const igMetrics = await fetchInstagramMetrics(items)
        posts = items.map(link => {
          const href = link.href
          const m = href.match(/\/(reel|p)\/([^/?]+)/)
          const sc = m?.[2]
          const metrics = igMetrics.get(link) ?? { views: null, likes: null, comments: null, thumb: null }
          // Prefer API thumbnail, fall back to DOM img
          const domImg = link.querySelector('img')
          const thumb = metrics.thumb ?? igMetricsCache.get(sc)?.thumb ?? domImg?.src ?? ''
          return { href, thumb, views: metrics.views, likes: metrics.likes, comments: metrics.comments }
        })
      } else if (platform === 'tiktok') {
        // TikTok: try to get likes/comments from embedded page data or API
        await fetchTikTokMetrics()

        posts = items.map(item => {
          const link = item.querySelector('a[href*="/video/"], a[href*="/photo/"]')
          const href = link?.href ?? ''
          // Extract video ID from URL or data attribute
          const videoId = href.match(/\/video\/(\d+)/)?.[1]
            || href.match(/\/photo\/(\d+)/)?.[1]
            || item.getAttribute('data-video-id')
            || item.querySelector('[data-video-id]')?.getAttribute('data-video-id')
          const cached = videoId ? ttMetricsCache.get(videoId) : null

          const views = cached?.views ?? getViewsFromItem(item)
          const likes = cached?.likes ?? null
          const comments = cached?.comments ?? null

          // Thumbnail: try multiple sources — TikTok uses lazy loading
          let thumb = cached?.thumb || ''
          if (!thumb) {
            const imgs = item.querySelectorAll('img')
            for (const img of imgs) {
              const src = img.src || img.getAttribute('data-src') || ''
              // Skip tiny placeholders and data URIs
              if (src && !src.startsWith('data:') && src.length > 50) {
                thumb = src
                break
              }
            }
          }
          if (!thumb) {
            // Try srcset
            const img = item.querySelector('img[srcset]')
            if (img) thumb = img.srcset.split(',')[0]?.trim()?.split(' ')[0] || ''
          }
          if (!thumb) {
            // Try video poster
            const video = item.querySelector('video')
            if (video) thumb = video.getAttribute('poster') || ''
          }
          return { href, thumb, views, likes, comments }
        })
      }

      // Filter out items without a URL
      posts = posts.filter(p => p.href)

      // Sort by requested metric
      posts.sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))

      sendResponse({ posts, total: posts.length })
    })()
    return true
  }

  return true
})
