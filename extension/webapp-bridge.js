// Bridge content script injected on ori-nine.vercel.app
// Listens for custom events from the web app and forwards to the extension background

window.addEventListener('orianna-fetch-video', async (event) => {
  const { shortcode, requestId } = event.detail
  if (!shortcode || !requestId) return

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_VIDEO_URL',
      shortcode,
    })

    window.dispatchEvent(new CustomEvent('orianna-video-result', {
      detail: { requestId, videoUrl: response?.videoUrl ?? null, error: response?.error ?? null },
    }))
  } catch (err) {
    window.dispatchEvent(new CustomEvent('orianna-video-result', {
      detail: { requestId, videoUrl: null, error: err.message },
    }))
  }
})

// Signal that the extension bridge is available
window.dispatchEvent(new CustomEvent('orianna-bridge-ready'))
window.__oriannaBridge = true
