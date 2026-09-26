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
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProfileTemplatesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('all')

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

      {/* Basic Universal Template Active Banner */}
      <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-xs text-amber-950 dark:text-amber-200 shadow-xs">
        <div className="w-9 h-9 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
          <Lock className="h-4.5 w-4.5" />
        </div>
        <div className="space-y-1">
          <strong className="text-foreground font-bold text-sm block">
            Basic Universal Template Active for All Accounts
          </strong>
          <p className="text-muted-foreground leading-relaxed text-xs">
            All user profiles currently utilize the <strong>Basic Universal Template</strong> with fixed, essential fields (Bio, Contact Details, and Social Profiles). Industry-specific templates (Engineer, Doctor, Founder, Creator, etc.) are locked and <strong>Coming Soon... for now</strong>!
          </p>
        </div>
      </div>

      {/* Safety & Non-Destructive Reassurance Alert */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3.5 text-xs text-muted-foreground">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-foreground font-semibold">
            Universal Smart Profile:
          </strong>
          <p>
            Your profile is powered by the Basic Universal Template. You can customize your bio, contact information, and social links freely in the Profile Builder.
          </p>
        </div>
      </div>

      {/* Dynamic Recommendation Breakdown Card */}
      {recommendations && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-foreground text-sm">
                Synthesized Recommendations for Your Profile
              </h3>
            </div>
            <Link to="/app/profile/edit">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <span>Customize Sections in Builder</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
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

            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
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
