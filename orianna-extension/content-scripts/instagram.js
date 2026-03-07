// Orianna Instagram Content Script
// Scrapes post data from Instagram profile pages

function scrapeInstagramProfile() {
  const posts = []

  // Instagram post links on profile grid
  const postLinks = document.querySelectorAll('article a[href*="/reel/"], article a[href*="/p/"]')

  postLinks.forEach((link) => {
    try {
      const url = link.href

      // Find view/like count — Instagram hides these but sometimes shows in overlay
      const countEl = link.querySelector('li span') ||
                      link.querySelector('span[class*="count"]')
      const countText = countEl?.textContent?.trim() ?? '0'

      posts.push({
        url,
        views: parseCount(countText),
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
  const match = window.location.pathname.match(/^\/([^/]+)\/?$/)
  return match ? match[1] : null
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCRAPE_INSTAGRAM') {
    const handle = getHandle()
    const posts = scrapeInstagramProfile()

    sendResponse({
      platform: 'instagram',
      handle,
      posts,
      count: posts.length,
    })
  }
})
