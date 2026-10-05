import * as React from 'react'
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
  Terminal,
  Activity,
  Stethoscope,
  TrendingUp,
  Award,
  Star,
  ShieldCheck,
  Share2,
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

const TEMPLATE_PREVIEW_IMAGES: Record<string, string> = {
  engineer: '/templates/engineer.png',
  doctor: '/templates/doctor.png',
  executive: '/templates/executive.png',
  academic: '/templates/academic.png',
}

interface ProfessionPreviewProps {
  slug: string
  category?: string
  name: string
  previewImage?: string | null
}

// Profession-specific visual background preview
function ProfessionVisualPreview({ slug, category, name, previewImage }: ProfessionPreviewProps) {
  const [imageError, setImageError] = React.useState(false)
  const imageSrc = !imageError ? (previewImage || TEMPLATE_PREVIEW_IMAGES[slug]) : null

  if (imageSrc) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border border-border/70 bg-muted/20 aspect-[2.22/1] select-none shadow-xs group-hover:shadow-md transition-all">
        <img
          src={imageSrc}
          alt={name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      </div>
    )
  }

  switch (slug) {
    case 'engineer':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/90 text-cyan-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500/90 inline-block" />
              <span className="w-2 h-2 rounded-full bg-amber-500/90 inline-block" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/90 inline-block" />
              <span className="text-[10px] font-mono text-cyan-300/80 ml-1">system.config.ts</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">
              <Terminal className="h-2.5 w-2.5 text-cyan-400" />
              <span>ONLINE</span>
            </span>
          </div>

          <div className="font-mono text-[10px] space-y-0.5 leading-snug">
            <p className="text-slate-400">
              <span className="text-purple-400">const</span> engineer = <span className="text-emerald-400">new</span> SystemsArchitect()
            </p>
            <p className="text-cyan-300 truncate">
              <span className="text-slate-500">&gt; </span>stack: [&quot;React&quot;, &quot;Node&quot;, &quot;Cloud&quot;, &quot;AI&quot;]
            </p>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-[9px] font-mono text-cyan-300">
              DevOps
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-[9px] font-mono text-cyan-300">
              Full-Stack
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-[9px] font-mono text-cyan-300">
              Microservices
            </span>
          </div>
        </div>
      )

    case 'doctor':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-emerald-500/30 bg-gradient-to-br from-slate-950 via-teal-950/80 to-emerald-950/90 text-emerald-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Stethoscope className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-200">Clinical Identity</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono">
              <Activity className="h-2.5 w-2.5 text-emerald-400 animate-pulse" />
              <span>BPM: 74</span>
            </span>
          </div>

          <div className="w-full flex items-center py-0.5">
            <svg className="w-full h-5 text-emerald-400 stroke-current opacity-85" viewBox="0 0 240 24" fill="none">
              <path
                d="M0,12 L55,12 L62,5 L68,20 L74,7 L80,16 L86,12 L150,12 L157,4 L163,21 L169,6 L175,15 L181,12 L240,12"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-[9px] font-medium text-emerald-300">
              Verified MD
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-[9px] font-medium text-emerald-300">
              Consultations
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-[9px] font-medium text-emerald-300">
              Medical Board
            </span>
          </div>
        </div>
      )

    case 'founder':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-violet-500/30 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-purple-950/90 text-purple-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Rocket className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-purple-200">Venture &amp; Leadership</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-mono">
              <TrendingUp className="h-2.5 w-2.5 text-amber-400" />
              <span>340% YoY</span>
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide">NextGen Tech Inc.</div>
              <div className="text-[9px] text-purple-300/80">Founder &amp; CEO • Series A</div>
            </div>
            <div className="w-12 h-5 flex items-end gap-1">
              <span className="w-2.5 h-2 rounded-t bg-purple-500/40" />
              <span className="w-2.5 h-3.5 rounded-t bg-purple-500/60" />
              <span className="w-2.5 h-5 rounded-t bg-amber-400" />
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-[9px] font-medium text-purple-300">
              Pitch Deck
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-[9px] font-medium text-purple-300">
              Angel Advisory
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-[9px] font-medium text-purple-300">
              Keynote
            </span>
          </div>
        </div>
      )

    case 'creator':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-rose-500/30 bg-gradient-to-br from-slate-950 via-rose-950/70 to-purple-950/90 text-rose-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-rose-500/20 text-rose-300 flex items-center justify-center">
                <Palette className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-rose-200">Creator Media Studio</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
              <Sparkles className="h-2.5 w-2.5 text-rose-400" />
              <span>4K Media</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="h-7 rounded-md bg-gradient-to-tr from-pink-500/30 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-[8px] font-medium text-pink-200 shadow-xs">
              Reels
            </div>
            <div className="h-7 rounded-md bg-gradient-to-tr from-amber-500/30 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-[8px] font-medium text-amber-200 shadow-xs">
              Design
            </div>
            <div className="h-7 rounded-md bg-gradient-to-tr from-violet-500/30 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center text-[8px] font-medium text-violet-200 shadow-xs">
              Brands
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-[9px] font-medium text-rose-300">
              Media Kit
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-[9px] font-medium text-rose-300">
              Collabs
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-[9px] font-medium text-rose-300">
              Portfolio
            </span>
          </div>
        </div>
      )

    case 'student':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-teal-500/30 bg-gradient-to-br from-slate-950 via-teal-950/70 to-blue-950/90 text-teal-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-teal-500/20 text-teal-300 flex items-center justify-center">
                <GraduationCap className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-teal-200">University &amp; Honors</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded-full font-mono">
              <Award className="h-2.5 w-2.5 text-teal-400" />
              <span>GPA 3.9</span>
            </span>
          </div>

          <div className="px-1">
            <div className="text-[11px] font-semibold text-white truncate">Computer Science &amp; Systems</div>
            <div className="text-[9px] text-teal-300/80 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
              <span>Class of 2026 • Dean&apos;s Honor List</span>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-500/30 text-[9px] font-medium text-teal-300">
              Research
            </span>
            <span className="px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-500/30 text-[9px] font-medium text-teal-300">
              Coursework
            </span>
            <span className="px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-500/30 text-[9px] font-medium text-teal-300">
              Projects
            </span>
          </div>
        </div>
      )

    case 'academic':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-amber-500/35 bg-gradient-to-br from-slate-950 via-amber-950/60 to-slate-900 text-amber-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <BookOpen className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-amber-200">Faculty &amp; Research</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-mono">
              <Award className="h-2.5 w-2.5 text-amber-400" />
              <span>Peer-Reviewed</span>
            </span>
          </div>

          <div className="px-1">
            <div className="text-[10.5px] font-medium text-amber-100 truncate">&ldquo;Advances in Machine Intelligence&rdquo;</div>
            <div className="text-[9px] text-amber-300/80 font-mono mt-0.5">h-index: 24 • 1,280+ Citations</div>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-[9px] font-medium text-amber-300">
              Publications
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-[9px] font-medium text-amber-300">
              Laboratory
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-[9px] font-medium text-amber-300">
              Conferences
            </span>
          </div>
        </div>
      )

    case 'executive':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-amber-500/35 bg-gradient-to-br from-slate-950 via-zinc-900 to-amber-950/40 text-amber-100 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Crown className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-amber-200">Executive &amp; Board</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
              <ShieldCheck className="h-2.5 w-2.5 text-amber-400" />
              <span>C-Suite</span>
            </span>
          </div>

          <div className="px-1">
            <div className="text-[11px] font-bold text-white tracking-wide">Enterprise Strategy &amp; Governance</div>
            <div className="text-[9px] text-amber-300/80 mt-0.5">Global P&amp;L • Board Director • M&amp;A</div>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-amber-500/30 text-[9px] font-medium text-amber-300">
              Board Seats
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-amber-500/30 text-[9px] font-medium text-amber-300">
              Global Scale
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-amber-500/30 text-[9px] font-medium text-amber-300">
              Press
            </span>
          </div>
        </div>
      )

    case 'freelancer-consultant':
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-orange-500/30 bg-gradient-to-br from-slate-950 via-amber-950/70 to-orange-950/80 text-amber-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-orange-500/20 text-orange-300 flex items-center justify-center">
                <UserCheck className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-orange-200">Consulting &amp; Advisory</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-mono">
              <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
              <span>5.0 (50+ Reviews)</span>
            </span>
          </div>

          <div className="px-1">
            <div className="text-[11px] font-semibold text-white">Fractional Strategy &amp; Delivery</div>
            <div className="text-[9px] text-amber-300/80 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Available for Client Bookings</span>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-500/30 text-[9px] font-medium text-orange-300">
              Book Call
            </span>
            <span className="px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-500/30 text-[9px] font-medium text-orange-300">
              Retainers
            </span>
            <span className="px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-500/30 text-[9px] font-medium text-orange-300">
              Case Studies
            </span>
          </div>
        </div>
      )

    case 'professional':
    default:
      return (
        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden p-2.5 sm:p-3 border border-blue-500/35 bg-gradient-to-br from-slate-950 via-blue-950/80 to-indigo-950/90 text-blue-200 flex flex-col justify-between shadow-inner select-none transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-blue-500/20 text-blue-300 flex items-center justify-center">
                <Briefcase className="h-2.5 w-2.5" />
              </div>
              <span className="text-[10px] font-semibold text-blue-200">{name || 'Universal Smart Identity'}</span>
            </div>
            <span className="flex items-center gap-1 text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>NFC Active</span>
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-black shadow-xs">
                1Q
              </div>
              <div>
                <div className="text-[11px] font-bold text-white leading-tight">Universal Profile</div>
                <div className="text-[8.5px] text-blue-300/80 font-mono">onewinq.me/live</div>
              </div>
            </div>
            <Share2 className="h-3.5 w-3.5 text-blue-400/80" />
          </div>

          <div className="flex items-center gap-1 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-[9px] font-medium text-blue-300">
              Bio &amp; Contact
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-[9px] font-medium text-blue-300">
              Social Links
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-[9px] font-medium text-blue-300">
              Instant Share
            </span>
          </div>
        </div>
      )
  }
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

        {/* Profession-specific visual background preview */}
        {!compact && (
          <ProfessionVisualPreview
            slug={template.slug}
            category={template.category}
            name={template.name}
            previewImage={template.previewImage}
          />
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
