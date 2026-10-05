import * as React from 'react'
import { useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function RouteErrorBoundary() {
  const error = useRouteError()

  let errorMessage = 'An unexpected error occurred while loading this page.'
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || errorMessage
  } else if (error instanceof Error) {
    errorMessage = error.message
  }

  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground break-words">
            {errorMessage}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={handleReload}
            variant="default"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Reload Page
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
            size="sm"
            leftIcon={<Home className="h-4 w-4" />}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
