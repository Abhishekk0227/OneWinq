import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes default stale time
      gcTime: 1000 * 60 * 15,    // 15 minutes garbage collection time
      retry: (failureCount, error: unknown) => {
        // Do not retry 401, 403, 404 errors
        const status = (error as { statusCode?: number })?.statusCode
        if (status === 401 || status === 403 || status === 404) {
          return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
