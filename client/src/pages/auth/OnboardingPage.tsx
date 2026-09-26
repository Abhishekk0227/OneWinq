import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/features/profile/api/profile.api'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { BrandLogo } from '@/components/navigation/BrandLogo'
import { ProfessionSelector, type SelectedProfessionResult } from '@/components/common/ProfessionSelector'
import { TemplateCard } from '@/components/profile/TemplateCard'
import type { ProfileTemplate } from '@/types/profile.types'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Layers,
  AtSign,
  User,
  LayoutTemplate,
  Crown,
  Trash2,
  Plus,
  Compass,
  Lock,
} from 'lucide-react'

interface RoleItem {
  professionId?: string | null
  customTitle: string
  isOfficial: boolean
  isPrimary: boolean
  recommendedSectionTypes: string[]
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()

  // Wizard Steps: 1: Identity/Handle, 2: Choose Template, 3: Choose Roles, 4: Workspace Review
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1)
  const [displayName, setDisplayName] = React.useState(user?.displayName || '')
  const [username, setUsername] = React.useState(user?.username || '')

  // Template State
  const [selectedTemplate, setSelectedTemplate] = React.useState<ProfileTemplate | null>(null)

  // Roles State (Multiple Roles supported!)
  const [roles, setRoles] = React.useState<RoleItem[]>([])
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false)

  // Fetch Templates
  const { data: templatesData, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['profile-templates'],
    queryFn: () => profileApi.getTemplates(),
  })
  const templates = templatesData?.data?.templates || []

  // Pre-select default "professional" template if none selected once loaded
  React.useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      const defaultT = templates.find((t) => t.slug === 'professional') || templates[0]
      setSelectedTemplate(defaultT)
    }
  }, [templates, selectedTemplate])

  // Query existing identities to check if user already onboarded
  const { data: identitiesData } = useQuery({
    queryKey: ['my-identities'],
    queryFn: () => profileApi.getIdentities(),
  })
  const existingIdentities = identitiesData?.data?.identities || []
  const hasExistingIdentity = existingIdentities.length > 0

  // Prepopulate existing identities if user already had some
  React.useEffect(() => {
    if (existingIdentities.length > 0 && roles.length === 0) {
      setRoles(
        existingIdentities.map((id) => {
          const prof = id.professionId as any
          const profId = typeof prof === 'object' ? (prof?._id || prof?.id || null) : (prof || null)
          const recSecs = (typeof prof === 'object' && prof?.recommendedSectionTypes) ? prof.recommendedSectionTypes : []
          return {
            professionId: profId,
            customTitle: id.customTitle,
            isOfficial: !!prof,
            isPrimary: !!id.isPrimary,
            recommendedSectionTypes: recSecs,
          }
        })
      )
    }
  }, [existingIdentities])

  // Handle adding a profession/role
  const handleAddRole = (result: SelectedProfessionResult) => {
    setRoles((prev) => {
      // Check if already in list
      const exists = prev.some(
        (r) => r.customTitle.toLowerCase() === result.customTitle.toLowerCase()
      )
      if (exists) {
        toast.default(`"${result.customTitle}" is already added to your roles.`)
        return prev
      }

      const isFirst = prev.length === 0
      const newRole: RoleItem = {
        professionId: result.professionId || null,
        customTitle: result.customTitle,
        isOfficial: result.isOfficial,
        isPrimary: isFirst, // First added role is primary by default
        recommendedSectionTypes: result.recommendedSectionTypes || [],
      }
      return [...prev, newRole]
    })
  }

  const handleSetPrimary = (index: number) => {
    setRoles((prev) =>
      prev.map((r, i) => ({
        ...r,
        isPrimary: i === index,
      }))
    )
  }

  const handleRemoveRole = (index: number) => {
    setRoles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // If removed was primary, make the first one primary
      if (next.length > 0 && !next.some((r) => r.isPrimary)) {
        next[0].isPrimary = true
      }
      return next
    })
  }

  // Calculate Combined Recommendations (Template + All Roles)
  const combinedRecommendations = React.useMemo(() => {
    const list: string[] = []
    const seen = new Set<string>()

    // 1. Template recommendations
    if (selectedTemplate?.recommendedSectionIds) {
      for (const s of selectedTemplate.recommendedSectionIds) {
        const norm = s.toLowerCase()
        if (!seen.has(norm)) {
          seen.add(norm)
          list.push(s)
        }
      }
    }

    // 2. Roles recommendations
    for (const role of roles) {
      for (const s of role.recommendedSectionTypes) {
        const norm = s.toLowerCase()
        if (!seen.has(norm)) {
          seen.add(norm)
          list.push(s)
        }
      }
    }

    return list.length > 0 ? list : ['About', 'Experience', 'Skills', 'Projects', 'Social Links']
  }, [selectedTemplate, roles])

  // Mutations
  const [isFinishing, setIsFinishing] = React.useState(false)

  const handleFinish = async () => {
    if (!selectedTemplate) {
      toast.error('Please choose a profile template.')
      setStep(2)
      return
    }

    if (roles.length === 0 && !hasExistingIdentity) {
      toast.error('Please choose at least one professional role.')
      setStep(3)
      return
    }

    try {
      setIsFinishing(true)

      // 1. Update vanity handle and display name if changed
      if (username !== user?.username || displayName !== user?.displayName) {
        if (username !== user?.username) {
          await profileApi.changeUsername(username)
        }
        await profileApi.updateDraft({ displayName })
        if (user) {
          setUser({ ...user, displayName, username })
        }
      }

      // 2. Persist Profile Template Selection
      await profileApi.updateTemplate({ templateSlug: selectedTemplate.slug })

      // 3. Persist Professional Identities if new roles were configured
      if (roles.length > 0 && existingIdentities.length === 0) {
        for (let i = 0; i < roles.length; i++) {
          const r = roles[i]
          await profileApi.createIdentity({
            customTitle: r.customTitle,
            professionId: r.professionId || null,
            isPrimary: r.isPrimary,
            displayOrder: i,
          })
        }
      }

      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      queryClient.invalidateQueries({ queryKey: ['my-identities'] })
      queryClient.invalidateQueries({ queryKey: ['recommended-sections'] })

      toast.success('Your OneWinq profile is configured!')
      navigate('/app/profile/edit', { replace: true })
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to complete setup. Please try again.')
    } finally {
      setIsFinishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandLogo />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app', { replace: true })}
          >
            Skip to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        {/* Step Indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-lg mx-auto relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-border w-full z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-300 z-0"
              style={{
                width:
                  step === 1
                    ? '0%'
                    : step === 2
                    ? '33%'
                    : step === 3
                    ? '66%'
                    : '100%',
              }}
            />

            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Template' },
              { num: 3, label: 'Roles' },
              { num: 4, label: 'Review' },
            ].map((s) => {
              const isActive = step === s.num
              const isCompleted = step > s.num
              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-card text-muted-foreground border border-border'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] font-medium mt-1.5 ${
                      isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ================= STEP 1: Personalize Identity ================= */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="space-y-2 text-center max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Step 1 of 4</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Claim your OneWinq Profile Link
              </h1>
              <p className="text-sm text-muted-foreground">
                Your profile handle will be your public link on OneWinq. You can share this link or connect it to an NFC card anytime.
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Dr. Alex Morgan or Taylor Swift"
                  leftIcon={<User className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Profile Username / Handle
                </label>
                <Input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="e.g. alexmorgan"
                  leftIcon={<AtSign className="h-4 w-4" />}
                />
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Your public URL:</span>
                  <span className="font-mono font-semibold text-primary">
                    onewinq.me/u/{username || 'your-handle'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                size="lg"
                onClick={() => {
                  if (!displayName.trim()) {
                    toast.error('Please enter a display name.')
                    return
                  }
                  if (!username.trim() || username.length < 3) {
                    toast.error('Username must be at least 3 characters.')
                    return
                  }
                  setStep(2)
                }}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Choose Profile Template
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Choose Profile Template ================= */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="space-y-2 text-center max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <LayoutTemplate className="h-3.5 w-3.5" />
                <span>Step 2 of 4</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                How do you want to present yourself?
              </h1>
              <p className="text-sm text-muted-foreground">
                All accounts start with our Basic Universal Template. Specialized industry templates are locked and coming soon!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
              <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                <strong>Basic Universal Template Active:</strong> New profiles currently launch with the Universal Smart Profile (Bio, Contact Details, and Social Profiles). Other templates are locked and <strong>Coming Soon... for now</strong>!
              </p>
            </div>

            {isTemplatesLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading profile template catalog...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 max-h-[500px] overflow-y-auto pr-1">
                {templates.map((tpl) => {
                  const isLocked = tpl.slug === 'professional' ? false : (tpl.isLocked !== undefined ? Boolean(tpl.isLocked) : true)
                  return (
                    <TemplateCard
                      key={tpl._id || tpl.slug}
                      template={tpl}
                      isSelected={selectedTemplate?.slug === tpl.slug}
                      isLocked={isLocked}
                      onSelect={(t) => {
                        if (isLocked) {
                          toast.default(`The "${t.name}" template is locked and coming soon... for now!`)
                          return
                        }
                        setSelectedTemplate(t)
                      }}
                      showSelectButton
                    />
                  )
                })}
              </div>
            )}

            {selectedTemplate && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Selected Starting Template: </span>
                  <span className="font-bold text-foreground">{selectedTemplate.name}</span>
                  <span className="text-muted-foreground ml-2">({selectedTemplate.recommendedSectionIds.length} base sections)</span>
                </div>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {selectedTemplate.category}
                </Badge>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button
                size="lg"
                disabled={!selectedTemplate}
                onClick={() => setStep(3)}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Tell Us What You Do
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Choose Professional Roles ================= */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="space-y-2 text-center max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Compass className="h-3.5 w-3.5" />
                <span>Step 3 of 4</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Tell us what you do
              </h1>
              <p className="text-sm text-muted-foreground">
                You can select multiple professional identities (e.g. Software Engineer, Founder, Creator). Exactly one role will be set as your primary identity.
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4 pt-2">
              {/* Selected Roles List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Your Professional Roles ({roles.length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setIsSelectorOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Another Role
                  </Button>
                </div>

                {roles.length === 0 ? (
                  <div
                    onClick={() => setIsSelectorOpen(true)}
                    className="p-8 border-2 border-dashed border-border hover:border-primary/60 rounded-2xl bg-muted/20 hover:bg-primary/5 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-base">
                        Select Your Professions
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1">
                        Browse verified industry catalogs or create your custom specialty title. Multiple roles supported!
                      </p>
                    </div>
                    <Button variant="default" size="sm" className="mt-2 pointer-events-none">
                      Browse Catalog & Add Role
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          role.isPrimary
                            ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                            : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              role.isPrimary
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {role.isPrimary ? <Crown className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {role.customTitle}
                              </span>
                              {role.isPrimary ? (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  Primary Role
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Secondary
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {role.isOfficial ? 'Catalog Profession' : 'Custom Profession'}
                              {role.recommendedSectionTypes.length > 0 &&
                                ` • ${role.recommendedSectionTypes.length} recommended sections`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!role.isPrimary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => handleSetPrimary(idx)}
                            >
                              Make Primary
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveRole(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {roles.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
                  💡 Tip: Exactly one role is your <strong>Primary Role</strong> which appears directly on your badge and card header. Additional roles enrich your profile recommendations and search discovery.
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button
                size="lg"
                disabled={roles.length === 0 && !hasExistingIdentity}
                onClick={() => setStep(4)}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Review Recommendations
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: Review Combined Recommendations ================= */}
        {step === 4 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="space-y-2 text-center max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Layers className="h-3.5 w-3.5" />
                <span>Step 4 of 4</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Your Synthesized Profile Workspace
              </h1>
              <p className="text-sm text-muted-foreground">
                We've combined your chosen presentation template with your professional roles to suggest the ideal profile sections.
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-5 pt-2">
              {/* Summary Pill Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                    Profile Template
                  </span>
                  <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <LayoutTemplate className="h-4 w-4 text-primary" />
                    <span>{selectedTemplate?.name || 'Professional'}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-1">
                    {selectedTemplate?.description}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                    Roles Configured ({roles.length})
                  </span>
                  <div className="font-bold text-foreground text-sm flex items-center gap-1.5 truncate">
                    <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="truncate">
                      {roles.find((r) => r.isPrimary)?.customTitle || roles[0]?.customTitle || 'General Member'}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {roles.length > 1 ? `+${roles.length - 1} secondary identity` : 'Primary identity'}
                  </span>
                </div>
              </div>

              {/* Combined Recommendations Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Combined Recommended Sections ({combinedRecommendations.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Synthesized from Template + Roles
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {combinedRecommendations.map((sec) => (
                    <div
                      key={sec}
                      className="p-2.5 rounded-xl border border-border bg-card flex items-center gap-2 text-xs font-medium"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="capitalize truncate">{sec.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground text-center">
                ✨ <strong>You remain in full control:</strong> In the Profile Builder, you can add, remove, reorder, or customize any section at any time.
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button
                size="lg"
                isLoading={isFinishing}
                onClick={handleFinish}
                rightIcon={<Sparkles className="h-4 w-4" />}
              >
                Enter Profile Builder
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Shared Profession Selector Modal */}
      <ProfessionSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        title="Add a Professional Identity"
        description="Search official industry professions or define a custom title for your profile."
        onSelect={handleAddRole}
      />

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OneWinq. Universal Dynamic Identity System.
      </footer>
    </div>
  )
}
