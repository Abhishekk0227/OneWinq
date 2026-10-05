import * as React from 'react'

/**
 * Resilient lazy loader for React components.
 * Retries dynamic imports on network failure or stale deployment chunk errors.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('lazy_import_refreshed') || 'false'
    )

    try {
      const component = await componentImport()
      window.sessionStorage.setItem('lazy_import_refreshed', 'false')
      return component
    } catch (error) {
      if (!pageHasBeenRefreshed) {
        window.sessionStorage.setItem('lazy_import_refreshed', 'true')
        window.location.reload()
        return { default: () => null } as unknown as { default: T }
      }
      throw error
    }
  })
}
