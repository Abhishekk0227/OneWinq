import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/features/profile/api/profile.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { TemplateCard } from '@/components/profile/TemplateCard'
import { toast } from '@/stores/toastStore'
import type { ProfileTemplate } from '@/types/profile.types'
import {
  LayoutTemplate,
  Sparkles,
  Search,
  CheckCircle2,
  Info,
  ArrowRight,
  Crown,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProfileTemplatesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('all')
  const [isRecommendationsOpen, setIsRecommendationsOpen] = React.useState(false)

  // 1. Fetch user profile
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => profileApi.getMyProfile(),
  })
  const profile = profileData?.data?.profile

  // 2. Fetch full dynamic recommendations (Template + Roles)
  const { data: recData } = useQuery({
    queryKey: ['profile-recommendations'],
    queryFn: () => profileApi.getRecommendations(),
  })
  const recommendations = recData?.data

  // 3. Fetch template catalog
  const { data: templatesData, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['profile-templates'],
    queryFn: () => profileApi.getTemplates(),
  })
  const templates: ProfileTemplate[] = templatesData?.data?.templates || []

  const availableCategories = React.useMemo(() => {
    const cats = Array.from(new Set(templates.map((t) => t.category).filter(Boolean)))
    return ['all', ...cats]
  }, [templates])

  // Switch Template Mutation
  const switchTemplateMutation = useMutation({
    mutationFn: (payload: { templateId?: string; templateSlug?: string }) =>
      profileApi.updateTemplate(payload),
    onSuccess: (res) => {
      toast.success(
        `Profile template switched to "${res.data.template.name}". All your existing data is preserved!`
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
      queryClient.invalidateQueries({ queryKey: ['profile-recommendations'] })
      queryClient.invalidateQueries({ queryKey: ['recommended-sections'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to switch template')
    },
  })

  // Active template determination
  const rawTemplate = (profile as any)?.templateId
  const activeTemplate =
    recommendations?.activeTemplate ||
    (typeof rawTemplate === 'object' && rawTemplate !== null ? rawTemplate : null) ||
    templates.find((t) => t.id === rawTemplate || (t as any)?._id === rawTemplate) ||
    templates.find((t) => t.slug === 'professional') ||
    templates[0]

  const activeSlug = activeTemplate?.slug || 'professional'

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' || tpl.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  if (isProfileLoading || isTemplatesLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 text-left pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span>Profile Presentation Templates</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Choose How to Present Your Identity
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Templates define your foundational layout structure and baseline section recommendations. Choose any template below — your content is always preserved, and you can switch anytime.
            </p>
          </div>

          {/* Active Template Status Badge */}
          {activeTemplate && (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1.5 shrink-0 min-w-[220px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Current Active Template
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">
                  {activeTemplate.name}
                </span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground capitalize block">
                Category: {activeTemplate.category}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Consolidated Template Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <strong className="text-foreground font-bold block">
              Basic Universal Template Active
            </strong>
            <p className="text-muted-foreground leading-relaxed">
              Your profile currently uses the Universal Template. You can customize your bio, contact details, and social links in the Profile Builder. Specialized industry templates (Engineer, Doctor, Creator) are locked and rolling out soon.
            </p>
          </div>
        </div>
        <Link to="/app/profile/edit" className="shrink-0 self-end sm:self-center">
          <Button variant="outline" size="sm" className="text-xs h-8">
            Profile Builder
          </Button>
        </Link>
      </div>

      {/* Dynamic Recommendation Breakdown Card (Collapsible) */}
      {recommendations && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsRecommendationsOpen(!isRecommendationsOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-foreground text-xs sm:text-sm">
                Synthesized Recommendations for Your Profile
              </h3>
              <Badge variant="subtle" className="text-[10px] px-1.5 py-0">
                {recommendations.combinedRecommendations?.length || 0} recommended
              </Badge>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                  isRecommendationsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <Link to="/app/profile/edit">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                <span>Builder</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {isRecommendationsOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Existing Active Sections ({recommendations.existingSections?.length || 0})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(recommendations.existingSections || []).map((sec) => (
                    <Badge key={sec} variant="outline" className="capitalize text-xs bg-background">
                      ✓ {sec.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {(!recommendations.existingSections || recommendations.existingSections.length === 0) && (
                    <span className="text-xs text-muted-foreground">No sections created yet.</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-primary" />
                  <span>Recommended by Active Template + Roles ({recommendations.combinedRecommendations?.length || 0})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(recommendations.combinedRecommendations || []).map((sec) => {
                    const isExisting = recommendations.existingSections?.includes(sec)
                    return (
                      <Badge
                        key={sec}
                        variant={isExisting ? 'default' : 'outline'}
                        className={`capitalize text-xs ${
                          isExisting ? 'bg-primary/15 text-primary border-primary/30' : 'bg-background'
                        }`}
                      >
                        {isExisting ? '✓ ' : '+ '}
                        {sec.replace(/_/g, ' ')}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Catalog Search & Category Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by role, industry, or description..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {availableCategories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="text-xs capitalize whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((tpl) => {
            const isCurrent = activeSlug === tpl.slug
            const isLocked = tpl.slug === 'professional' ? false : (tpl.isLocked !== undefined ? Boolean(tpl.isLocked) : true)

            return (
              <TemplateCard
                key={tpl._id || tpl.slug}
                template={tpl}
                isCurrent={isCurrent}
                isSelected={isCurrent}
                isLocked={isLocked}
                onSelect={(t) => {
                  if (isLocked) {
                    toast.default(`The "${t.name}" template is locked and coming soon... for now! The Basic Universal Template is active.`)
                    return
                  }
                  if (!isCurrent) {
                    switchTemplateMutation.mutate({ templateSlug: t.slug })
                  }
                }}
                showSelectButton
              />
            )
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground text-base">No templates found</h3>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search query or category filter.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
