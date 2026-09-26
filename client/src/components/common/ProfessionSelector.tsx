import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { professionsApi } from '@/features/professions/api/professions.api'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/stores/toastStore'
import {
  Search,
  Plus,
  Check,
  Briefcase,
  Sparkles,
  Layers,
  GraduationCap,
  Activity,
  Shield,
  DollarSign,
  Palette,
  TrendingUp,
  Code,
} from 'lucide-react'
import type { Profession, ProfessionCategory } from '@/types/networking.types'

export interface SelectedProfessionResult {
  professionId?: string | null
  customTitle: string
  isOfficial: boolean
  recommendedSectionTypes: string[]
}

interface ProfessionSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: SelectedProfessionResult) => void
  initialSelectedId?: string | null
  title?: string
  description?: string
}

export function ProfessionSelector({
  open,
  onOpenChange,
  onSelect,
  initialSelectedId,
  title = 'Choose your profession',
  description = 'Select an industry specialty or specify a custom role to configure your identity.',
}: ProfessionSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState<string>('all')
  const [customTitle, setCustomTitle] = React.useState('')
  const [isAddingCustom, setIsAddingCustom] = React.useState(false)

  // Fetch Categories
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['professions-categories'],
    queryFn: () => professionsApi.getCategories(),
    enabled: open,
  })

  // Fetch / Search Professions
  const { data: professionsData, isLoading: isProfessionsLoading } = useQuery({
    queryKey: ['professions-search', searchQuery, selectedCategorySlug],
    queryFn: () =>
      professionsApi.search({
        query: searchQuery.trim(),
        category: selectedCategorySlug === 'all' ? undefined : selectedCategorySlug,
        limit: 100,
      }),
    enabled: open,
  })

  const customProfessionMutation = useMutation({
    mutationFn: (name: string) => professionsApi.createCustom({ name }),
    onSuccess: (res) => {
      const p = res.data.profession
      toast.success(`Custom profession "${p.name}" added!`)
      onSelect({
        professionId: p._id || p.id,
        customTitle: p.name,
        isOfficial: false,
        recommendedSectionTypes: p.recommendedSectionTypes || ['experience', 'skills', 'projects'],
      })
      onOpenChange(false)
      setIsAddingCustom(false)
      setCustomTitle('')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to create custom profession')
    },
  })

  const categories = categoriesData?.data?.categories || []
  const professions = React.useMemo(() => {
    const raw = professionsData?.data?.professions || []
    const seen = new Set<string>()
    return raw.filter((p: Profession) => {
      const key = (p.name || '').trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [professionsData])

  const handleSelectProfession = (prof: Profession) => {
    onSelect({
      professionId: prof._id || prof.id,
      customTitle: prof.name,
      isOfficial: prof.isOfficial ?? true,
      recommendedSectionTypes: prof.recommendedSectionTypes || [],
    })
    onOpenChange(false)
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = customTitle.trim()
    if (trimmed.length < 2 || trimmed.length > 80) {
      toast.error('Custom profession must be between 2 and 80 characters.')
      return
    }
    customProfessionMutation.mutate(trimmed)
  }

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'code':
        return <Code className="h-3.5 w-3.5" />
      case 'activity':
        return <Activity className="h-3.5 w-3.5" />
      case 'graduation-cap':
        return <GraduationCap className="h-3.5 w-3.5" />
      case 'palette':
        return <Palette className="h-3.5 w-3.5" />
      case 'dollar-sign':
        return <DollarSign className="h-3.5 w-3.5" />
      case 'shield':
        return <Shield className="h-3.5 w-3.5" />
      case 'trending-up':
        return <TrendingUp className="h-3.5 w-3.5" />
      default:
        return <Briefcase className="h-3.5 w-3.5" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search professions (e.g. Software Engineer, Doctor, Student, Designer)..."
            className="pl-9 text-xs"
          />
        </div>

        {/* Categories Tab Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategorySlug('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedCategorySlug === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>All Domains</span>
          </button>
          {categories.map((c: ProfessionCategory) => (
            <button
              key={c.id || (c as any)._id || c.slug}
              type="button"
              onClick={() => setSelectedCategorySlug(c.slug)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategorySlug === c.slug
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {getCategoryIcon(c.icon)}
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Professions List */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {isProfessionsLoading || isCategoriesLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading catalog...
            </div>
          ) : professions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                No matching professions found for &ldquo;{searchQuery}&rdquo;.
              </p>
              {!isAddingCustom && (
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setIsAddingCustom(true)
                    setCustomTitle(searchQuery)
                  }}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add &ldquo;{searchQuery || 'Custom Role'}&rdquo;
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {professions.map((p: Profession) => {
                const isSelected = initialSelectedId === (p._id || p.id)
                return (
                  <button
                    key={p._id || p.id}
                    type="button"
                    onClick={() => handleSelectProfession(p)}
                    className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-soft text-primary shadow-sm ring-1 ring-primary'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{p.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    {p.subtitle && (
                      <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {p.subtitle}
                      </span>
                    )}
                    {p.recommendedSectionTypes && p.recommendedSectionTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.recommendedSectionTypes.slice(0, 3).map((sec: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground capitalize"
                          >
                            {sec}
                          </span>
                        ))}
                        {p.recommendedSectionTypes.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                            +{p.recommendedSectionTypes.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Can't find profession footer / custom adder */}
        <div className="pt-2 border-t border-border">
          {isAddingCustom ? (
            <form onSubmit={handleAddCustom} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Specify Custom Profession</span>
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="text-muted-foreground hover:underline text-[11px]"
                >
                  Cancel
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. AI Automation Consultant, Web3 Researcher"
                  className="text-xs flex-1"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  isLoading={customProfessionMutation.isPending}
                  disabled={customTitle.trim().length < 2}
                >
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Can&apos;t find your exact title?
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-primary font-semibold"
                onClick={() => setIsAddingCustom(true)}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add Custom Profession
              </Button>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
