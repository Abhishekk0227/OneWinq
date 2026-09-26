import { Button } from '@/components/ui/Button'
import { Sparkles, ShoppingBag } from 'lucide-react'

export interface NfcCardEdition {
  id: 'pvc' | 'wooden' | 'metallic'
  cardType: string
  designTier: string
  name: string
  tagline: string
  description: string
  originalPrice: number
  salePrice: number
  discountAmount: number
  currency: string
  currencySymbol: string
  badge: string
  chipColor: 'purple' | 'gold' | 'silver'
}

export const NFC_CARD_EDITIONS: NfcCardEdition[] = [
  {
    id: 'pvc',
    cardType: 'pvc',
    designTier: 'PVC',
    name: 'PVC Card',
    tagline: 'LIGHTWEIGHT EVERYDAY CARRY',
    description: 'Clean, durable, and ready for every introduction.',
    originalPrice: 500,
    salePrice: 400,
    discountAmount: 100,
    currency: 'INR',
    currencySymbol: '₹',
    badge: '₹100 OFF',
    chipColor: 'purple',
  },
  {
    id: 'wooden',
    cardType: 'wooden',
    designTier: 'WOODEN',
    name: 'Wooden Card',
    tagline: 'NATURAL STATEMENT PIECE',
    description: 'A warm, tactile card for a memorable first impression.',
    originalPrice: 1000,
    salePrice: 900,
    discountAmount: 100,
    currency: 'INR',
    currencySymbol: '₹',
    badge: '₹100 OFF',
    chipColor: 'gold',
  },
  {
    id: 'metallic',
    cardType: 'metallic',
    designTier: 'METALLIC',
    name: 'Metallic Card',
    tagline: 'PREMIUM LASTING FINISH',
    description: 'A refined metal finish for the moments that matter.',
    originalPrice: 1500,
    salePrice: 1400,
    discountAmount: 100,
    currency: 'INR',
    currencySymbol: '₹',
    badge: '₹100 OFF',
    chipColor: 'silver',
  },
]

// Accurate ISO/IEC 7816 microchip contact SVG
function SmartCardChip({ color }: { color: 'purple' | 'gold' | 'silver' }) {
  const strokeColor = {
    purple: '#A855F7',
    gold: '#EAB308',
    silver: '#CBD5E1',
  }[color]

  return (
    <svg
      width="36"
      height="30"
      viewBox="0 0 36 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="28"
        rx="4"
        stroke={strokeColor}
        strokeWidth="1.2"
        fill="none"
        opacity="0.9"
      />
      <rect
        x="12"
        y="8"
        width="12"
        height="14"
        rx="2"
        stroke={strokeColor}
        strokeWidth="1.2"
        fill="none"
        opacity="0.9"
      />
      <line x1="1" y1="10" x2="12" y2="10" stroke={strokeColor} strokeWidth="1.2" opacity="0.9" />
      <line x1="1" y1="20" x2="12" y2="20" stroke={strokeColor} strokeWidth="1.2" opacity="0.9" />
      <line x1="24" y1="10" x2="35" y2="10" stroke={strokeColor} strokeWidth="1.2" opacity="0.9" />
      <line x1="24" y1="20" x2="35" y2="20" stroke={strokeColor} strokeWidth="1.2" opacity="0.9" />
      <line x1="18" y1="1" x2="18" y2="8" stroke={strokeColor} strokeWidth="1.2" opacity="0.9" />
      <line x1="18" y1="22" x2="18" y2="29" stroke={strokeColor} strokeWidth="1.2" opacity="0.9" />
    </svg>
  )
}

interface NfcCardEditionsProps {
  selectedEditionId?: string
  onSelectEdition?: (edition: NfcCardEdition) => void
  showOrderAction?: boolean
}

export function NfcCardEditions({
  selectedEditionId,
  onSelectEdition,
  showOrderAction = true,
}: NfcCardEditionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>NFC Smart Card Editions</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            High-quality physical cards connected directly to your OneWinq digital profile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {NFC_CARD_EDITIONS.map((edition) => {
          const isSelected = selectedEditionId === edition.id

          return (
            <div
              key={edition.id}
              onClick={() => onSelectEdition?.(edition)}
              className={`group flex flex-col justify-between rounded-3xl border transition-all duration-300 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md cursor-pointer ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/30 shadow-primary/10'
                  : 'border-border hover:border-border/80'
              }`}
            >
              {/* Card Surface Preview */}
              <div className="space-y-5">
                <div
                  className={`relative w-full aspect-[1.586/1] rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-[1.02] ${
                    edition.id === 'pvc'
                      ? 'bg-[#F2EBFC] border border-[#E3D4FB] text-zinc-950'
                      : edition.id === 'wooden'
                        ? 'bg-gradient-to-br from-[#724422] via-[#563118] to-[#3B1F0D] border border-[#85512B] text-amber-100'
                        : 'bg-gradient-to-tr from-[#131518] via-[#242831] to-[#121316] border border-zinc-700/60 text-white'
                  }`}
                >
                  {/* Concentric Tree Rings for Wooden Card */}
                  {edition.id === 'wooden' && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none opacity-25 overflow-hidden"
                      viewBox="0 0 300 190"
                      preserveAspectRatio="none"
                    >
                      {[25, 45, 65, 85, 105, 125, 145, 170, 195, 225, 260].map((r, i) => (
                        <circle
                          key={i}
                          cx="130"
                          cy="95"
                          r={r}
                          fill="none"
                          stroke="#E6B87D"
                          strokeWidth="1.2"
                          strokeDasharray="4 2.5"
                        />
                      ))}
                    </svg>
                  )}

                  {/* Diagonal Metallic Sheen for Metallic Card */}
                  {edition.id === 'metallic' && (
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-10 opacity-70" />
                  )}

                  {/* Top Branding & Chip */}
                  <div className="space-y-3 relative z-10">
                    <div
                      className={`text-base font-extrabold tracking-tight ${
                        edition.id === 'pvc'
                          ? 'text-zinc-900'
                          : edition.id === 'wooden'
                            ? 'text-[#F5D59F]'
                            : 'text-zinc-100'
                      }`}
                    >
                      onewinq
                    </div>
                    <SmartCardChip color={edition.chipColor} />
                  </div>

                  {/* Bottom Monospace Action Callout */}
                  <div
                    className={`text-[11px] font-mono tracking-wider relative z-10 ${
                      edition.id === 'pvc'
                        ? 'text-zinc-600'
                        : edition.id === 'wooden'
                          ? 'text-[#D7A76E]'
                          : 'text-zinc-400'
                    }`}
                  >
                    Tap to share
                  </div>
                </div>

                {/* Tagline & Material Badge */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {edition.tagline}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-primary-soft px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase text-primary">
                    {edition.designTier}
                  </span>
                </div>

                {/* Card Title & Description */}
                <div className="space-y-1.5 text-left">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    {edition.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {edition.description}
                  </p>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="pt-5 mt-4 border-t border-border flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    ₹{edition.salePrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground line-through opacity-70">
                    ₹{edition.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    / piece
                  </span>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-black tracking-wider uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="h-3 w-3" />
                  {edition.badge}
                </div>
              </div>

              {showOrderAction && (
                <div className="pt-4">
                  <Button
                    size="sm"
                    className="w-full text-xs font-bold"
                    variant={isSelected ? 'default' : 'subtle'}
                    leftIcon={<ShoppingBag className="h-3.5 w-3.5" />}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEdition?.(edition)
                    }}
                  >
                    Pre-Book {edition.name}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
