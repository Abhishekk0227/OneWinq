import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { ProfileTemplate } from '@/types/profile.types'
import {
  CheckCircle2,
  Sparkles,
  Layout,
  Briefcase,
  GraduationCap,
  Rocket,
  Crown,
  Cpu,
  Video,
  BookOpen,
  UserCheck,
  Palette,
  Minus,
  Lock,
} from 'lucide-react'
import { toast } from '@/stores/toastStore'

interface TemplateCardProps {
  template: ProfileTemplate
  isSelected?: boolean
  isCurrent?: boolean
  onSelect?: (template: ProfileTemplate) => void
  showSelectButton?: boolean
  compact?: boolean
  isLocked?: boolean
}

// Icon mapper for template slugs
function getTemplateIcon(slug: string) {
  switch (slug) {
    case 'professional':
      return <Briefcase className="h-5 w-5" />
    case 'student':
      return <GraduationCap className="h-5 w-5" />
    case 'founder':
      return <Rocket className="h-5 w-5" />
    case 'executive':
      return <Crown className="h-5 w-5" />
    case 'engineer':
      return <Cpu className="h-5 w-5" />
    case 'creator':
      return <Video className="h-5 w-5" />
    case 'academic':
      return <BookOpen className="h-5 w-5" />
    case 'freelancer-consultant':
      return <UserCheck className="h-5 w-5" />
    case 'portfolio':
      return <Palette className="h-5 w-5" />
    case 'minimal':
      return <Minus className="h-5 w-5" />
    default:
      return <Layout className="h-5 w-5" />
  }
}

// Visual mini-wireframe for profile layout
function LayoutMiniWireframe({ heroStyle = 'clean' }: { heroStyle?: string }) {
  return (
    <div className="w-full h-20 rounded-xl bg-muted/40 border border-border/80 p-2 flex flex-col justify-between overflow-hidden relative select-none">
      {heroStyle === 'banner' && (
        <div className="space-y-1.5">
          <div className="w-full h-5 rounded-md bg-primary/20" />
          <div className="flex items-center gap-1.5 px-1">
            <div className="w-5 h-5 rounded-full bg-primary/40 -mt-2 ring-1 ring-background" />
            <div className="w-16 h-2 rounded bg-foreground/20" />
          </div>
        </div>
      )}
      {heroStyle === 'split' && (
        <div className="flex gap-2 h-full items-center">
          <div className="w-7 h-7 rounded-lg bg-primary/30 shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="w-3/4 h-2.5 rounded bg-foreground/20" />
            <div className="w-1/2 h-2 rounded bg-muted-foreground/30" />
          </div>
        </div>
      )}
      {heroStyle === 'media' && (
        <div className="space-y-1 h-full flex flex-col justify-between">
          <div className="flex gap-1.5 items-center">
            <div className="w-6 h-6 rounded-full bg-pink-500/30" />
            <div className="w-20 h-2.5 rounded bg-foreground/20" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="h-7 rounded bg-pink-500/10 border border-pink-500/20" />
            <div className="h-7 rounded bg-pink-500/10 border border-pink-500/20" />
            <div className="h-7 rounded bg-pink-500/10 border border-pink-500/20" />
          </div>
        </div>
      )}
      {heroStyle === 'compact' && (
        <div className="flex items-center justify-between h-full px-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-500/30" />
            <div className="w-14 h-2 rounded bg-foreground/20" />
          </div>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-muted" />
            <div className="w-4 h-4 rounded bg-muted" />
          </div>
        </div>
      )}
      {heroStyle === 'clean' && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-blue-500/30" />
            <div className="space-y-0.5 flex-1">
              <div className="w-20 h-2 rounded bg-foreground/25" />
              <div className="w-12 h-1.5 rounded bg-muted-foreground/30" />
            </div>
          </div>
          <div className="flex gap-1 pt-1">
            <div className="w-10 h-2.5 rounded bg-muted-foreground/15" />
            <div className="w-10 h-2.5 rounded bg-muted-foreground/15" />
            <div className="w-10 h-2.5 rounded bg-muted-foreground/15" />
          </div>
        </div>
      )}
    </div>
  )
}

