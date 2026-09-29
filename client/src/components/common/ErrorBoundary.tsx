import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[OneWinq ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleClearCacheAndReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key))
        })
      }
      localStorage.removeItem('onewinq_pwa_dismissed')
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-destructive/30 bg-card shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                Something went wrong
              </h2>
              <p className="text-xs text-muted-foreground">
                An unexpected error occurred while loading the application.
              </p>
            </div>

            {this.state.error?.message && (
              <pre className="p-2.5 rounded-lg bg-muted text-[11px] text-muted-foreground overflow-x-auto text-left max-h-24">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReload}
                className="flex-1 gap-1.5 h-9 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleClearCacheAndReload}
                className="flex-1 h-9 text-xs"
              >
                Clear Cache & Restart
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
