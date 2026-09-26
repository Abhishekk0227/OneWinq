import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { professionsApi } from '@/features/professions/api/professions.api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import {
  Briefcase,
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Tag,
  FolderPlus,
  Compass,
  LayoutTemplate,
  Info,
} from 'lucide-react'
import type { Profession, ProfessionCategory } from '@/types/networking.types'

// All available profile section types — these define the recommended template sections per profession
const ALL_SECTION_TYPES = [
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'services',
  'awards',
  'speaking',
  'publications',
  'organizations',
  'mediaGallery',
  'socialLinks',
  'contact',
  'research',
  'customSections',
]

const SECTION_LABELS: Record<string, string> = {
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  services: 'Services',
  awards: 'Awards',
  speaking: 'Speaking',
  publications: 'Publications',
  organizations: 'Organizations',
  mediaGallery: 'Media Gallery',
  socialLinks: 'Social Links',
  contact: 'Contact Info',
  research: 'Research',
  customSections: 'Custom Sections',
}

export default function AdminProfessionsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState<'professions' | 'categories'>('professions')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string>('all')

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<ProfessionCategory | null>(null)
  const [categoryName, setCategoryName] = React.useState('')
  const [categoryIcon, setCategoryIcon] = React.useState('')
  const [categoryOrder, setCategoryOrder] = React.useState<number>(0)

  // Profession/Template Modal State
  const [isProfessionModalOpen, setIsProfessionModalOpen] = React.useState(false)
  const [editingProfession, setEditingProfession] = React.useState<Profession | null>(null)
  const [professionName, setProfessionName] = React.useState('')
  const [professionSubtitle, setProfessionSubtitle] = React.useState('')
  const [professionAliases, setProfessionAliases] = React.useState('')
  const [professionCategoryId, setProfessionCategoryId] = React.useState<string>('')
  const [professionRecommendedSections, setProfessionRecommendedSections] = React.useState<string[]>([])
  const [professionIsOfficial, setProfessionIsOfficial] = React.useState<boolean>(true)

  // Queries
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['admin-profession-categories'],
    queryFn: () => professionsApi.getCategories(),
  })

  const { data: professionsData, isLoading: isProfessionsLoading } = useQuery({
    queryKey: ['admin-professions-list', searchQuery, selectedCategoryFilter],
    queryFn: () =>
      professionsApi.search({
        query: searchQuery,
        category: selectedCategoryFilter === 'all' ? undefined : selectedCategoryFilter,
        limit: 100,
      }),
  })

  const categories = categoriesData?.data?.categories || []
  const professions = professionsData?.data?.professions || []

  // Mutations - Categories
  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      if (editingCategory) {
        return professionsApi.adminUpdateCategory(editingCategory._id, {
          name: categoryName,
          icon: categoryIcon,
          displayOrder: Number(categoryOrder),
        })
      } else {
        return professionsApi.adminCreateCategory({
          name: categoryName,
          icon: categoryIcon,
          displayOrder: Number(categoryOrder),
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profession-categories'] })
      queryClient.invalidateQueries({ queryKey: ['professions-categories'] })
      toast.success(editingCategory ? 'Category updated' : 'Category created')
      setIsCategoryModalOpen(false)
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to save category')
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => professionsApi.adminDeleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profession-categories'] })
      queryClient.invalidateQueries({ queryKey: ['professions-categories'] })
      toast.success('Category deleted / deactivated')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to delete category')
    },
  })

  // Mutations - Professions (= Templates)
  const saveProfessionMutation = useMutation({
    mutationFn: async () => {
      const aliasesArray = professionAliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)

      if (editingProfession) {
        return professionsApi.adminUpdateProfession(editingProfession._id, {
          name: professionName,
          subtitle: professionSubtitle,
          aliases: aliasesArray,
          categoryId: professionCategoryId || undefined,
          recommendedSectionTypes: professionRecommendedSections,
          isOfficial: professionIsOfficial,
        } as any)
      } else {
        return professionsApi.adminCreateProfession({
          name: professionName,
          categoryId: professionCategoryId || undefined,
          recommendedSectionTypes: professionRecommendedSections,
          isOfficial: professionIsOfficial,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-professions-list'] })
      queryClient.invalidateQueries({ queryKey: ['professions-search'] })
      queryClient.invalidateQueries({ queryKey: ['professions-categories'] })
      toast.success(editingProfession ? 'Profession template updated' : 'Profession template created')
      setIsProfessionModalOpen(false)
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to save profession template')
    },
  })

  const deleteProfessionMutation = useMutation({
    mutationFn: (id: string) => professionsApi.adminDeleteProfession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-professions-list'] })
      queryClient.invalidateQueries({ queryKey: ['professions-search'] })
      toast.success('Profession deactivated')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to deactivate profession')
    },
  })

  // Modal Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryIcon('')
    setCategoryOrder(categories.length)
    setIsCategoryModalOpen(true)
  }

  const handleOpenEditCategory = (cat: ProfessionCategory) => {
    setEditingCategory(cat)
    setCategoryName(cat.name)
    setCategoryIcon(cat.icon || '')
    setCategoryOrder(cat.displayOrder || 0)
    setIsCategoryModalOpen(true)
  }

  const handleOpenAddProfession = () => {
    setEditingProfession(null)
    setProfessionName('')
    setProfessionSubtitle('')
    setProfessionAliases('')
    setProfessionCategoryId(categories[0]?._id || '')
    setProfessionRecommendedSections(['experience', 'skills', 'contact'])
    setProfessionIsOfficial(true)
    setIsProfessionModalOpen(true)
  }

  const handleOpenEditProfession = (prof: Profession) => {
    setEditingProfession(prof)
    setProfessionName(prof.name)
    setProfessionSubtitle((prof as any).subtitle || '')
    setProfessionAliases(((prof as any).aliases || []).join(', '))
    setProfessionCategoryId(typeof prof.categoryId === 'string' ? prof.categoryId : (prof.categoryId as any)?._id || '')
    setProfessionRecommendedSections(prof.recommendedSectionTypes || [])
    setProfessionIsOfficial(prof.isOfficial)
    setIsProfessionModalOpen(true)
  }

  const toggleSection = (section: string) => {
    setProfessionRecommendedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  if (isCategoriesLoading && isProfessionsLoading) {
    return <LoadingScreen message="Loading profession taxonomy..." />
  }

  return (
    <div className="space-y-8 text-left">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Universal Profile Taxonomy</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Profession Catalog & Templates
          </h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Each profession <strong className="text-white">is</strong> the profile template — managing recommended profile
            sections per category. Users can hold multiple professions simultaneously and inherit sections across all of
            them.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddCategory}
            leftIcon={<FolderPlus className="h-4 w-4" />}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            New Category
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAddProfession}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Profession Template
          </Button>
        </div>
      </div>

      {/* Multi-profession info banner */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-white/70 space-y-1">
          <p className="font-semibold text-white">How Profession Templates Work</p>
          <p>
            Users may select <strong className="text-primary">multiple professions</strong>. When they add a second profession,
            the profile builder automatically inherits and merges the recommended sections from all of their active professions
            — giving them a superset of all relevant profile sections.
          </p>
          <p>
            Configure <strong className="text-white">recommended sections</strong> below for each profession to drive this
            dynamic template behavior. There is one unified template per profession category — no per-role variations.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="professions" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <LayoutTemplate className="h-4 w-4" />
            <span>Profession Templates ({professions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Layers className="h-4 w-4" />
            <span>Categories ({categories.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFESSION TEMPLATES */}
        <TabsContent value="professions" className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search profession templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="w-full sm:w-64">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full bg-[#181822] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Professions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {professions.map((prof) => {
              const catName =
                typeof prof.categoryId === 'object' && prof.categoryId !== null
                  ? (prof.categoryId as any).name
                  : categories.find((c) => c._id === prof.categoryId)?.name || 'General'

              return (
                <div
                  key={prof._id}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base leading-snug">
                            {prof.name}
                          </h4>
                          <span className="text-[11px] text-white/50 font-mono">
                            /{prof.slug}
                          </span>
                        </div>
                      </div>

                      <Badge variant={prof.isOfficial ? 'default' : 'secondary'} className="text-[10px]">
                        {prof.isOfficial ? 'Official' : 'Custom'}
                      </Badge>
                    </div>

                    {(prof as any).subtitle && (
                      <p className="text-[11px] text-white/50 leading-relaxed">
                        {(prof as any).subtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Tag className="h-3 w-3 text-primary" />
                      <span>{catName}</span>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider flex items-center gap-1.5 mb-1.5">
                        <LayoutTemplate className="h-3 w-3" />
                        Template Sections ({(prof.recommendedSectionTypes || []).length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(prof.recommendedSectionTypes || []).map((sec: string) => (
                          <span
                            key={sec}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/80 capitalize"
                          >
                            {SECTION_LABELS[sec] || sec.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      {prof.isActive !== false ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-400" />
                      )}
                      <span>{prof.isActive !== false ? 'Active' : 'Inactive'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditProfession(prof)}
                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit profession template"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Deactivate "${prof.name}"? It will be hidden from users.`))
                            deleteProfessionMutation.mutate(prof._id)
                        }}
                        className="p-1.5 rounded-lg text-white/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Deactivate profession"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {professions.length === 0 && (
            <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10 text-white/50">
              No professions found matching your filter criteria.
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CATEGORIES */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const profCount = professions.filter((p) => {
                const catId = typeof p.categoryId === 'object' ? (p.categoryId as any)?._id : p.categoryId
                return catId === cat._id
              }).length
              return (
                <div
                  key={cat._id}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                          <Compass className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">{cat.name}</h4>
                          <span className="text-[11px] text-white/50 font-mono">/{cat.slug}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/80 bg-white/5">
                        {profCount} profession{profCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {cat.icon && (
                      <div className="text-xs text-white/60 pt-1">
                        Icon: <span className="font-mono text-white/80">{cat.icon}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      {cat.isActive !== false ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-400" />
                      )}
                      <span>{cat.isActive !== false ? 'Active' : 'Inactive'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCategoryMutation.mutate(cat._id)}
                        className="p-1.5 rounded-lg text-white/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE / EDIT CATEGORY MODAL */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-white">
            {editingCategory ? 'Edit Industry Category' : 'Create Industry Category'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Top-level sector groupings. Each category holds one universal profession template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-left">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Category Name</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Healthcare & Medicine"
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Icon Identifier (optional)</label>
            <input
              type="text"
              value={categoryIcon}
              onChange={(e) => setCategoryIcon(e.target.value)}
              placeholder="e.g. activity, code, briefcase, graduation-cap, palette"
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Display Order</label>
            <input
              type="number"
              value={categoryOrder}
              onChange={(e) => setCategoryOrder(Number(e.target.value))}
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => setIsCategoryModalOpen(false)}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            isLoading={saveCategoryMutation.isPending}
            disabled={!categoryName.trim()}
            onClick={() => saveCategoryMutation.mutate()}
          >
            {editingCategory ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CREATE / EDIT PROFESSION TEMPLATE MODAL */}
      <Dialog open={isProfessionModalOpen} onOpenChange={setIsProfessionModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            {editingProfession ? 'Edit Profession Template' : 'Create Profession Template'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Define the universal profession template. Configure which profile sections are recommended — this IS the template
            that users inherit when selecting this profession.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-left max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Profession Title</label>
            <input
              type="text"
              value={professionName}
              onChange={(e) => setProfessionName(e.target.value)}
              placeholder="e.g. Engineer, Doctor / Healthcare Professional"
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Subtitle / Description</label>
            <input
              type="text"
              value={professionSubtitle}
              onChange={(e) => setProfessionSubtitle(e.target.value)}
              placeholder="e.g. Universal Engineering: Software, Systems, Cloud, AI..."
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Aliases (comma-separated)</label>
            <input
              type="text"
              value={professionAliases}
              onChange={(e) => setProfessionAliases(e.target.value)}
              placeholder="e.g. software engineer, backend developer, devops..."
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[10px] text-white/40">
              Aliases allow users to find this template by searching role variations (e.g. "frontend dev" → "Engineer")
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Industry Category</label>
            <select
              value={professionCategoryId}
              onChange={(e) => setProfessionCategoryId(e.target.value)}
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No Category (Unassigned)</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Template Sections — this is the core "template" concept */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5 block">
              <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
              Template Profile Sections
            </label>
            <p className="text-[11px] text-white/50">
              Users selecting this profession will see these sections recommended in their profile builder. When a user has
              multiple professions, sections are automatically merged across all of them.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_SECTION_TYPES.map((sec) => {
                const isSelected = professionRecommendedSections.includes(sec)
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleSection(sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {SECTION_LABELS[sec] || sec.replace(/_/g, ' ')}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={professionIsOfficial}
                onChange={(e) => setProfessionIsOfficial(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-4 w-4 bg-[#181822] border-white/10"
              />
              <span>Verified Official Catalog Profession</span>
            </label>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => setIsProfessionModalOpen(false)}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            isLoading={saveProfessionMutation.isPending}
            disabled={!professionName.trim()}
            onClick={() => saveProfessionMutation.mutate()}
          >
            {editingProfession ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
