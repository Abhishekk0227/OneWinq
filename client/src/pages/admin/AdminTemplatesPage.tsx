import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { TemplateCard } from '@/components/profile/TemplateCard'
import { toast } from '@/stores/toastStore'
import type { ProfileTemplate } from '@/types/profile.types'
import {
  LayoutTemplate,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Star,
  Eye,
  Lock,
  Unlock,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react'

// Section ID → human label mapping. IDs must match what ProfileEditPage and backend expect.
const AVAILABLE_SECTIONS: { id: string; label: string }[] = [
  { id: 'about', label: 'About / Bio' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'services', label: 'Services' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'organizations', label: 'Organizations / Ventures' },
  { id: 'mediaGallery', label: 'Media Gallery' },
  { id: 'socialLinks', label: 'Social Links' },
  { id: 'publications', label: 'Publications' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'awards', label: 'Awards' },
  { id: 'courses', label: 'Courses' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'research', label: 'Research' },
  { id: 'contact', label: 'Contact Info' },
  { id: 'customSections', label: 'Custom Sections' },
]

const SECTION_LABEL: Record<string, string> = Object.fromEntries(
  AVAILABLE_SECTIONS.map(({ id, label }) => [id, label])
)

const TEMPLATE_CATEGORIES = [
  'Engineering & Tech',
  'Healthcare & Medicine',
  'Ventures & Business',
  'Media & Creative',
  'Academia & Education',
  'Executive & Leadership',
  'Consulting & Services',
  'Universal & Custom',
]

const HERO_STYLES = ['clean', 'banner', 'split', 'media', 'compact']

export default function AdminTemplatesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')

  // Multi-select state
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<ProfileTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = React.useState<ProfileTemplate | null>(null)

  // Form State
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState('general')
  const [recommendedSections, setRecommendedSections] = React.useState<string[]>([])
  const [heroStyle, setHeroStyle] = React.useState('clean')
  const [status, setStatus] = React.useState<'active' | 'draft' | 'archived'>('active')
  const [displayOrder, setDisplayOrder] = React.useState<number>(0)
  const [isFeatured, setIsFeatured] = React.useState(false)
  const [isLocked, setIsLocked] = React.useState(false)

  // Fetch Templates
  const { data, isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => adminApi.listTemplates(),
  })

  const templates: ProfileTemplate[] = data?.data?.templates || []

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => adminApi.createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      queryClient.invalidateQueries({ queryKey: ['profile-templates'] })
      toast.success('Template created successfully!')
      handleCloseModal()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to create template')
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminApi.updateTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      queryClient.invalidateQueries({ queryKey: ['profile-templates'] })
      toast.success('Template updated successfully!')
      handleCloseModal()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update template')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      queryClient.invalidateQueries({ queryKey: ['profile-templates'] })
      toast.success('Template deleted')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to delete template')
    },
  })

  // Single Lock/Unlock Mutation
  const toggleLockMutation = useMutation({
    mutationFn: ({ id, isLocked }: { id: string; isLocked: boolean }) =>
      adminApi.toggleTemplateLock(id, isLocked),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      queryClient.invalidateQueries({ queryKey: ['profile-templates'] })
      toast.success(
        variables.isLocked
          ? 'Template locked (Coming Soon badge active)'
          : 'Template unlocked and now live for all users!'
      )
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update lock status')
    },
  })

  // Bulk Lock/Unlock Mutation
  const bulkLockMutation = useMutation({
    mutationFn: ({ isLocked, templateIds }: { isLocked: boolean; templateIds?: string[] }) =>
      adminApi.bulkLockTemplates(isLocked, templateIds),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      queryClient.invalidateQueries({ queryKey: ['profile-templates'] })
      setSelectedIds([])
      toast.success(
        res?.data?.message ||
          (variables.isLocked
            ? 'Templates locked (Coming Soon active)'
            : 'Templates unlocked for all users!')
      )
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update templates')
    },
  })

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setName('')
    setSlug('')
    setDescription('')
    setCategory('general')
    setRecommendedSections(['About', 'Experience', 'Skills', 'Projects'])
    setHeroStyle('clean')
    setStatus('active')
    setDisplayOrder(templates.length)
    setIsFeatured(false)
    setIsLocked(true)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (tpl: ProfileTemplate) => {
    setEditingTemplate(tpl)
    setName(tpl.name)
    setSlug(tpl.slug)
    setDescription(tpl.description)
    setCategory(tpl.category || 'general')
    setRecommendedSections(tpl.recommendedSectionIds || [])
    setHeroStyle(tpl.layoutConfig?.heroStyle || 'clean')
    const rawStatus = (tpl.status || 'active').toLowerCase()
    setStatus(rawStatus === 'draft' ? 'draft' : rawStatus === 'archived' ? 'archived' : 'active')
    setDisplayOrder(tpl.displayOrder ?? 0)
    setIsFeatured(!!tpl.isFeatured)
    setIsLocked(tpl.slug === 'professional' ? false : Boolean(tpl.isLocked))
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTemplate(null)
  }

  const handleToggleSection = (sec: string) => {
    setRecommendedSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim() ? slug.trim().toLowerCase() : undefined,
      description: description.trim(),
      category,
      recommendedSectionIds: recommendedSections,
      layoutConfig: { heroStyle },
      status,
      displayOrder: Number(displayOrder) || 0,
      isFeatured,
      isLocked: editingTemplate?.slug === 'professional' ? false : isLocked,
    }

    if (editingTemplate) {
      const id = editingTemplate._id || (editingTemplate as any).id
      updateMutation.mutate({ id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // Filtered Templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || tpl.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Multi-selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const selectableTemplates = filteredTemplates.filter((t) => t.slug !== 'professional')
    const allSelectableIds = selectableTemplates.map((t) => t._id || (t as any).id)
    if (selectedIds.length === allSelectableIds.length && allSelectableIds.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(allSelectableIds)
    }
  }

  const handleUnlockSelected = () => {
    if (selectedIds.length === 0) return
    bulkLockMutation.mutate({ isLocked: false, templateIds: selectedIds })
  }

  const handleLockSelected = () => {
    if (selectedIds.length === 0) return
    bulkLockMutation.mutate({ isLocked: true, templateIds: selectedIds })
  }

  const handleUnlockAll = () => {
    if (
      window.confirm(
        'Unlock all templates at once? All registered users will immediately be able to choose and use any template.'
      )
    ) {
      bulkLockMutation.mutate({ isLocked: false })
    }
  }

  const handleLockAll = () => {
    if (
      window.confirm(
        'Lock all templates at once? All templates will show "Coming Soon... for now", while the Basic Universal Template remains active.'
      )
    ) {
      bulkLockMutation.mutate({ isLocked: true })
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  const selectableTemplates = filteredTemplates.filter((t) => t.slug !== 'professional')
  const isAllSelectableChecked =
    selectableTemplates.length > 0 && selectedIds.length === selectableTemplates.length

  return (
    <div className="space-y-6">
      {/* Header & Global Bulk Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Profile Templates</h1>
            <Badge variant="outline" className="text-xs border-white/10 text-white/80 bg-white/5">
              {templates.length} Templates
            </Badge>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Manage presentation wireframes, lock/unlock availability for users, and configure baseline layout recommendations.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            onClick={handleUnlockAll}
            isLoading={
              bulkLockMutation.isPending &&
              !(bulkLockMutation.variables as any)?.isLocked &&
              !(bulkLockMutation.variables as any)?.templateIds
            }
          >
            <Unlock className="h-3.5 w-3.5" />
            Unlock All Templates
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            onClick={handleLockAll}
            isLoading={
              bulkLockMutation.isPending &&
              Boolean((bulkLockMutation.variables as any)?.isLocked) &&
              !(bulkLockMutation.variables as any)?.templateIds
            }
          >
            <Lock className="h-3.5 w-3.5" />
            Lock All Templates
          </Button>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="gap-1.5 text-xs"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Create Template
          </Button>
        </div>
      </div>

      {/* Floating Selection Bar (when 1 or more items selected) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/40 bg-[#161622]/95 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="text-xs px-2.5 py-0.5 font-semibold">
              {selectedIds.length} Selected
            </Badge>
            <span className="text-xs text-neutral-300 hidden sm:inline">
              Apply bulk lock/unlock action to selected templates:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              isLoading={
                bulkLockMutation.isPending &&
                !(bulkLockMutation.variables as any)?.isLocked &&
                Boolean((bulkLockMutation.variables as any)?.templateIds)
              }
              onClick={handleUnlockSelected}
            >
              <Unlock className="h-3.5 w-3.5" />
              Unlock Selected ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              isLoading={
                bulkLockMutation.isPending &&
                Boolean((bulkLockMutation.variables as any)?.isLocked) &&
                Boolean((bulkLockMutation.variables as any)?.templateIds)
              }
              onClick={handleLockSelected}
            >
              <Lock className="h-3.5 w-3.5" />
              Lock Selected ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8 text-neutral-400 hover:text-white"
              onClick={() => setSelectedIds([])}
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Select All Toggle */}
        <button
          type="button"
          onClick={handleSelectAll}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-white/10 bg-[#16161f] text-neutral-300 hover:border-white/20 transition-all shrink-0"
        >
          {isAllSelectableChecked ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-neutral-400" />
          )}
          <span>{isAllSelectableChecked ? 'Deselect All' : 'Select All'}</span>
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by name, slug, or description..."
            className="pl-9 bg-[#16161f] border-white/10 text-white placeholder:text-neutral-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="text-xs capitalize"
          >
            All Categories
          </Button>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="text-xs capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => {
          const tplId = tpl._id || (tpl as any).id
          const isUniversal = tpl.slug === 'professional'
          const isCardLocked = isUniversal ? false : (tpl.isLocked !== undefined ? Boolean(tpl.isLocked) : true)
          const isSelected = selectedIds.includes(tplId)

          return (
            <div
              key={tplId || tpl.slug}
              className={`rounded-2xl border bg-[#16161f] p-5 flex flex-col justify-between space-y-4 transition-all relative ${
                isSelected
                  ? 'border-primary shadow-lg shadow-primary/5 bg-[#171724]'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-3">
                {/* Top Row: Multi-select Checkbox + Title + Status Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox (Universal is protected from batch actions) */}
                    {!isUniversal ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(tplId)}
                        className="mt-1 rounded border-white/20 bg-[#101016] text-primary h-4 w-4 cursor-pointer"
                        title="Select for bulk lock/unlock"
                      />
                    ) : (
                      <div className="mt-1 w-4 h-4 flex items-center justify-center text-neutral-600" title="Core Universal template">
                        •
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-white text-base">{tpl.name}</h3>
                        {tpl.isFeatured && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-300 border-amber-500/30">
                            <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-300" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-xs text-primary">/{tpl.slug}</span>
                    </div>
                  </div>

                  {/* Lock / Unlock Status Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isUniversal ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-300 bg-emerald-500/10 flex items-center gap-1 font-medium"
                      >
                        <ShieldCheck className="h-3 w-3 text-emerald-400" />
                        Universal Live
                      </Badge>
                    ) : isCardLocked ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 border-amber-500/30 text-amber-300 bg-amber-500/10 flex items-center gap-1 font-medium"
                      >
                        <Lock className="h-3 w-3 text-amber-400" />
                        Locked (Coming Soon)
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-300 bg-emerald-500/10 flex items-center gap-1 font-medium"
                      >
                        <Unlock className="h-3 w-3 text-emerald-400" />
                        Unlocked (Live)
                      </Badge>
                    )}

                    <Badge
                      variant={(tpl.status || '').toLowerCase() === 'active' ? 'default' : 'secondary'}
                      className="text-[9px] uppercase px-1.5 py-0"
                    >
                      {tpl.status}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 line-clamp-2">{tpl.description}</p>

                {/* Wireframe Tag + Category */}
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] capitalize">
                    Layout: {tpl.layoutConfig?.heroStyle || 'clean'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] capitalize">
                    {tpl.category}
                  </span>
                </div>

                {/* Recommended Sections Chips */}
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                    Recommended Sections ({tpl.recommendedSectionIds.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tpl.recommendedSectionIds.slice(0, 5).map((sec) => (
                      <span
                        key={sec}
                        className="px-2 py-0.5 rounded-md bg-white/5 text-neutral-300 text-[10px] border border-white/5 capitalize"
                      >
                        {SECTION_LABEL[sec] || sec.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {tpl.recommendedSectionIds.length > 5 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-neutral-400 text-[10px]">
                        +{tpl.recommendedSectionIds.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Action Buttons & Lock Toggle */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-neutral-400 hover:text-white h-8 px-2 gap-1.5"
                  onClick={() => setPreviewTemplate(tpl)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>

                <div className="flex items-center gap-1.5">
                  {/* One-click Lock / Unlock Toggle Button */}
                  {!isUniversal ? (
                    isCardLocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-2.5 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        isLoading={
                          toggleLockMutation.isPending &&
                          (toggleLockMutation.variables as any)?.id === tplId
                        }
                        onClick={() =>
                          toggleLockMutation.mutate({ id: tplId, isLocked: false })
                        }
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Unlock
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-2.5 gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                        isLoading={
                          toggleLockMutation.isPending &&
                          (toggleLockMutation.variables as any)?.id === tplId
                        }
                        onClick={() =>
                          toggleLockMutation.mutate({ id: tplId, isLocked: true })
                        }
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Lock
                      </Button>
                    )
                  ) : (
                    <span className="text-[11px] text-neutral-500 px-1 italic">
                      Core Live
                    </span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2.5 gap-1.5 border-white/15 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => handleOpenEdit(tpl)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    disabled={isUniversal}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete template "${tpl.name}"?`)) {
                        deleteMutation.mutate(tplId)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#16161f] space-y-3">
          <LayoutTemplate className="h-10 w-10 text-neutral-500 mx-auto" />
          <h3 className="font-bold text-white text-base">No profile templates found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Try adjusting your search query or category filters, or create a brand new template.
          </p>
        </div>
      )}

      {/* Create / Edit Template Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create Profile Template'}
            </DialogTitle>
            <DialogDescription>
              Configure the baseline layout wireframe, category, lock availability, and recommended profile sections.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-3 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Template Name</label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!editingTemplate) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                    }
                  }}
                  placeholder="e.g. Healthcare Professional"
                  className="bg-[#101016] border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Slug</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="e.g. healthcare-professional"
                  className="bg-[#101016] border-white/10 text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-200">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain who this template is best suited for and what it emphasizes..."
                className="bg-[#101016] border-white/10 text-white text-xs h-20"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-white/10 bg-[#101016] text-white px-3 text-xs capitalize"
                >
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Hero Wireframe</label>
                <select
                  value={heroStyle}
                  onChange={(e) => setHeroStyle(e.target.value)}
                  className="w-full h-9 rounded-md border border-white/10 bg-[#101016] text-white px-3 text-xs capitalize"
                >
                  {HERO_STYLES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s} layout
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-white/10 bg-[#101016] text-white px-3 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Display Order</label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="bg-[#101016] border-white/10 text-white"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="featured-toggle"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-white/20 bg-[#101016] text-primary h-4 w-4"
                  />
                  <label htmlFor="featured-toggle" className="text-xs font-semibold text-neutral-200 cursor-pointer">
                    Mark as Featured Template
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lock-toggle"
                    checked={isLocked}
                    onChange={(e) => setIsLocked(e.target.checked)}
                    disabled={editingTemplate?.slug === 'professional'}
                    className="rounded border-white/20 bg-[#101016] text-primary h-4 w-4 disabled:opacity-50"
                  />
                  <label htmlFor="lock-toggle" className="text-xs font-semibold text-neutral-200 cursor-pointer">
                    Lock Template (Shows &quot;Coming Soon... for now&quot;)
                  </label>
                </div>
              </div>
            </div>

            {/* Recommended Sections Selector */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-200">
                  Recommended Profile Sections ({recommendedSections.length} selected)
                </label>
                <span className="text-[11px] text-neutral-400">Click to toggle</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_SECTIONS.map(({ id, label }) => {
                  const isChecked = recommendedSections.includes(id)
                  return (
                    <div
                      key={id}
                      onClick={() => handleToggleSection(id)}
                      className={`p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                        isChecked
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-white/10 bg-[#101016] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editingTemplate ? 'Save Template Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Preview Card Modal */}
      {previewTemplate && (
        <Dialog open={Boolean(previewTemplate)} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogHeader>
            <DialogTitle>Template User-Card Preview</DialogTitle>
            <DialogDescription>
              This is how users see this template card during onboarding and inside Edit Profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <div className="w-full max-w-sm">
              <TemplateCard
                template={previewTemplate}
                showSelectButton={false}
                isLocked={
                  previewTemplate.slug === 'professional'
                    ? false
                    : (previewTemplate.isLocked !== undefined ? Boolean(previewTemplate.isLocked) : true)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setPreviewTemplate(null)}>
              Close Preview
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
