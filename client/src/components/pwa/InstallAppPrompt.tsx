import * as React from 'react'
import { Download, X, Share2, PlusSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const DISMISS_KEY = 'onewinq_pwa_dismissed'
export function triggerPWAInstall() {
  window.dispatchEvent(new CustomEvent('onewinq-trigger-pwa-install'))
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = React.useState(false)
  const [isIOS, setIsIOS] = React.useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false)

  React.useEffect(() => {
    // 1. Check if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      return
    }

    // 2. Check dismiss cooldown
    const lastDismissed = localStorage.getItem(DISMISS_KEY)
    if (lastDismissed) {
      const timeSinceDismiss = Date.now() - parseInt(lastDismissed, 10)
      if (timeSinceDismiss < DISMISS_COOLDOWN_MS) {
        return
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua)
    if (isIosDevice) {
      setIsIOS(true)
    }

    // 4. Capture beforeinstallprompt for Chrome / Android / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Gentle delay after page load so it's not jarring
      setTimeout(() => {
        setIsVisible(true)
      }, 1500)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For iOS or browsers where prompt event doesn't fire immediately, show after 2.5s
    const timer = setTimeout(() => {
      if (isIosDevice && isSafari) {
        setIsVisible(true)
      } else if (!isStandalone) {
        // Show banner anyway with install trigger
        setIsVisible(true)
      }
    }, 2500)

    // Listen for manual trigger from drawer/menu
    const handleTrigger = () => {
      setIsVisible(true)
    }
    window.addEventListener('onewinq-trigger-pwa-install', handleTrigger)

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('onewinq-trigger-pwa-install', handleTrigger)
      clearTimeout(timer)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsVisible(false)
        }
      } catch (err) {
        console.warn('[PWA] Prompt error:', err)
      } finally {
        setDeferredPrompt(null)
      }
    } else {
      // Fallback instructions if native prompt unavailable
      alert("To install OneWinq, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.")
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setShowIOSInstructions(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  if (!isVisible) return null

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-md z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-primary/20 text-left">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          aria-label="Close download prompt"
        >
          <X className="h-4 w-4" />
        </button>

        {showIOSInstructions ? (
          /* iOS Step-by-Step Guide */
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/20 text-primary">
                <Share2 className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-foreground text-sm">
                Install on iPhone / iPad
              </h3>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Tap the <strong>Share</strong> button <Share2 className="inline h-3.5 w-3.5 mx-0.5 text-primary" /> in the Safari toolbar at the bottom.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Scroll down and tap <strong>'Add to Home Screen'</strong> <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-primary" />.</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="w-full text-xs h-8"
            >
              Got it
            </Button>
          </div>
        ) : (
          /* Main Download Popup */
          <div className="space-y-3.5">
            <div className="flex items-start gap-3.5 pr-6">
              {/* App Icon */}
              <div className="relative shrink-0">
                <img
                  src="/icon-192.png"
                  alt="OneWinq App Icon"
                  className="w-12 h-12 rounded-xl shadow-md border border-white/10 object-cover"
                />
                <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-primary text-white">
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-foreground text-sm leading-tight">
                    Download OneWinq App
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                    Fast
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Install the official app for instant NFC card sharing, faster load speeds, and full-screen experience.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-0.5">
              <Button
                variant="default"
                size="sm"
                onClick={handleInstallClick}
                className="flex-1 h-9 text-xs font-semibold gap-1.5 shadow-md shadow-primary/25 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download App</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Not now
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
