import type { VisibilityMode, SectionVisibility, ProfileState } from '@/constants/app.constants'

export interface ProfessionalIdentity {
  _id?: string
  id?: string
  customTitle: string
  professionId?: string | { _id: string; title: string; category?: string } | null
  isPrimary: boolean
  displayOrder: number
}

export interface SocialLink {
  id?: string
  platform: string
  url: string
  label?: string
}

export interface ExperienceItem {
  id?: string
  company: string
  role: string
  location?: string
  startMonth?: number | null
  startYear?: number | null
  endMonth?: number | null
  endYear?: number | null
  startDate?: string | null
  endDate?: string | null
  current?: boolean
  description?: string
}

export interface EducationItem {
  id?: string
  institution: string
  degree?: string
  fieldOfStudy?: string
  startMonth?: number | null
  startYear?: number | null
  endMonth?: number | null
  endYear?: number | null
  startDate?: string | null
  endDate?: string | null
  current?: boolean
  description?: string
}

export interface SkillItem {
  id?: string
  name: string
  category?: string
  proficiency?: string
}

export interface ProjectItem {
  id?: string
  title: string
  description?: string
  url?: string
  imageUrl?: string
  mediaUrls?: string[]
  startMonth?: number | null
  startYear?: number | null
  endMonth?: number | null
  endYear?: number | null
  startDate?: string | null
  endDate?: string | null
  current?: boolean
}

export interface CertificationItem {
  id?: string
  name: string
  issuer: string
  issueMonth?: number | null
  issueYear?: number | null
  expiryMonth?: number | null
  expiryYear?: number | null
  issueDate?: string | null
  expiryDate?: string | null
  doesNotExpire?: boolean
  credentialId?: string
  url?: string
}

export interface ServiceItem {
  id?: string
  title: string
  description?: string
  priceRange?: string
}

export interface AwardItem {
  id?: string
  title: string
  issuer?: string
  month?: number | null
  year?: number | null
  date?: string | null
  description?: string
}

export interface PublicationItem {
  id?: string
  title: string
  publisher?: string
  month?: number | null
  year?: number | null
  date?: string | null
  url?: string
  description?: string
}

export interface CustomBlock {
  type: 'text' | 'media' | 'link'
  content: string
  mediaUrl?: string
}

export interface CustomSectionItem {
  id?: string
  title: string
  description?: string
  blocks: CustomBlock[]
  displayOrder: number
}

export interface MediaGalleryItem {
  id?: string
  title: string
  subtitle?: string
  description?: string
  url?: string
  month?: number | null
  year?: number | null
  date?: string | null
  metadata?: {
    platform?: string
    thumbnailUrl?: string
    followerCount?: string
    featured?: boolean
  }
}

export interface OrganizationItem {
  id?: string
  title: string
  subtitle?: string
  description?: string
  url?: string
  month?: number | null
  year?: number | null
  date?: string | null
  metadata?: {
    role?: string
    stage?: string
    status?: string
    funding?: string
  }
}

export interface PrivateDocumentItem {
  id?: string
  title: string
  subtitle?: string
  description?: string
  url?: string
  month?: number | null
  year?: number | null
  date?: string | null
  showOnProfile?: boolean
  metadata?: {
    showOnProfile?: boolean
    docType?: string
    docNumber?: string
    originalFilename?: string
    fileSize?: number
    mimeType?: string
    [key: string]: any
  }
}

export interface LocationInfo {
  city?: string
  state?: string
  country?: string
  isRemote?: boolean
}

export interface ContactInfo {
  email?: string
  phone?: string
  website?: string
  address?: string
}

export type MultiModeVisibility = SectionVisibility | SectionVisibility[] | 'ALL' | string | string[]

export interface ModeOverrideData {
  headline?: string
  bio?: string
  avatarUrl?: string | null
  coverUrl?: string | null
}

