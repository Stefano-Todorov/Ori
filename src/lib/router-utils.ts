import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

/**
 * Calls router.refresh() while preserving the current scroll position.
 * Prevents the page from jumping to the top after saving/editing.
 */
export function refreshKeepScroll(router: AppRouterInstance) {
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  router.refresh()
  // Restore scroll after React re-renders the refreshed content
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY)
    // Double-rAF to catch deferred layout shifts
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY)
    })
  })
}
