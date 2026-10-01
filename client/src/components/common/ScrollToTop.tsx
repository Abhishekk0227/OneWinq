import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scrolls the window to the top on every route change.
 *
 * Why this is needed:
 *   React Router (SPA) doesn't reset scroll position when navigating between
 *   routes — the browser keeps whatever scroll offset the previous page had.
 *   This component listens to pathname changes and fires window.scrollTo(0, 0)
 *   so every page always starts at the top, matching native browser behaviour.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
