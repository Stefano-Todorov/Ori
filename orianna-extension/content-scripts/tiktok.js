// Orianna TikTok Content Script
// Scrapes post data from TikTok profile pages

function scrapeTikTokProfile() {
  const posts = []

  // TikTok video items on profile page
  const videoItems = document.querySelectorAll('[data-e2e="user-post-item"]')

  videoItems.forEach((item) => {
    try {
      const link = item.querySelector('a')
      const url = link?.href ?? ''

      // View count from the overlay text
      const viewEl = item.querySelector('[data-e2e="video-views"]') ||
                     item.querySelector('.video-count') ||
                     item.querySelector('strong')
      const viewText = viewEl?.textContent?.trim() ?? '0'

      posts.push({
        url,
        views: parseCount(viewText),
        likes: 0,
        comments: 0,
        shares: 0,
        hashtags: [],
        caption: '',
      })
    } catch (e) {
      // Skip malformed items
    }
  })

  return posts
}

function parseCount(text) {
  if (!text) return 0
  const t = text.replace(/,/g, '').trim()
  if (t.endsWith('M')) return Math.floor(parseFloat(t) * 1_000_000)
  if (t.endsWith('K')) return Math.floor(parseFloat(t) * 1_000)
  return parseInt(t, 10) || 0
}

function getHandle() {
  const match = window.location.pathname.match(/^\/@([^/]+)/)
  return match ? match[1] : null
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCRAPE_TIKTOK') {
    const handle = getHandle()
    const posts = scrapeTikTokProfile()

    sendResponse({
      platform: 'tiktok',
      handle,
      posts,
      count: posts.length,
    })
  }
})
