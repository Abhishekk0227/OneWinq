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
  Search,
  ArrowLeft,
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
    <div className="w-full max-w-6xl mx-auto space-y-5 text-left pb-24">
      {/* Sleek Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Profile Templates
            </h1>
            <Badge variant="subtle" className="text-xs">
              Layouts
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Select a presentation layout for your identity. Your content and data are always preserved when switching.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {activeTemplate && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Active
                </span>
                <span className="font-bold text-foreground text-xs sm:text-sm">
                  {activeTemplate.name}
                </span>
              </div>
            </div>
          )}
          <Link to="/app/profile/edit">
            <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Profile Builder</span>
            </Button>
          </Link>
        </div>
      </div>

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