export interface ProfileVisibilitySettings {
  avatarVisibility?: MultiModeVisibility
  sectionVisibility?: Record<string, MultiModeVisibility>
  fieldVisibility?: Record<string, MultiModeVisibility>
}

export interface Profile {
  _id: string
  id?: string
  userId: string | { _id: string; username: string; displayName: string; email?: string }
  displayName?: string
  headline?: string
  bio?: string
  avatarUrl?: string | null
  coverUrl?: string | null
  modeData?: Record<string, ModeOverrideData>
  location?: LocationInfo
  contact?: ContactInfo
  socialLinks?: SocialLink[]
  education?: EducationItem[]
  experience?: ExperienceItem[]
  skills?: SkillItem[]
  projects?: ProjectItem[]
  certifications?: CertificationItem[]
  services?: ServiceItem[]
  personaName?: string
  professionTitle?: string
  templateSlug?: string
  isActive?: boolean
  awards?: AwardItem[]
  publications?: PublicationItem[]
  mediaGallery?: MediaGalleryItem[]
  organizations?: OrganizationItem[]
  privateDocuments?: PrivateDocumentItem[]
  customSections?: CustomSectionItem[]
  sections?: Record<string, any[]>
  sectionOrder?: string[]
  activeMode: VisibilityMode
  temporaryMode?: {
    mode: VisibilityMode
    expiresAt: string
    fallbackMode: VisibilityMode
  } | null
  templateId?: string | ProfileTemplate | null
  template?: ProfileTemplate | null
  state: ProfileState
  visibility: ProfileVisibilitySettings
  avatarVisibility?: MultiModeVisibility
  sectionVisibility?: Record<string, MultiModeVisibility>
  fieldVisibility?: Record<string, MultiModeVisibility>
  identities?: ProfessionalIdentity[]
  primaryIdentity?: ProfessionalIdentity | null
  createdAt?: string
  updatedAt?: string
}

export interface ProfilePersona {
  id: string
  _id: string
  personaName: string
  professionTitle: string
  templateSlug: string
  template?: ProfileTemplate | null
  isActive: boolean
  state: string
  headline?: string
  createdAt?: string
  updatedAt?: string
}

export interface ProfileTemplate {
  id: string
  _id?: string
  name: string
  slug: string
  description: string
  category: string
  recommendedSectionIds: string[]
  layoutConfig?: {
    heroStyle?: 'clean' | 'banner' | 'split' | 'compact' | 'media' | string
    cardStyle?: 'modern' | 'minimal' | 'bordered' | 'glass' | string
    metadata?: Record<string, any>
  }
  themeConfig?: {
    accentColor?: string
    fontPreset?: string
    badgeStyle?: string
  }
  previewImage?: string | null
  status?: 'active' | 'draft' | 'archived' | 'ACTIVE' | 'INACTIVE'
  displayOrder?: number
  isFeatured?: boolean
  isLocked?: boolean
  comingSoon?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProfileRecommendationResponse {
  template?: ProfileTemplate | null
  activeTemplate?: {
    id: string
    name: string
    slug: string
    category: string
  } | null
  templateRecommendations: string[]
  roleRecommendations: string[]
  combinedRecommendations: string[]
  existingSections: string[]
  missingRecommendedSections: string[]
}

export interface PublicProfileResponse {
  profile: Profile | null
  user: {
    id?: string
    _id?: string
    username: string
    displayName: string
    avatarUrl?: string | null
    primaryProfession?: string
  }
  activeMode?: VisibilityMode
  connectionState?: string
  connectionStatus?: string
  connectionId?: string | null
  hasActiveCard?: boolean
  isCardGated?: boolean
  cardStatus?: 'CARD_REQUIRED' | 'ACTIVE' | 'NONE'
  activeCard?: {
    cardCode?: string
    cardUid?: string
    cardId?: string
    edition?: string
  } | null
  activePersona?: {
    id: string
    personaName: string
    professionTitle: string
    templateSlug: string
  } | null
}
