import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cardsApi } from '@/features/cards/api/cards.api'
import { Wifi, ShieldAlert, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function CardTapRedirectPage() {
  const { cardUid } = useParams<{ cardUid: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['card', 'tap', cardUid],
    queryFn: () => cardsApi.resolveTap(cardUid || ''),
    enabled: !!cardUid,
    retry: false,
  })

  const tapData = data?.data

  // Resolve destination: always prioritize public profile /u/:username
  const destination = tapData
    ? tapData.username
      ? `/u/${tapData.username}`
      : tapData.redirectUrl &&
        !tapData.redirectUrl.toLowerCase().includes('/p/c/') &&
        !tapData.redirectUrl.toLowerCase().includes('/c/')
      ? tapData.redirectUrl
      : null
    : null

  useEffect(() => {
    if (destination) {
      // Smooth micro-delay to let the NFC feedback register, then navigate to the profile
      const timer = setTimeout(() => {
        navigate(destination, { replace: true })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [destination, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="flex flex-col items-center space-y-6 max-w-sm text-center">
          <div className="relative flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/20 animate-ping absolute" />
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 relative z-10 text-white">
              <Wifi className="h-8 w-8 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-tight">OneWinq NFC Connected</h2>
            <p className="text-xs text-muted-foreground font-mono">
              Connecting NFC card...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tapData) {
    const apiErr = error as { message?: string; response?: { data?: { message?: string } } }
    const rawMsg = apiErr?.response?.data?.message || apiErr?.message || ''
    const lowerMsg = rawMsg.toLowerCase()

    let title = 'Card Unavailable'
    let description = 'This physical NFC card could not be found or is unavailable.'
    let iconVariant = 'destructive'

    if (lowerMsg.includes('not assigned') || lowerMsg.includes('unassigned')) {
      title = 'Card Not Assigned'
      description = 'This physical NFC card has been generated and provisioned, but has not yet been assigned to any profile.'
      iconVariant = 'unassigned'
    } else if (lowerMsg.includes('blocked')) {
      title = 'Card Blocked'
      description = 'This physical NFC card has been blocked and cannot be used.'
      iconVariant = 'blocked'
    } else if (lowerMsg.includes('inactive') || lowerMsg.includes('deactivated')) {
      title = 'Card Inactive'
      description = 'This physical NFC card has been temporarily deactivated.'
      iconVariant = 'inactive'
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="flex flex-col items-center space-y-6 max-w-md text-center p-8 rounded-3xl border border-border bg-card shadow-sm">
          <div
            className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
              iconVariant === 'unassigned'
                ? 'bg-primary/15 text-primary'
                : iconVariant === 'inactive'
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-destructive/15 text-destructive'
            }`}
          >
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
            {cardUid && (
              <p className="text-xs font-mono text-muted-foreground/60 pt-1">
                Card ID: {cardUid}
              </p>
            )}
          </div>

          <div className="pt-2 w-full">
            <Link to="/">
              <Button variant="default" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Go to OneWinq Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!destination) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="flex flex-col items-center space-y-6 max-w-md text-center p-8 rounded-3xl border border-border bg-card shadow-sm">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-primary/15 text-primary">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Profile Unavailable</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No public profile is currently linked to this NFC card.
            </p>
          </div>
          <div className="pt-2 w-full">
            <Link to="/">
              <Button variant="default" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Go to OneWinq Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="flex flex-col items-center space-y-6 max-w-sm text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white animate-pulse">
          <Wifi className="h-8 w-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold tracking-tight">
            Connecting to {tapData.displayName || tapData.username || 'Profile'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Opening profile...
          </p>
        </div>
      </div>
    </div>
  )
}