export function TemplateCard({
  template,
  isSelected = false,
  isCurrent = false,
  onSelect,
  showSelectButton = true,
  compact = false,
  isLocked: propIsLocked,
}: TemplateCardProps) {
  const isLocked = template.slug === 'professional'
    ? false
    : (propIsLocked !== undefined
      ? propIsLocked
      : (template.isLocked !== undefined ? Boolean(template.isLocked) : true))
  const icon = getTemplateIcon(template.slug)
  const heroStyle = template.layoutConfig?.heroStyle || 'clean'

  return (
    <div
      onClick={() => {
        if (isLocked) {
          toast.default(`The "${template.name}" template is locked and coming soon... for now! The Basic Universal Template is active.`)
          return
        }
        if (onSelect) onSelect(template)
      }}
      className={`rounded-2xl border transition-all flex flex-col justify-between text-left relative overflow-hidden group ${
        isLocked
          ? 'border-border/60 bg-muted/15 cursor-not-allowed opacity-85 hover:border-amber-500/40'
          : isSelected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03] shadow-md cursor-pointer'
          : isCurrent
          ? 'border-emerald-500/50 bg-emerald-500/[0.02] hover:border-emerald-500 cursor-pointer'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer'
      } ${compact ? 'p-4 gap-3' : 'p-5 gap-4'}`}
    >
      {/* Top Banner / Badges */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isLocked
                  ? 'bg-muted text-muted-foreground'
                  : isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/15'
              }`}
            >
              {isLocked ? <Lock className="h-4 w-4 text-amber-500/80" /> : icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-foreground text-sm sm:text-base leading-tight">
                  {template.name}
                </h4>
                {!isLocked && template.isFeatured && (
                  <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {template.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isLocked ? (
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                <span>Coming Soon</span>
              </Badge>
            ) : isCurrent ? (
              <Badge variant="success" className="text-[10px] uppercase font-bold">
                Current
              </Badge>
            ) : isSelected ? (
              <span className="text-primary flex items-center gap-1 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            ) : null}
          </div>
        </div>

        {/* Visual Wireframe Preview */}
        {!compact && (
          <div className={isLocked ? 'opacity-60 filter grayscale-[40%]' : ''}>
            <LayoutMiniWireframe heroStyle={heroStyle} />
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {template.description}
        </p>

        {/* Recommended Sections Pills */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Recommended Sections
          </span>
          <div className="flex flex-wrap gap-1">
            {template.recommendedSectionIds.slice(0, 5).map((sec) => (
              <span
                key={sec}
                className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[10px] font-medium capitalize text-foreground/80"
              >
                {sec.replace(/_/g, ' ')}
              </span>
            ))}
            {template.recommendedSectionIds.length > 5 && (
              <span className="px-1.5 py-0.5 rounded-md bg-muted/40 text-[10px] text-muted-foreground font-semibold">
                +{template.recommendedSectionIds.length - 5}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {showSelectButton && (
        <div className="pt-3 border-t border-border/50 flex items-center justify-between">
          {isLocked ? (
            <>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Template Locked</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                className="h-7 text-xs px-3 opacity-70 cursor-not-allowed border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/5"
                onClick={(e) => {
                  e.stopPropagation()
                  toast.default(`The "${template.name}" template is coming soon... for now!`)
                }}
              >
                Coming Soon... for now
              </Button>
            </>
          ) : (
            onSelect && (
              <>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {isSelected ? 'Selected' : 'Click to choose'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className="h-7 text-xs px-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(template)
                  }}
                >
                  {isSelected ? 'Selected' : 'Use Template'}
                </Button>
              </>
            )
          )}
        </div>
      )}
    </div>
  )
}
