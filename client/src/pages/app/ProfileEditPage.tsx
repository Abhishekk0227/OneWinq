import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/features/profile/api/profile.api'
import { mediaApi } from '@/features/media/api/media.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'
import { SECTION_VISIBILITY, type SectionVisibility } from '@/constants/app.constants'
import type {
  Profile,
  ProfessionalIdentity,
  ExperienceItem,
  ProjectItem,
  SkillItem,
  EducationItem,
  SocialLink,
  CertificationItem,
  ServiceItem,
  AwardItem,
  PublicationItem,
  CustomSectionItem,
  MediaGalleryItem,
  OrganizationItem,
} from '@/types/profile.types'
import {
  Save,
  Plus,
  Trash2,
  Briefcase,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Check,
  Sparkles,
  Award,
  Shield,
  Upload,
  Camera,
  Image as ImageIcon,
  FileText,
  Star,
  LayoutTemplate,
  Building2,
  Video,
  Code,
  GraduationCap,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Lock,
} from 'lucide-react'
import { cardsApi } from '@/features/cards/api/cards.api'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { MonthYearPicker } from '@/components/common/MonthYearPicker'
import { TemplateCard } from '@/components/profile/TemplateCard'

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null)
  const coverInputRef = React.useRef<HTMLInputElement | null>(null)

  // Queries
  const [selectedPersonaId, setSelectedPersonaId] = React.useState<string | null>(null)

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile-me', selectedPersonaId],
    queryFn: () => profileApi.getMyProfile(selectedPersonaId ? { personaId: selectedPersonaId } : undefined),
  })

  const { data: personasData } = useQuery({
    queryKey: ['user-personas'],
    queryFn: () => profileApi.listPersonas(),
  })
  const personas = personasData?.data?.personas || (profileData?.data as any)?.personas || []

  const { data: userCardsData } = useQuery({
    queryKey: ['cards', 'my'],
    queryFn: () => cardsApi.listCards(),
  })
  const userCards = (userCardsData?.data as any)?.cards || []
  const activeUserCard = userCards.find((c: any) => c.state === 'ACTIVE' || c.status === 'ACTIVE')

  // Basic Info State
  const [personaName, setPersonaName] = React.useState('')
  const [professionTitle, setProfessionTitle] = React.useState('')
  const [displayName, setDisplayName] = React.useState(user?.displayName || '')
  const [headline, setHeadline] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [coverUrl, setCoverUrl] = React.useState('')
  const [city, setCity] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [website, setWebsite] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [emailContact, setEmailContact] = React.useState('')
  const [addressContact, setAddressContact] = React.useState('')
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const [uploadingCover, setUploadingCover] = React.useState(false)

  // Collections State
  const [_identities, setIdentities] = React.useState<ProfessionalIdentity[]>([])
  const [socialLinks, setSocialLinks] = React.useState<SocialLink[]>([])
  const [experience, setExperience] = React.useState<ExperienceItem[]>([])
  const [education, setEducation] = React.useState<EducationItem[]>([])
  const [skills, setSkills] = React.useState<SkillItem[]>([])
  const [projects, setProjects] = React.useState<ProjectItem[]>([])
  const [certifications, setCertifications] = React.useState<CertificationItem[]>([])
  const [services, setServices] = React.useState<ServiceItem[]>([])
  const [awards, setAwards] = React.useState<AwardItem[]>([])
  const [publications, setPublications] = React.useState<PublicationItem[]>([])
  const [customSections, setCustomSections] = React.useState<CustomSectionItem[]>([])
  const [mediaGallery, setMediaGallery] = React.useState<MediaGalleryItem[]>([])
  const [organizations, setOrganizations] = React.useState<OrganizationItem[]>([])

  // Dynamic Tabs State
  const [activeTab, setActiveTab] = React.useState('identity')

  // Visibility Settings State
  const [avatarVisibility, setAvatarVisibility] = React.useState<SectionVisibility>(SECTION_VISIBILITY.PUBLIC)
  const [sectionVisibility, setSectionVisibility] = React.useState<Record<string, SectionVisibility>>({})

  // Modals
  const [isCreatePersonaOpen, setIsCreatePersonaOpen] = React.useState(false)
  const [newPersonaTitle, setNewPersonaTitle] = React.useState('')
  const [newPersonaTemplate, setNewPersonaTemplate] = React.useState('creator')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false)

  // Smooth tabs horizontal scrolling ref
  const tabsScrollRef = React.useRef<HTMLDivElement>(null)
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      const amount = direction === 'left' ? -240 : 240
      tabsScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  // Initialize form state
  React.useEffect(() => {
    if (profileData?.data) {
      const p = profileData.data.profile
      const u = (profileData.data as any).user
      const currentId = p._id || (p as any).id
      if (!selectedPersonaId && currentId) {
        setSelectedPersonaId(currentId)
      }
      setPersonaName(p.personaName || '')
      setProfessionTitle(p.professionTitle || p.headline || '')
      if (u?.displayName) {
        setDisplayName(u.displayName)
      } else if (user?.displayName) {
        setDisplayName(user.displayName)
      }
      if (p) {
        setHeadline(p.headline || '')
        setBio(p.bio || '')
        setAvatarUrl(p.avatarUrl || '')
        setCoverUrl(p.coverUrl || '')
        setCity(p.location?.city || '')
        setCountry(p.location?.country || '')
        setWebsite(p.contact?.website || '')
        setPhone(p.contact?.phone || '')
        setEmailContact(p.contact?.email || '')
        setAddressContact(p.contact?.address || '')

        const rawIdentities = (profileData.data as any)?.identities || (p as any)?.identities || []
        setIdentities(rawIdentities)
        setSocialLinks(p.socialLinks || [])
        setExperience(
          (p.experience || []).map((exp: any) => ({
            ...exp,
            startYear: exp.startYear ?? (exp.startDate ? new Date(exp.startDate).getFullYear() : null),
            startMonth: exp.startMonth ?? (exp.startDate ? new Date(exp.startDate).getMonth() + 1 : null),
            endYear: exp.endYear ?? (exp.endDate ? new Date(exp.endDate).getFullYear() : null),
            endMonth: exp.endMonth ?? (exp.endDate ? new Date(exp.endDate).getMonth() + 1 : null),
          }))
        )
        setEducation(
          (p.education || []).map((edu: any) => ({
            ...edu,
            startYear: edu.startYear ?? (edu.startDate ? new Date(edu.startDate).getFullYear() : null),
            startMonth: edu.startMonth ?? (edu.startDate ? new Date(edu.startDate).getMonth() + 1 : null),
            endYear: edu.endYear ?? (edu.endDate ? new Date(edu.endDate).getFullYear() : null),
            endMonth: edu.endMonth ?? (edu.endDate ? new Date(edu.endDate).getMonth() + 1 : null),
          }))
        )
        setSkills(p.skills || [])
        setProjects(
          (p.projects || []).map((proj: any) => ({
            ...proj,
            startYear: proj.startYear ?? (proj.startDate ? new Date(proj.startDate).getFullYear() : null),
            startMonth: proj.startMonth ?? (proj.startDate ? new Date(proj.startDate).getMonth() + 1 : null),
            endYear: proj.endYear ?? (proj.endDate ? new Date(proj.endDate).getFullYear() : null),
            endMonth: proj.endMonth ?? (proj.endDate ? new Date(proj.endDate).getMonth() + 1 : null),
          }))
        )
        setCertifications(
          (p.certifications || []).map((cert: any) => ({
            ...cert,
            issueYear: cert.issueYear ?? (cert.issueDate ? new Date(cert.issueDate).getFullYear() : null),
            issueMonth: cert.issueMonth ?? (cert.issueDate ? new Date(cert.issueDate).getMonth() + 1 : null),
            expiryYear: cert.expiryYear ?? (cert.expiryDate ? new Date(cert.expiryDate).getFullYear() : null),
            expiryMonth: cert.expiryMonth ?? (cert.expiryDate ? new Date(cert.expiryDate).getMonth() + 1 : null),
          }))
        )
        setServices(p.services || [])
        setAwards(
          (p.awards || []).map((aw: any) => ({
            ...aw,
            year: aw.year ?? (aw.date ? new Date(aw.date).getFullYear() : null),
            month: aw.month ?? (aw.date ? new Date(aw.date).getMonth() + 1 : null),
          }))
        )
        setPublications(
          (p.publications || []).map((pub: any) => ({
            ...pub,
            year: pub.year ?? (pub.date ? new Date(pub.date).getFullYear() : null),
            month: pub.month ?? (pub.date ? new Date(pub.date).getMonth() + 1 : null),
          }))
        )
        setMediaGallery(p.mediaGallery || [])
        setOrganizations(p.organizations || [])
        setCustomSections(p.customSections || [])

        if (p.visibility) {
          setAvatarVisibility(p.visibility.avatarVisibility || (p as any).avatarVisibility || SECTION_VISIBILITY.PUBLIC)
          setSectionVisibility(p.visibility.sectionVisibility || {})
        }
      }
    }
  }, [profileData])

  // Save Draft Mutation
  const saveMutation = useMutation({
    mutationFn: (updated: Partial<Profile> & { displayName?: string; personaId?: string }) =>
      profileApi.updateDraft(updated, selectedPersonaId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      queryClient.invalidateQueries({ queryKey: ['user-personas'] })
      if (displayName.trim() && user) {
        setUser({ ...user, displayName: displayName.trim(), avatarUrl: avatarUrl || user.avatarUrl })
      }
      toast.success('Draft saved successfully!')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to save changes')
    },
  })

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: (personaId?: string) => profileApi.publish(personaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      queryClient.invalidateQueries({ queryKey: ['user-personas'] })
      toast.success('Profile published live!')
      navigate('/app/profile')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to publish')
    },
  })

  // Persona Management Mutations
  const switchActiveMutation = useMutation({
    mutationFn: (personaId: string) => profileApi.switchActivePersona(personaId),
    onSuccess: (res) => {
      toast.success(`"${res.data.persona.personaName}" is now your LIVE profile on your NFC card & public URL!`)
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      queryClient.invalidateQueries({ queryKey: ['user-personas'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to switch active profile')
    },
  })

  const createPersonaMutation = useMutation({
    mutationFn: (payload: { personaName: string; professionTitle?: string; templateSlug: string }) =>
      profileApi.createPersona(payload),
    onSuccess: (res) => {
      const createdId = res.data.persona._id || res.data.persona.id
      toast.success(`New profession persona "${res.data.persona.personaName}" created!`)
      setIsCreatePersonaOpen(false)
      setNewPersonaTitle('')
      setSelectedPersonaId(createdId)
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      queryClient.invalidateQueries({ queryKey: ['user-personas'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create persona')
    },
  })

  const deletePersonaMutation = useMutation({
    mutationFn: (personaId: string) => profileApi.deletePersona(personaId),
    onSuccess: () => {
      toast.success('Persona profile deleted')
      setSelectedPersonaId(null)
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      queryClient.invalidateQueries({ queryKey: ['user-personas'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete persona')
    },
  })

  // Full dynamic recommendations (Template + Roles)
  const { data: recFullData } = useQuery({
    queryKey: ['profile-recommendations'],
    queryFn: () => profileApi.getRecommendations(),
  })
  const recommendations = recFullData?.data

  // Profile templates catalog
  const { data: templatesData } = useQuery({
    queryKey: ['profile-templates'],
    queryFn: () => profileApi.getTemplates(),
  })
  const templates = templatesData?.data?.templates || []

  // Active template resolution
  const rawTemplate = (profileData?.data?.profile as any)?.templateId
  const activeTemplate =
    recommendations?.activeTemplate ||
    (typeof rawTemplate === 'object' && rawTemplate !== null ? rawTemplate : null) ||
    templates.find((t) => t.id === rawTemplate || (t as any)?._id === rawTemplate) ||
    templates.find((t) => t.slug === 'professional') ||
    templates[0]
  const templateSlug = activeTemplate?.slug || 'professional'



  // Switch Template Mutation
  const switchTemplateMutation = useMutation({
    mutationFn: (payload: { templateId?: string; templateSlug?: string }) =>
      profileApi.updateTemplate({ ...payload, personaId: selectedPersonaId || undefined }),
    onSuccess: () => {
      setIsTemplateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['profile-me'] })
      queryClient.invalidateQueries({ queryKey: ['user-personas'] })
      queryClient.invalidateQueries({ queryKey: ['profile-recommendations'] })
      queryClient.invalidateQueries({ queryKey: ['profile-templates'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to switch template')
    },
  })

  // Section ID → Tab definition mapping
  const SECTION_TO_TAB: Record<string, { id: string; label: string; icon: any }> = React.useMemo(
    () => ({
      mediaGallery: { id: 'media', label: 'Media & Channels', icon: Video },
      media: { id: 'media', label: 'Media & Channels', icon: Video },
      blogs: { id: 'media', label: 'Media & Channels', icon: Video },
      organizations: { id: 'ventures', label: 'Ventures & Orgs', icon: Building2 },
      ventures: { id: 'ventures', label: 'Ventures & Orgs', icon: Building2 },
      experience: { id: 'career', label: 'Work Experience', icon: Briefcase },
      career: { id: 'career', label: 'Work Experience', icon: Briefcase },
      education: { id: 'education', label: 'Education & Degrees', icon: GraduationCap },
      skills: { id: 'skills', label: 'Skills & Tech Stack', icon: Code },
      projects: { id: 'projects', label: 'Projects & Works', icon: Layers },
      services: { id: 'services', label: 'Services & Pricing', icon: Award },
      certifications: { id: 'certifications', label: 'Certifications & Licenses', icon: Shield },
      publications: { id: 'publications', label: 'Publications & Research', icon: FileText },
      research: { id: 'publications', label: 'Publications & Research', icon: FileText },
      awards: { id: 'awards', label: 'Awards & Honors', icon: Star },
      speaking: { id: 'awards', label: 'Speaking & Press', icon: Star },
      achievements: { id: 'awards', label: 'Awards & Honors', icon: Star },
      customSections: { id: 'custom-blocks', label: 'Custom Sections', icon: FileText },
      custom_sections: { id: 'custom-blocks', label: 'Custom Sections', icon: FileText },
    }),
    []
  )

  // Template default tabs for Basic Universal Template
  const defaultTabIds = React.useMemo(() => {
    return ['identity', 'privacy']
  }, [])

  // Dynamic Tabs Engine for Basic Universal Template + Populated Data
  const visibleTabs = React.useMemo(() => {
    const tabs: { id: string; label: string; icon: any }[] = [
      { id: 'identity', label: 'Universal Profile', icon: Sparkles },
    ]

    const added = new Set<string>(['identity'])

    const addTabIfDefined = (tabId: string) => {
      if (added.has(tabId) || tabId === 'privacy') return
      const def = SECTION_TO_TAB[tabId] || Object.values(SECTION_TO_TAB).find((t) => t.id === tabId)
      if (def) {
        tabs.push(def)
        added.add(tabId)
      } else if (tabId === 'skills-projects') {
        tabs.push({ id: 'skills-projects', label: 'Skills & Projects', icon: Layers })
        added.add('skills-projects')
      } else if (tabId === 'credentials') {
        tabs.push({ id: 'credentials', label: 'Credentials & Services', icon: Award })
        added.add('credentials')
      }
    }

    // Always preserve sections that already have user data
    if (experience.length > 0) addTabIfDefined('career')
    if (education.length > 0) addTabIfDefined('education')
    if (skills.length > 0) addTabIfDefined('skills')
    if (projects.length > 0) addTabIfDefined('projects')
    if (mediaGallery.length > 0) addTabIfDefined('media')
    if (organizations.length > 0) addTabIfDefined('ventures')
    if (services.length > 0) addTabIfDefined('services')
    if (certifications.length > 0) addTabIfDefined('certifications')
    if (publications.length > 0) addTabIfDefined('publications')
    if (awards.length > 0) addTabIfDefined('awards')
    if (customSections.length > 0) addTabIfDefined('custom-blocks')

    // Always append privacy / visibility rules
    tabs.push({ id: 'privacy', label: 'Visibility Rules', icon: Shield })
    return tabs
  }, [
    mediaGallery.length,
    organizations.length,
    experience.length,
    education.length,
    skills.length,
    projects.length,
    services.length,
    certifications.length,
    publications.length,
    awards.length,
    customSections.length,
    SECTION_TO_TAB,
  ])

  // Handler to remove / delete an extra added section
  const handleRemoveSection = (sectionId: string, sectionTitle?: string) => {
    const label = sectionTitle || sectionId
    switch (sectionId) {
      case 'media':
        setMediaGallery([])
        break
      case 'ventures':
        setOrganizations([])
        break
      case 'career':
        setExperience([])
        break
      case 'education':
        setEducation([])
        break
      case 'skills':
        setSkills([])
        break
      case 'projects':
        setProjects([])
        break
      case 'skills-projects':
        setSkills([])
        setProjects([])
        break
      case 'services':
        setServices([])
        break
      case 'certifications':
        setCertifications([])
        break
      case 'credentials':
        setCertifications([])
        setServices([])
        break
      case 'publications':
        setPublications([])
        break
      case 'awards':
        setAwards([])
        break
      case 'custom-blocks':
        setCustomSections([])
        break
    }

    if (activeTab === sectionId) {
      setActiveTab('identity')
    }

    toast.success(`Removed "${label}" section. Profile now matches your ${activeTemplate?.name || 'current'} template!`)
  }

  // Helper banner rendered inside extra sections
  const renderExtraSectionBanner = (sectionId: string, sectionTitle: string) => {
    if (defaultTabIds.includes(sectionId)) return null
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-foreground">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Extra Section
          </span>
          <p className="text-xs text-muted-foreground">
            This section was added outside of the standard <strong>{activeTemplate?.name || 'Professional'}</strong> template.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => handleRemoveSection(sectionId, sectionTitle)}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          className="shrink-0 h-8 text-xs"
        >
          Remove Section
        </Button>
      </div>
    )
  }

  // Save Draft
  const handleSaveDraft = async () => {
    const cleanedSocialLinks = socialLinks
      .map((s) => ({
        ...s,
        platform: s.platform?.trim() || 'Website',
        url: s.url?.trim() || '',
        label: s.label?.trim() || s.platform || '',
      }))
      .filter((s) => s.url.length > 0)

    return saveMutation.mutateAsync({
      personaId: selectedPersonaId || undefined,
      personaName: personaName.trim() || undefined,
      professionTitle: professionTitle.trim() || undefined,
      displayName: displayName.trim() || undefined,
      headline,
      bio,
      avatarUrl: avatarUrl || null,
      coverUrl: coverUrl || null,
      location: { city, country },
      contact: { website: website?.trim() || '', phone, email: emailContact, address: addressContact },
      socialLinks: cleanedSocialLinks,
      experience,
      education,
      skills,
      projects,
      certifications,
      services,
      awards,
      publications,
      mediaGallery,
      organizations,
      customSections,
    })
  }

  const handlePublishLive = async () => {
    try {
      await handleSaveDraft()
      publishMutation.mutate(selectedPersonaId || undefined)
    } catch {
      // Error handled by saveMutation toast
    }
  }

  // Upload Handlers
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar image must be smaller than 5MB')
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      return
    }
    try {
      setUploadingAvatar(true)
      const res = await mediaApi.uploadFile(file, 'PROFILE_PHOTO')
      setAvatarUrl(res.publicUrl)
      await profileApi.updateDraft({ avatarUrl: res.publicUrl })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
      if (user) {
        setUser({ ...user, avatarUrl: res.publicUrl })
      }
      toast.success('Avatar updated successfully!')
    } catch (err: any) {
      console.error('[AvatarUploadError]', err)
      toast.error(err?.message || 'Failed to upload avatar image')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Cover banner image must be smaller than 10MB')
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    try {
      setUploadingCover(true)
      const res = await mediaApi.uploadFile(file, 'PROFILE_COVER')
      setCoverUrl(res.publicUrl)
      await profileApi.updateDraft({ coverUrl: res.publicUrl })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
      toast.success('Cover banner updated!')
    } catch (err: any) {
      console.error('[CoverUploadError]', err)
      toast.error(err?.message || 'Failed to upload cover banner')
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  // Handlers for Collections
  const handleAddSocial = () => {
    setSocialLinks((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        platform: 'LinkedIn',
        url: '',
        label: 'LinkedIn',
      },
    ])
  }

  const handleAddExperience = () => {
    const curYear = new Date().getFullYear()
    const curMonth = new Date().getMonth() + 1
    setExperience((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        company: 'Company / Organization',
        role: 'Role / Title',
        location: '',
        startMonth: curMonth,
        startYear: curYear,
        endMonth: null,
        endYear: null,
        description: '',
        current: true,
      },
    ])
  }

  const handleAddEducation = () => {
    const curYear = new Date().getFullYear()
    setEducation((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        institution: 'University / Institute',
        degree: 'Bachelor / Master / Diploma',
        fieldOfStudy: '',
        startMonth: 8,
        startYear: curYear - 4,
        endMonth: 5,
        endYear: curYear,
        current: false,
      },
    ])
  }

  const handleAddSkill = () => {
    setSkills((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: 'Skill Name',
        category: 'Technical',
        proficiency: 'Advanced',
      },
    ])
  }

  const handleAddProject = () => {
    const curYear = new Date().getFullYear()
    setProjects((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: 'New Project',
        description: '',
        url: '',
        startMonth: null,
        startYear: curYear,
        endMonth: null,
        endYear: null,
        current: false,
      },
    ])
  }

  const handleAddMedia = () => {
    setMediaGallery((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: 'New Media Showcase',
        subtitle: 'Video / Showcase',
        description: '',
        url: '',
        metadata: { platform: 'YouTube', followerCount: '' },
      },
    ])
  }

  const handleAddOrganization = () => {
    setOrganizations((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: 'Venture / Startup Name',
        subtitle: 'Founder & CEO',
        description: '',
        url: '',
        metadata: { role: 'Founder', stage: 'Early Stage', status: 'Active' },
      },
    ])
  }

  const handleAddCertification = () => {
    const curYear = new Date().getFullYear()
    const curMonth = new Date().getMonth() + 1
    setCertifications((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: 'Certificate Name',
        issuer: 'Issuing Organization',
        issueMonth: curMonth,
        issueYear: curYear,
        expiryMonth: null,
        expiryYear: null,
        doesNotExpire: true,
        credentialId: '',
        url: '',
      },
    ])
  }

  const handleAddService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: 'Service / Offering Name',
        description: '',
        priceRange: '$100 - $300 / hr',
      },
    ])
  }

  const handleAddAward = () => {
    const curYear = new Date().getFullYear()
    const curMonth = new Date().getMonth() + 1
    setAwards((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: 'Award / Recognition Title',
        issuer: 'Organization',
        month: curMonth,
        year: curYear,
        description: '',
      },
    ])
  }

  const handleAddPublication = () => {
    const curYear = new Date().getFullYear()
    const curMonth = new Date().getMonth() + 1
    setPublications((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: 'Research Paper / Article',
        publisher: 'Journal / Publisher',
        month: curMonth,
        year: curYear,
        url: '',
        description: '',
      },
    ])
  }

  const handleAddCustomSection = () => {
    setCustomSections((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: 'Custom Section',
        description: 'Custom portfolio section',
        displayOrder: prev.length,
        blocks: [
          {
            type: 'text',
            content: 'Write your story, case study, or custom details here.',
          },
        ],
      },
    ])
  }

  const handleAddBlockToSection = (sectionIndex: number, type: 'text' | 'media' | 'link') => {
    setCustomSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIndex) return sec
        return {
          ...sec,
          blocks: [
            ...sec.blocks,
            {
              type,
              content: type === 'link' ? 'https://example.com' : 'Content details...',
            },
          ],
        }
      })
    )
  }

  if (isLoading) {
    return <LoadingScreen message="Loading profile editor..." />
  }



  return (
    <div className="space-y-4 sm:space-y-5 text-left max-w-5xl mx-auto pb-20">
      {/* Top Header & Sticky Actions (Compact) */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-card/95 border border-border shadow-xs sticky top-16 sm:top-20 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <Link to="/app/profile" className="shrink-0">
            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-foreground truncate">
              Profile Builder
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              Configure your professional identity and presentation style
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            isLoading={saveMutation.isPending}
            onClick={handleSaveDraft}
            className="h-8 sm:h-9 text-xs px-2 sm:px-3"
            leftIcon={<Save className="h-3.5 w-3.5" />}
            title="Save Draft"
            aria-label="Save Draft"
          >
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden hidden xs:inline">Save</span>
          </Button>

          <Button
            size="sm"
            isLoading={publishMutation.isPending || saveMutation.isPending}
            onClick={handlePublishLive}
            className="h-8 sm:h-9 text-xs px-2.5 sm:px-3.5 font-bold shadow-xs bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            <span className="hidden sm:inline">Publish Live</span>
            <span className="sm:hidden">Publish</span>
          </Button>
        </div>
      </div>

      {/* Compact Status Notice (Replaces the two massive beige cards) */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 dark:text-amber-200">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-foreground">Universal Template Active</span>
              <span className="text-muted-foreground text-[10px] hidden sm:inline">•</span>
              <span className="text-muted-foreground text-[11px] sm:text-xs">
                {!activeUserCard ? (
                  <>Link <span className="font-mono text-primary font-semibold">/u/{user?.username}</span> reserved in preview mode until NFC card is activated</>
                ) : (
                  <>Fixed essential fields active. Custom sections coming soon.</>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {!activeUserCard && (
            <Link to="/app/cards">
              <Button size="sm" variant="default" className="text-[11px] h-7 px-2.5">
                Activate Card
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTemplateModalOpen(true)}
            className="text-[11px] h-7 px-2.5 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex items-center gap-1"
          >
            <Lock className="h-3 w-3" />
            <span>Templates</span>
          </Button>
        </div>
      </div>

      {/* Profession Persona Switcher Bar (Responsive) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Briefcase className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <span className="text-xs text-muted-foreground font-semibold shrink-0">Active Persona:</span>
              <select
                value={selectedPersonaId || ''}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="w-full sm:w-auto max-w-full bg-muted/80 text-foreground font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none truncate"
              >
                {personas.map((per: any) => (
                  <option key={per.id || per._id} value={per.id || per._id}>
                    {per.personaName || per.professionTitle || 'Profile'} {per.isActive ? '★ (LIVE ON URL & NFC)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 break-words leading-tight">
              Only the LIVE profile is shown on <span className="font-mono text-primary font-medium">/u/{user?.username}</span> and NFC cards.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
          {activeUserCard && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
              <Wifi className="h-3 w-3 animate-pulse" />
              <span>NFC: {activeUserCard.cardCode || activeUserCard.cardUid}</span>
            </span>
          )}

          {profileData?.data?.profile && !profileData.data.profile.isActive && selectedPersonaId && (
            <Button
              type="button"
              size="sm"
              isLoading={switchActiveMutation.isPending}
              onClick={() => switchActiveMutation.mutate(selectedPersonaId)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs h-7 px-2.5 shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Make Live</span>
            </Button>
          )}

          {profileData?.data?.profile?.isActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Live Profile
            </span>
          )}

          <Badge
            variant="outline"
            className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 py-1 px-2.5"
            title="Multi-profession profiles are locked and coming soon"
          >
            <Lock className="h-3 w-3" />
            <span className="hidden sm:inline">Multiple Personas (Coming Soon)</span>
            <span className="sm:hidden">Multi-Personas (Soon)</span>
          </Badge>

          {personas.length > 1 && selectedPersonaId && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Delete this profile persona"
              disabled={deletePersonaMutation.isPending}
              onClick={() => {
                if (window.confirm(`Delete the "${personaName || 'current'}" profile persona?`)) {
                  deletePersonaMutation.mutate(selectedPersonaId)
                }
              }}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2">
          {/* Scrollable Tabs row without ugly browser scrollbars */}
          <div className="relative flex-1 min-w-0 flex items-center">
            <div
              ref={tabsScrollRef}
              className="flex-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center py-1"
            >
              <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-muted/60 p-1 text-muted-foreground w-max gap-1 shrink-0 border border-border/40">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon
                  const isExtra = !defaultTabIds.includes(tab.id)
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="gap-2 shrink-0 group relative whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                      {isExtra && (
                        <span className="text-[9px] px-1 py-0 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold tracking-wide">
                          Extra
                        </span>
                      )}
                      {isExtra && (
                        <span
                          role="button"
                          tabIndex={0}
                          title={`Remove ${tab.label} section`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveSection(tab.id, tab.label)
                          }}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            {/* Scroll navigation arrows for desktop */}
            <div className="hidden sm:flex items-center gap-1 pl-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollTabs('left')}
                className="p-1.5 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
                title="Scroll tabs left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollTabs('right')}
                className="p-1.5 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
                title="Scroll tabs right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Restricted Extra Sections Indicator */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60">
              <Lock className="h-3 w-3 text-amber-500" />
              <span>More Sections: <strong>Coming Soon... for now</strong></span>
            </span>
          </div>
        </div>

        {/* ================= TAB 1: IDENTITY & PRESENTATION HUB ================= */}
        <TabsContent value="identity" className="space-y-6">

          {/* Avatar and Cover Banner Upload Section */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-foreground pb-2 border-b border-border">
              Visual Branding
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avatar Box */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Avatar / Profile Picture</span>
                  {avatarUrl && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20">
                      Uploaded
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3.5 sm:gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1 min-w-0 w-full">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFile}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        leftIcon={<Upload className="h-3.5 w-3.5" />}
                        className="text-xs h-8"
                      >
                        {avatarUrl ? 'Change Picture' : 'Upload Picture'}
                      </Button>
                      {avatarUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive text-xs h-8"
                          onClick={async () => {
                            setAvatarUrl('')
                            await profileApi.updateDraft({ avatarUrl: null })
                            queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
                            if (user) {
                              setUser({ ...user, avatarUrl: null })
                            }
                            toast.success('Avatar removed')
                          }}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, or WebP up to 5MB. Square recommended.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cover Banner Box */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Cover Banner Image</span>
                  {coverUrl && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20">
                      Uploaded
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  {coverUrl ? (
                    <div className="relative group rounded-xl overflow-hidden border border-border">
                      <img
                        src={coverUrl}
                        alt="Cover Preview"
                        className="w-full h-20 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-20 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground bg-muted/30">
                      <span className="text-xs flex items-center gap-1.5 text-muted-foreground">
                        <ImageIcon className="h-4 w-4" /> No cover banner set
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverFile}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={uploadingCover}
                        onClick={() => coverInputRef.current?.click()}
                        leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
                        className="text-xs h-8"
                      >
                        {coverUrl ? 'Change Banner' : 'Upload Banner'}
                      </Button>
                      {coverUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive text-xs h-8"
                          onClick={async () => {
                            setCoverUrl('')
                            await profileApi.updateDraft({ coverUrl: null })
                            queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
                            toast.success('Cover banner removed')
                          }}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground hidden sm:block">
                      1200×400 recommended. Max 10MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview & Bio Fields */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Full Name / Display Name</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Primary name displayed on your identity</span>
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Primary Headline
                </label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Principal Systems Architect • Building Distributed Identity"
                />
              </div>

              {/* Persona & Profession Configuration Card */}
              <div className="space-y-4 p-5 sm:p-6 rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-primary/5 to-muted/20 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        Profile Profession & Template
                      </h4>
                      {profileData?.data?.profile?.isActive ? (
                        <Badge variant="subtle" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                          ★ Live Profile
                        </Badge>
                      ) : (
                        <Badge variant="subtle" className="text-[10px] font-bold text-muted-foreground bg-muted border-border">
                          Draft Persona
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Each profession profile is completely independent with its own layout, template, and content sections.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTemplateModalOpen(true)}
                      leftIcon={<LayoutTemplate className="h-3.5 w-3.5" />}
                      className="text-xs h-8"
                    >
                      Change Layout Style
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Profession Title</label>
                    <Input
                      value={professionTitle}
                      onChange={(e) => setProfessionTitle(e.target.value)}
                      placeholder="e.g. Full-Stack Engineer, Content Creator, Surgeon"
                    />
                    <span className="text-[10px] text-muted-foreground">Displayed as your profession badge on your card and profile</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Profile Persona Label</label>
                    <Input
                      value={personaName}
                      onChange={(e) => setPersonaName(e.target.value)}
                      placeholder="e.g. Engineer Profile, Creator Profile"
                    />
                    <span className="text-[10px] text-muted-foreground">Internal name to easily identify this profile persona</span>
                  </div>
                </div>

                {/* Active Template Showcase */}
                <div className="p-4 rounded-2xl border border-border/80 bg-background/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <LayoutTemplate className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs text-muted-foreground font-medium">Active Template</div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                        <span>Basic Universal</span>
                        <Badge variant="subtle" className="text-[10px] text-primary bg-primary/10">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 h-8 shrink-0 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Lock className="h-3 w-3" />
                    <span>View Templates</span>
                  </Button>
                </div>

                {/* Universal Template Notice */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-muted-foreground">
                  <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Basic Universal Template Active:</strong> Your profile uses this clean universal layout with fixed essential fields (Identity, Bio, Contact Information, and Social Links). All specialty templates and multi-personas are locked and <strong>Coming Soon... for now</strong>!
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  About / Bio
                </label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your story, background, and what drives your work..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">City</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bangalore, San Francisco, etc."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Country</label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India, USA, Germany..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Portfolio Website</label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.me"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Direct Phone</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* Social Links List inside Tab 1 */}
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span>Social & Web Profiles</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Connect your social media, code repositories, or media channel links.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSocial}
                    leftIcon={<Plus className="h-3 w-3" />}
                  >
                    Add Link
                  </Button>
                </div>

                <div className="space-y-3">
                  {socialLinks.map((link, idx) => (
                    <div
                      key={link.id || idx}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-2xl border border-border bg-muted/20"
                    >
                      <select
                        value={link.platform}
                        onChange={(e) => {
                          const newPlatform = e.target.value
                          const updated = [...socialLinks]
                          const oldPlatform = updated[idx].platform
                          updated[idx].platform = newPlatform
                          if (!updated[idx].label || updated[idx].label === oldPlatform) {
                            updated[idx].label = newPlatform
                          }
                          setSocialLinks(updated)
                        }}
                        className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-40"
                      >
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="GitHub">GitHub</option>
                        <option value="X">X (Twitter)</option>
                        <option value="Instagram">Instagram</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Dribbble">Dribbble</option>
                        <option value="Behance">Behance</option>
                        <option value="Medium">Medium</option>
                        <option value="Website">Personal Site</option>
                        <option value="Other">Other</option>
                      </select>

                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...socialLinks]
                          updated[idx].url = e.target.value
                          setSocialLinks(updated)
                        }}
                        placeholder="https://..."
                        className="text-xs flex-1"
                      />

                      <Input
                        value={link.label || ''}
                        onChange={(e) => {
                          const updated = [...socialLinks]
                          updated[idx].label = e.target.value
                          setSocialLinks(updated)
                        }}
                        placeholder="Custom Label"
                        className="text-xs w-full sm:w-36"
                      />

                      <button
                        type="button"
                        onClick={() => setSocialLinks((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive self-end sm:self-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {socialLinks.length === 0 && (
                    <span className="text-xs text-muted-foreground block text-center py-2">
                      No social links added yet. Click "+ Add Link" above.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ================= TAB: MEDIA & CHANNELS (CREATOR) ================= */}
        {visibleTabs.some((t) => t.id === 'media') && (
          <TabsContent value="media" className="space-y-6">
            {renderExtraSectionBanner('media', 'Media & Channels')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Video className="h-4 w-4 text-rose-500" />
                    <span>Media Showcase & Channels</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Highlight your YouTube videos, Spotify tracks, podcasts, Instagram reels, or streaming channels.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddMedia}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Media Item
                </Button>
              </div>

              <div className="space-y-4">
                {mediaGallery.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">
                        Media Item #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMediaGallery((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...mediaGallery]
                          updated[idx].title = e.target.value
                          setMediaGallery(updated)
                        }}
                        placeholder="Title (e.g. Latest YouTube Keynote or Podcast Episode)"
                      />

                      <select
                        value={item.metadata?.platform || 'YouTube'}
                        onChange={(e) => {
                          const updated = [...mediaGallery]
                          updated[idx].metadata = {
                            ...(updated[idx].metadata || {}),
                            platform: e.target.value,
                          }
                          setMediaGallery(updated)
                        }}
                        className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary w-full"
                      >
                        <option value="YouTube">YouTube</option>
                        <option value="Spotify">Spotify</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Vimeo">Vimeo</option>
                        <option value="Twitch">Twitch</option>
                        <option value="Behance">Behance</option>
                        <option value="Dribbble">Dribbble</option>
                        <option value="Podcast">Podcast</option>
                        <option value="Other">Other Platform</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={item.url || ''}
                        onChange={(e) => {
                          const updated = [...mediaGallery]
                          updated[idx].url = e.target.value
                          setMediaGallery(updated)
                        }}
                        placeholder="Media URL (https://...)"
                      />

                      <Input
                        value={item.metadata?.followerCount || ''}
                        onChange={(e) => {
                          const updated = [...mediaGallery]
                          updated[idx].metadata = {
                            ...(updated[idx].metadata || {}),
                            followerCount: e.target.value,
                          }
                          setMediaGallery(updated)
                        }}
                        placeholder="Audience Metric (e.g. 50K+ Subscribers or 1M+ Views)"
                      />
                    </div>

                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => {
                        const updated = [...mediaGallery]
                        updated[idx].description = e.target.value
                        setMediaGallery(updated)
                      }}
                      placeholder="Brief description, context, or call to action..."
                      rows={2}
                    />
                  </div>
                ))}

                {mediaGallery.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No media items added yet. Click "+ Add Media Item" to showcase videos, tracks, or channels.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: VENTURES & ORGANIZATIONS (FOUNDER / EXEC) ================= */}
        {visibleTabs.some((t) => t.id === 'ventures') && (
          <TabsContent value="ventures" className="space-y-6">
            {renderExtraSectionBanner('ventures', 'Ventures & Organizations')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-500" />
                    <span>Ventures & Organizations</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Highlight your founded startups, companies, board seats, and organizational leadership.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddOrganization}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Venture
                </Button>
              </div>

              <div className="space-y-4">
                {organizations.map((org, idx) => (
                  <div
                    key={org.id || idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">
                        Venture #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrganizations((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={org.title}
                        onChange={(e) => {
                          const updated = [...organizations]
                          updated[idx].title = e.target.value
                          setOrganizations(updated)
                        }}
                        placeholder="Company / Venture Name (e.g. OneWinq)"
                      />

                      <Input
                        value={org.subtitle || ''}
                        onChange={(e) => {
                          const updated = [...organizations]
                          updated[idx].subtitle = e.target.value
                          setOrganizations(updated)
                        }}
                        placeholder="Role / Title (e.g. Founder & CEO)"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        value={org.url || ''}
                        onChange={(e) => {
                          const updated = [...organizations]
                          updated[idx].url = e.target.value
                          setOrganizations(updated)
                        }}
                        placeholder="Website (https://...)"
                      />

                      <select
                        value={org.metadata?.stage || 'Bootstrapped'}
                        onChange={(e) => {
                          const updated = [...organizations]
                          updated[idx].metadata = {
                            ...(updated[idx].metadata || {}),
                            stage: e.target.value,
                          }
                          setOrganizations(updated)
                        }}
                        className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary w-full"
                      >
                        <option value="Idea">Idea Stage</option>
                        <option value="Pre-Seed">Pre-Seed</option>
                        <option value="Seed">Seed</option>
                        <option value="Series A+">Series A / Growth</option>
                        <option value="Bootstrapped">Bootstrapped</option>
                        <option value="Acquired">Acquired / Exited</option>
                        <option value="Non-Profit">Non-Profit</option>
                      </select>

                      <Input
                        value={org.metadata?.funding || ''}
                        onChange={(e) => {
                          const updated = [...organizations]
                          updated[idx].metadata = {
                            ...(updated[idx].metadata || {}),
                            funding: e.target.value,
                          }
                          setOrganizations(updated)
                        }}
                        placeholder="Tagline or Pitch (e.g. Autonomous Identity)"
                      />
                    </div>

                    <Textarea
                      value={org.description || ''}
                      onChange={(e) => {
                        const updated = [...organizations]
                        updated[idx].description = e.target.value
                        setOrganizations(updated)
                      }}
                      placeholder="Describe the company's mission, market, or notable milestones..."
                      rows={2}
                    />
                  </div>
                ))}

                {organizations.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No ventures added yet. Click "+ Add Venture" to showcase your startups or organizations.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: CAREER & WORK EXPERIENCE ================= */}
        {visibleTabs.some((t) => t.id === 'career') && (
          <TabsContent value="career" className="space-y-6">
            {renderExtraSectionBanner('career', 'Work Experience')}
            {/* Experience list */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground">Work Experience</h3>
                  <p className="text-xs text-muted-foreground">
                    Add career roles, companies, impact, and achievements.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddExperience}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Role
                </Button>
              </div>

              <div className="space-y-4">
                {experience.map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">
                        Position #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExperience((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={exp.role}
                        onChange={(e) => {
                          const updated = [...experience]
                          updated[idx].role = e.target.value
                          setExperience(updated)
                        }}
                        placeholder="Role / Title"
                      />
                      <Input
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...experience]
                          updated[idx].company = e.target.value
                          setExperience(updated)
                        }}
                        placeholder="Company"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <MonthYearPicker
                        label="Start Date"
                        month={exp.startMonth}
                        year={exp.startYear}
                        onChange={(m, y) => {
                          const updated = [...experience]
                          updated[idx].startMonth = m
                          updated[idx].startYear = y
                          setExperience(updated)
                        }}
                      />
                      <MonthYearPicker
                        label="End Date"
                        month={exp.endMonth}
                        year={exp.endYear}
                        disabled={!!exp.current}
                        onChange={(m, y) => {
                          const updated = [...experience]
                          updated[idx].endMonth = m
                          updated[idx].endYear = y
                          setExperience(updated)
                        }}
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!exp.current}
                          onChange={(e) => {
                            const updated = [...experience]
                            updated[idx].current = e.target.checked
                            if (e.target.checked) {
                              updated[idx].endMonth = null
                              updated[idx].endYear = null
                            }
                            setExperience(updated)
                          }}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="text-xs font-semibold text-foreground/80">
                          I am currently working in this role (Present)
                        </span>
                      </label>
                    </div>

                    <Textarea
                      value={exp.description || ''}
                      onChange={(e) => {
                        const updated = [...experience]
                        updated[idx].description = e.target.value
                        setExperience(updated)
                      }}
                      placeholder="Responsibilities, achievements, impact..."
                      rows={2}
                    />
                  </div>
                ))}

                {experience.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No work experience added yet. Click "+ Add Role" to record your history.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: EDUCATION & ACADEMICS (STUDENT / ACADEMIC) ================= */}
        {visibleTabs.some((t) => t.id === 'education') && (
          <TabsContent value="education" className="space-y-6">
            {renderExtraSectionBanner('education', 'Education & Academics')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>Education & Academic Background</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Universities, degrees, expected graduation, GPA, and coursework.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddEducation}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Education
                </Button>
              </div>

              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">
                        Institution #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEducation((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={edu.institution}
                        onChange={(e) => {
                          const updated = [...education]
                          updated[idx].institution = e.target.value
                          setEducation(updated)
                        }}
                        placeholder="University / Institute (e.g. Stanford University)"
                      />
                      <Input
                        value={edu.degree || ''}
                        onChange={(e) => {
                          const updated = [...education]
                          updated[idx].degree = e.target.value
                          setEducation(updated)
                        }}
                        placeholder="Degree (e.g. B.Tech / B.S. in Computer Science)"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={edu.fieldOfStudy || ''}
                        onChange={(e) => {
                          const updated = [...education]
                          updated[idx].fieldOfStudy = e.target.value
                          setEducation(updated)
                        }}
                        placeholder="Major / Field of Study"
                      />
                      <Input
                        value={(edu as any).grade || ''}
                        onChange={(e) => {
                          const updated = [...education]
                          ;(updated[idx] as any).grade = e.target.value
                          setEducation(updated)
                        }}
                        placeholder="GPA / Grade (e.g. 3.9 / 4.0 or First Class Honors)"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <MonthYearPicker
                        label="Start Date"
                        month={edu.startMonth}
                        year={edu.startYear}
                        onChange={(m, y) => {
                          const updated = [...education]
                          updated[idx].startMonth = m
                          updated[idx].startYear = y
                          setEducation(updated)
                        }}
                      />
                      <MonthYearPicker
                        label="End Date (or Expected Graduation)"
                        month={edu.endMonth}
                        year={edu.endYear}
                        disabled={!!edu.current}
                        onChange={(m, y) => {
                          const updated = [...education]
                          updated[idx].endMonth = m
                          updated[idx].endYear = y
                          setEducation(updated)
                        }}
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!edu.current}
                        onChange={(e) => {
                          const updated = [...education]
                          updated[idx].current = e.target.checked
                          if (e.target.checked) {
                            updated[idx].endMonth = null
                            updated[idx].endYear = null
                          }
                          setEducation(updated)
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-xs font-semibold text-foreground/80">
                        I am currently studying here
                      </span>
                    </label>

                    <Textarea
                      value={edu.description || ''}
                      onChange={(e) => {
                        const updated = [...education]
                        updated[idx].description = e.target.value
                        setEducation(updated)
                      }}
                      placeholder="Relevant coursework, clubs, academic societies, capstone project..."
                      rows={2}
                    />
                  </div>
                ))}

                {education.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No education entries added yet. Click "+ Add Education" to add your academic degrees.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: SKILLS & COMPETENCIES ================= */}
        {visibleTabs.some((t) => t.id === 'skills') && (
          <TabsContent value="skills" className="space-y-6">
            {renderExtraSectionBanner('skills', 'Skills & Technical Stack')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Code className="h-4 w-4 text-primary" />
                    <span>Skills & Technical Stack</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Technologies, frameworks, tools, and domain proficiencies.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddSkill}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Skill
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {skills.map((skill, idx) => (
                  <div
                    key={skill.id || idx}
                    className="p-3.5 rounded-2xl border border-border bg-muted/20 space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                        Skill #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSkills((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Input
                      value={skill.name}
                      onChange={(e) => {
                        const updated = [...skills]
                        updated[idx].name = e.target.value
                        setSkills(updated)
                      }}
                      placeholder="e.g. React, Python, Product Strategy"
                      className="text-xs"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={skill.category || ''}
                        onChange={(e) => {
                          const updated = [...skills]
                          updated[idx].category = e.target.value
                          setSkills(updated)
                        }}
                        placeholder="Category"
                        className="text-[11px]"
                      />

                      <select
                        value={skill.proficiency || 'Advanced'}
                        onChange={(e) => {
                          const updated = [...skills]
                          updated[idx].proficiency = e.target.value
                          setSkills(updated)
                        }}
                        className="rounded-xl border border-input bg-background px-2 py-1 text-[11px] font-semibold"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {skills.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                  No skills listed yet. Click "+ Add Skill" above to display your technical strengths.
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: PROJECTS & WORKS ================= */}
        {visibleTabs.some((t) => t.id === 'projects') && (
          <TabsContent value="projects" className="space-y-6">
            {renderExtraSectionBanner('projects', 'Projects & Portfolio')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Projects & Portfolio</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Code repositories, open-source work, client builds, and live products.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddProject}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Project
                </Button>
              </div>

              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">
                        Project #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={proj.title}
                        onChange={(e) => {
                          const updated = [...projects]
                          updated[idx].title = e.target.value
                          setProjects(updated)
                        }}
                        placeholder="Project Title"
                      />
                      <Input
                        value={proj.url || ''}
                        onChange={(e) => {
                          const updated = [...projects]
                          updated[idx].url = e.target.value
                          setProjects(updated)
                        }}
                        placeholder="Live Demo / Repository URL"
                      />
                    </div>

                    <Textarea
                      value={proj.description || ''}
                      onChange={(e) => {
                        const updated = [...projects]
                        updated[idx].description = e.target.value
                        setProjects(updated)
                      }}
                      placeholder="Tech stack, features built, system architecture, outcomes..."
                      rows={2}
                    />
                  </div>
                ))}

                {projects.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No projects listed yet. Click "+ Add Project" to highlight your work.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: COMBINED SKILLS & PROJECTS (GENERAL) ================= */}
        {visibleTabs.some((t) => t.id === 'skills-projects') && (
          <TabsContent value="skills-projects" className="space-y-6">
            {renderExtraSectionBanner('skills-projects', 'Skills & Projects')}
            {/* Skills */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Skills & Expertise</h3>
                <Button variant="subtle" size="sm" onClick={handleAddSkill} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Add Skill
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {skills.map((skill, idx) => (
                  <div key={skill.id || idx} className="p-3 rounded-2xl border border-border bg-muted/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-primary">Skill #{idx + 1}</span>
                      <button type="button" onClick={() => setSkills((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      value={skill.name}
                      onChange={(e) => {
                        const updated = [...skills]
                        updated[idx].name = e.target.value
                        setSkills(updated)
                      }}
                      placeholder="Skill Name"
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Projects & Portfolio</h3>
                <Button variant="subtle" size="sm" onClick={handleAddProject} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Add Project
                </Button>
              </div>
              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div key={proj.id || idx} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">Project #{idx + 1}</span>
                      <button type="button" onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={proj.title}
                        onChange={(e) => {
                          const updated = [...projects]
                          updated[idx].title = e.target.value
                          setProjects(updated)
                        }}
                        placeholder="Project Title"
                      />
                      <Input
                        value={proj.url || ''}
                        onChange={(e) => {
                          const updated = [...projects]
                          updated[idx].url = e.target.value
                          setProjects(updated)
                        }}
                        placeholder="URL (https://...)"
                      />
                    </div>
                    <Textarea
                      value={proj.description || ''}
                      onChange={(e) => {
                        const updated = [...projects]
                        updated[idx].description = e.target.value
                        setProjects(updated)
                      }}
                      placeholder="Description & outcomes..."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: SERVICES & PACKAGES ================= */}
        {visibleTabs.some((t) => t.id === 'services') && (
          <TabsContent value="services" className="space-y-6">
            {renderExtraSectionBanner('services', 'Services & Packages')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-500" />
                    <span>Services, Pricing & Offerings</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define client services, advisory packages, and pricing structures.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddService}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Service
                </Button>
              </div>

              <div className="space-y-4">
                {services.map((srv, idx) => (
                  <div
                    key={srv.id || idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">
                        Service #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={srv.title}
                        onChange={(e) => {
                          const updated = [...services]
                          updated[idx].title = e.target.value
                          setServices(updated)
                        }}
                        placeholder="Service Title (e.g. System Design Consultation)"
                      />
                      <Input
                        value={srv.priceRange || ''}
                        onChange={(e) => {
                          const updated = [...services]
                          updated[idx].priceRange = e.target.value
                          setServices(updated)
                        }}
                        placeholder="Rate / Price Range (e.g. $150/hr or $2,500/project)"
                      />
                    </div>

                    <Textarea
                      value={srv.description || ''}
                      onChange={(e) => {
                        const updated = [...services]
                        updated[idx].description = e.target.value
                        setServices(updated)
                      }}
                      placeholder="What is included, deliverables, timeline..."
                      rows={2}
                    />
                  </div>
                ))}

                {services.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No services listed yet. Click "+ Add Service" to offer client consultations or deliverables.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: CERTIFICATIONS & CREDENTIALS ================= */}
        {visibleTabs.some((t) => t.id === 'certifications') && (
          <TabsContent value="certifications" className="space-y-6">
            {renderExtraSectionBanner('certifications', 'Certifications')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground">Certifications & Licenses</h3>
                  <p className="text-xs text-muted-foreground">
                    Verified industry certifications, badges, and accreditations.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddCertification}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Certification
                </Button>
              </div>

              <div className="space-y-4">
                {certifications.map((cert, idx) => (
                  <div
                    key={cert.id || idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">
                        Certification #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...certifications]
                          updated[idx].name = e.target.value
                          setCertifications(updated)
                        }}
                        placeholder="Certificate Title"
                      />
                      <Input
                        value={cert.issuer}
                        onChange={(e) => {
                          const updated = [...certifications]
                          updated[idx].issuer = e.target.value
                          setCertifications(updated)
                        }}
                        placeholder="Issuer (e.g. AWS, Google)"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={cert.credentialId || ''}
                        onChange={(e) => {
                          const updated = [...certifications]
                          updated[idx].credentialId = e.target.value
                          setCertifications(updated)
                        }}
                        placeholder="Credential ID (optional)"
                      />
                      <Input
                        value={cert.url || ''}
                        onChange={(e) => {
                          const updated = [...certifications]
                          updated[idx].url = e.target.value
                          setCertifications(updated)
                        }}
                        placeholder="Verification Link (https://...)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: COMBINED CREDENTIALS & SERVICES (GENERAL) ================= */}
        {visibleTabs.some((t) => t.id === 'credentials') && (
          <TabsContent value="credentials" className="space-y-6">
            {renderExtraSectionBanner('credentials', 'Credentials & Services')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Certifications & Licenses</h3>
                <Button variant="subtle" size="sm" onClick={handleAddCertification} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Add Certification
                </Button>
              </div>
              <div className="space-y-4">
                {certifications.map((cert, idx) => (
                  <div key={cert.id || idx} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">Cert #{idx + 1}</span>
                      <button type="button" onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...certifications]
                          updated[idx].name = e.target.value
                          setCertifications(updated)
                        }}
                        placeholder="Certificate Name"
                      />
                      <Input
                        value={cert.issuer}
                        onChange={(e) => {
                          const updated = [...certifications]
                          updated[idx].issuer = e.target.value
                          setCertifications(updated)
                        }}
                        placeholder="Issuer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Professional Services</h3>
                <Button variant="subtle" size="sm" onClick={handleAddService} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Add Service
                </Button>
              </div>
              <div className="space-y-4">
                {services.map((srv, idx) => (
                  <div key={srv.id || idx} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">Service #{idx + 1}</span>
                      <button type="button" onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={srv.title}
                        onChange={(e) => {
                          const updated = [...services]
                          updated[idx].title = e.target.value
                          setServices(updated)
                        }}
                        placeholder="Service Title"
                      />
                      <Input
                        value={srv.priceRange || ''}
                        onChange={(e) => {
                          const updated = [...services]
                          updated[idx].priceRange = e.target.value
                          setServices(updated)
                        }}
                        placeholder="Price / Rate"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: AWARDS & HONORS ================= */}
        {visibleTabs.some((t) => t.id === 'awards') && (
          <TabsContent value="awards" className="space-y-6">
            {renderExtraSectionBanner('awards', 'Awards & Honors')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>Awards, Honors & Speaking</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Keynotes, industry recognitions, and competitive accolades.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddAward}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Award
                </Button>
              </div>

              <div className="space-y-4">
                {awards.map((aw, idx) => (
                  <div key={aw.id || idx} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">Award #{idx + 1}</span>
                      <button type="button" onClick={() => setAwards((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={aw.title}
                        onChange={(e) => {
                          const updated = [...awards]
                          updated[idx].title = e.target.value
                          setAwards(updated)
                        }}
                        placeholder="Award Title (e.g. Forbes 30 Under 30)"
                      />
                      <Input
                        value={aw.issuer || ''}
                        onChange={(e) => {
                          const updated = [...awards]
                          updated[idx].issuer = e.target.value
                          setAwards(updated)
                        }}
                        placeholder="Issuer (e.g. Forbes)"
                      />
                    </div>
                    <Textarea
                      value={aw.description || ''}
                      onChange={(e) => {
                        const updated = [...awards]
                        updated[idx].description = e.target.value
                        setAwards(updated)
                      }}
                      placeholder="Brief details..."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: PUBLICATIONS & RESEARCH ================= */}
        {visibleTabs.some((t) => t.id === 'publications') && (
          <TabsContent value="publications" className="space-y-6">
            {renderExtraSectionBanner('publications', 'Publications & Research')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Publications & Research Papers</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Peer-reviewed papers, books, articles, and whitepapers.
                  </p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleAddPublication}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Publication
                </Button>
              </div>

              <div className="space-y-4">
                {publications.map((pub, idx) => (
                  <div key={pub.id || idx} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary uppercase">Publication #{idx + 1}</span>
                      <button type="button" onClick={() => setPublications((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={pub.title}
                        onChange={(e) => {
                          const updated = [...publications]
                          updated[idx].title = e.target.value
                          setPublications(updated)
                        }}
                        placeholder="Paper / Article Title"
                      />
                      <Input
                        value={pub.publisher || ''}
                        onChange={(e) => {
                          const updated = [...publications]
                          updated[idx].publisher = e.target.value
                          setPublications(updated)
                        }}
                        placeholder="Publisher / Journal"
                      />
                    </div>
                    <Input
                      value={pub.url || ''}
                      onChange={(e) => {
                        const updated = [...publications]
                        updated[idx].url = e.target.value
                        setPublications(updated)
                      }}
                      placeholder="Link (https://...)"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB: CUSTOM SECTIONS ================= */}
        {visibleTabs.some((t) => t.id === 'custom-blocks') && (
          <TabsContent value="custom-blocks" className="space-y-6">
            {renderExtraSectionBanner('custom-blocks', 'Custom Sections')}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Custom Portfolio Sections</h3>
                <p className="text-xs text-muted-foreground">
                  Build custom modular sections with text, media links, and custom markdown.
                </p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={handleAddCustomSection}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Custom Section
              </Button>
            </div>

            <div className="space-y-6">
              {customSections.map((sec, sIdx) => (
                <div key={sec.id || sIdx} className="p-5 rounded-2xl border border-border bg-muted/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary uppercase">
                      Custom Section #{sIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomSections((prev) => prev.filter((_, i) => i !== sIdx))}
                      className="text-muted-foreground hover:text-destructive p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={sec.title}
                      onChange={(e) => {
                        const updated = [...customSections]
                        updated[sIdx].title = e.target.value
                        setCustomSections(updated)
                      }}
                      placeholder="Section Title"
                    />
                    <Input
                      value={sec.description || ''}
                      onChange={(e) => {
                        const updated = [...customSections]
                        updated[sIdx].description = e.target.value
                        setCustomSections(updated)
                      }}
                      placeholder="Subtitle / Description"
                    />
                  </div>

                  <div className="space-y-2">
                    {sec.blocks.map((blk, bIdx) => (
                      <div key={bIdx} className="p-3 bg-card border border-border/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground capitalize">
                            Block: {blk.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...customSections]
                              updated[sIdx].blocks = updated[sIdx].blocks.filter((_, i) => i !== bIdx)
                              setCustomSections(updated)
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Textarea
                          value={blk.content}
                          onChange={(e) => {
                            const updated = [...customSections]
                            updated[sIdx].blocks[bIdx].content = e.target.value
                            setCustomSections(updated)
                          }}
                          placeholder="Content details..."
                          rows={2}
                        />
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlockToSection(sIdx, 'text')}
                        className="text-xs h-7 px-2"
                      >
                        + Add Text
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlockToSection(sIdx, 'link')}
                        className="text-xs h-7 px-2"
                      >
                        + Add Link
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {customSections.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                  No custom blocks configured yet. Click "+ Add Custom Section" above.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      )}

        {/* ================= TAB: VISIBILITY RULES ================= */}
        <TabsContent value="privacy" className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground">Visibility & Presentation Control</h3>
              <p className="text-xs text-muted-foreground">
                Set visibility permissions for sections and sensitive contact fields.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 text-xs">
                <div>
                  <div className="font-semibold text-foreground">Avatar Visibility</div>
                  <div className="text-muted-foreground text-[11px]">Who can view your profile photo</div>
                </div>
                <select
                  value={avatarVisibility}
                  onChange={(e) => setAvatarVisibility(e.target.value as any)}
                  className="rounded-xl border border-input bg-background px-2.5 py-1 text-xs font-semibold"
                >
                  <option value={SECTION_VISIBILITY.PUBLIC}>PUBLIC</option>
                  <option value={SECTION_VISIBILITY.PROFESSIONAL}>PROFESSIONAL</option>
                  <option value={SECTION_VISIBILITY.PRIVATE}>PRIVATE</option>
                </select>
              </div>

              {[
                { key: 'experience', label: 'Work Experience' },
                { key: 'education', label: 'Education & Academics' },
                { key: 'skills', label: 'Skills & Tech Stack' },
                { key: 'projects', label: 'Projects & Portfolio' },
                { key: 'media', label: 'Media & Channels' },
                { key: 'ventures', label: 'Ventures & Organizations' },
                { key: 'services', label: 'Services & Pricing' },
                { key: 'certifications', label: 'Certifications' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 text-xs"
                >
                  <div>
                    <div className="font-semibold text-foreground">{item.label}</div>
                    <div className="text-muted-foreground text-[11px]">Controls display in public mode</div>
                  </div>
                  <select
                    value={sectionVisibility[item.key] || SECTION_VISIBILITY.PUBLIC}
                    onChange={(e) =>
                      setSectionVisibility((prev) => ({
                        ...prev,
                        [item.key]: e.target.value as any,
                      }))
                    }
                    className="rounded-xl border border-input bg-background px-2.5 py-1 text-xs font-semibold"
                  >
                    <option value={SECTION_VISIBILITY.PUBLIC}>PUBLIC</option>
                    <option value={SECTION_VISIBILITY.PROFESSIONAL}>PROFESSIONAL</option>
                    <option value={SECTION_VISIBILITY.PRIVATE}>PRIVATE</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create New Profession Persona Modal */}
      {isCreatePersonaOpen && (
        <Dialog open={isCreatePersonaOpen} onOpenChange={setIsCreatePersonaOpen}>
          <DialogHeader>
            <DialogTitle>Create New Profession Profile</DialogTitle>
            <DialogDescription>
              Create a dedicated profile persona for another profession (e.g. Content Creator, Doctor, Founder). Both profiles will exist at the same time, and you can switch between them anytime!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Profession Name / Title</label>
              <Input
                value={newPersonaTitle}
                onChange={(e) => setNewPersonaTitle(e.target.value)}
                placeholder="e.g. Content Creator, Tech Reviewer, Doctor, Consultant"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Choose Profession Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {templates.map((tpl) => (
                  <div
                    key={tpl._id || tpl.slug}
                    onClick={() => {
                      setNewPersonaTemplate(tpl.slug)
                      if (!newPersonaTitle.trim()) {
                        setNewPersonaTitle(tpl.name)
                      }
                    }}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      newPersonaTemplate === tpl.slug
                        ? 'border-primary bg-primary/10 font-bold text-foreground ring-1 ring-primary/40'
                        : 'border-border/80 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-foreground">{tpl.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{tpl.category}</div>
                    </div>
                    {newPersonaTemplate === tpl.slug && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCreatePersonaOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={createPersonaMutation.isPending}
              disabled={!newPersonaTitle.trim()}
              onClick={() => {
                createPersonaMutation.mutate({
                  personaName: newPersonaTitle.trim(),
                  professionTitle: newPersonaTitle.trim(),
                  templateSlug: newPersonaTemplate,
                })
              }}
            >
              Create Profile Persona
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Template Switcher Modal in Tab 1 */}
      {isTemplateModalOpen && (
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogHeader>
            <DialogTitle>Profile Presentation Templates</DialogTitle>
            <DialogDescription>
              Choose a presentation template for your profile. Active templates are immediately applied to your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {templates.map((tpl) => {
                const isCurrent = templateSlug === tpl.slug
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
                        toast.default(`The "${t.name}" template is locked and coming soon... for now!`)
                        return
                      }
                      if (!isCurrent) {
                        switchTemplateMutation.mutate({ templateSlug: t.slug })
                        setIsTemplateModalOpen(false)
                      }
                    }}
                    showSelectButton
                  />
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTemplateModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
