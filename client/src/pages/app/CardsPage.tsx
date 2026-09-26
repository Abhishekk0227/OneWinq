import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { cardsApi } from '@/features/cards/api/cards.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import {
  CreditCard,
  QrCode,
  Lock,
  Unlock,
  Plus,
  Wifi,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import type { OneWinqCard } from '@/types/cards.types'

export default function CardsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Activate Card Modal
  const [isActivateOpen, setIsActivateOpen] = React.useState(false)
  const [cardUidInput, setCardUidInput] = React.useState('')
  const [activationCodeInput, setActivationCodeInput] = React.useState('')
  const [labelInput, setLabelInput] = React.useState('')

  // QR Modal
  const [selectedCardForQr, setSelectedCardForQr] = React.useState<OneWinqCard | null>(null)

  // Card list query
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.cards.list,
    queryFn: () => cardsApi.listCards(),
  })

  const cards = data?.data?.cards || []

  // Activation mutation
  const activateMutation = useMutation({
    mutationFn: (payload: { cardCode?: string; cardUid?: string; activationCode: string; label?: string; nickname?: string }) =>
      cardsApi.activateCard(payload),
    onSuccess: () => {
      toast.success('Card claimed and activated successfully!')
      setIsActivateOpen(false)
      setCardUidInput('')
      setActivationCodeInput('')
      setLabelInput('')
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to activate card. Check the Card Code and activation code.')
    },
  })

  // Lock / Unlock card mutation
  const toggleLockMutation = useMutation({
    mutationFn: ({ cardUid, state }: { cardUid: string; state: 'ACTIVE' | 'BLOCKED' }) =>
      cardsApi.updateCardState(cardUid, state),
    onSuccess: (_, vars) => {
      toast.success(`Card state updated to ${vars.state}.`)
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update card state')
    },
  })

  if (isLoading) {
    return <LoadingScreen message="Loading physical cards..." />
  }

  return (
    <div className="space-y-10 text-left max-w-5xl mx-auto pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Wifi className="h-3.5 w-3.5" />
            <span>Card & Device Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Manage Cards
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your physical OneWinq NFC smart cards, activation codes, and digital tap QR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/app/orders">
            <Button size="sm" variant="outline" leftIcon={<ShoppingBag className="h-4 w-4" />}>
              Order Smart Card
            </Button>
          </Link>
          <Button
            onClick={() => setIsActivateOpen(true)}
            size="sm"
            variant="default"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Activate Card
          </Button>
        </div>
      </div>

      {/* Hardware Store Callout */}
      <section className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Order Physical Cards</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Need a new or replacement physical smart card?
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Choose from Matte PVC (₹500), Artisan Bamboo (₹1,000), or Stealth Metal (₹1,500) editions delivered directly to your address.
          </p>
        </div>
        <Link to="/app/orders" className="shrink-0">
          <Button variant="default" size="sm" className="whitespace-nowrap shadow-sm" leftIcon={<ShoppingBag className="h-4 w-4" />} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
            Visit Hardware Shop
          </Button>
        </Link>
      </section>

      {/* User's Activated Hardware Cards */}
      <section className="space-y-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Your Linked Smart Cards</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Physical cards currently active and routing taps to your OneWinq identity.
            </p>
          </div>
          {cards.length > 0 && (
            <Badge variant="subtle" className="font-mono text-xs">
              {cards.length} {cards.length === 1 ? 'Card' : 'Cards'} Linked
            </Badge>
          )}
        </div>

        {cards.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-8 w-8" />}
            title="No activated cards yet"
            description="Have a physical OneWinq card? Click Activate Card to claim it. Or order your laser-engraved NFC card from the Hardware Shop."
            actionLabel="Activate Card Now"
            onAction={() => setIsActivateOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card) => {
              const isBlocked = card.state === 'BLOCKED' || card.status === 'BLOCKED'
              const code = card.cardCode || card.cardUid

              return (
                <div
                  key={card._id || card.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6 flex flex-col justify-between"
                >
                  {/* Visual Card Representation */}
                  <div className="onewinq-card-surface rounded-2xl p-6 text-white aspect-[1.7/1] flex flex-col justify-between relative shadow-xl">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-7 rounded bg-amber-400/90" />
                        <span className="text-[10px] font-mono tracking-wider text-white/60">
                          {card.edition || card.designTier || 'PVC'}
                        </span>
                      </div>
                      <Badge
                        variant={isBlocked ? 'destructive' : 'success'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {card.state || card.status}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-lg font-bold tracking-tight">
                        {user?.displayName}
                      </div>
                      <div className="text-xs text-white/80 font-mono">
                        {code}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-white/50 font-mono">
                      <span>NFC TAPS: {card.tapCount || 0}</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="h-3 w-3" />
                        PERMANENT OWNER
                      </span>
                    </div>
                  </div>

                  {/* Card Controls */}
                  <div className="space-y-4">
                    <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center justify-between">
                        <span>Card Code: <strong className="font-mono text-foreground">{code}</strong></span>
                        <span>Taps: <strong className="text-foreground">{card.tapCount || 0}</strong></span>
                      </div>
                      {card.label && (
                        <div>Label: <strong className="text-foreground">{card.label}</strong></div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedCardForQr(card)}
                        leftIcon={<QrCode className="h-3.5 w-3.5" />}
                      >
                        Show QR
                      </Button>

                      <Button
                        variant={isBlocked ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        isLoading={toggleLockMutation.isPending}
                        onClick={() =>
                          toggleLockMutation.mutate({
                            cardUid: code,
                            state: isBlocked ? 'ACTIVE' : 'BLOCKED',
                          })
                        }
                        leftIcon={
                          isBlocked ? (
                            <Unlock className="h-3.5 w-3.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-warning" />
                          )
                        }
                      >
                        {isBlocked ? 'Unlock Card' : 'Lock Card'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Activate Card Modal */}
      <Dialog open={isActivateOpen} onOpenChange={setIsActivateOpen}>
        <DialogHeader>
          <DialogTitle>Activate OneWinq NFC Card</DialogTitle>
          <DialogDescription>
            Enter the OneWinq Card Code and 6-digit activation code found on your physical card packaging.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              OneWinq Card Code (printed on card back)
            </label>
            <Input
              value={cardUidInput}
              onChange={(e) => setCardUidInput(e.target.value.toUpperCase().trim())}
              placeholder="e.g. OWQ-PVC-0009482"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Activation Code
            </label>
            <Input
              value={activationCodeInput}
              onChange={(e) => setActivationCodeInput(e.target.value.trim())}
              placeholder="6-digit secret code"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Optional Nickname / Label
            </label>
            <Input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="e.g. Primary Wallet Card"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsActivateOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={activateMutation.isPending}
            disabled={!cardUidInput || !activationCodeInput}
            onClick={() =>
              activateMutation.mutate({
                cardCode: cardUidInput,
                cardUid: cardUidInput,
                activationCode: activationCodeInput,
                label: labelInput || undefined,
              })
            }
          >
            Activate Card
          </Button>
        </DialogFooter>
      </Dialog>

      {/* QR Code Modal for Card */}
      <Dialog open={!!selectedCardForQr} onOpenChange={(open) => !open && setSelectedCardForQr(null)}>
        <DialogHeader>
          <DialogTitle>Card QR Code</DialogTitle>
          <DialogDescription>
            Scan this QR code with any phone to open your digital profile:{' '}
            <code className="text-primary text-xs">
              {selectedCardForQr && `/c/${selectedCardForQr.cardCode || selectedCardForQr.cardUid}`}
            </code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-muted/20 rounded-2xl border border-border">
          <div className="p-4 bg-white rounded-2xl shadow-md">
            <QRCodeSVG
              value={`${window.location.origin}/c/${selectedCardForQr?.cardCode || selectedCardForQr?.cardUid}`}
              size={180}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Scanning this QR code is equivalent to tapping the physical NFC card.
          </p>
        </div>
      </Dialog>
    </div>
  )
}
