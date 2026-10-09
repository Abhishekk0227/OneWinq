import type {
  OrganizationType,
  OrganizationStatus,
  OrganizationRole,
  JobStatus,
  EmploymentType,
  WorkplaceType,
  ApplicationStatus,
  ProfileApprovalStatus,
  EventStatus,
  EventEligibilityType,
  EventRegistrationStatus,
} from '@/constants/app.constants';

export interface OrganizationLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  isRemoteFriendly?: boolean;
}

export interface OrganizationContact {
  email?: string;
  phone?: string;
  supportEmail?: string;
  workingHours?: string;
  directionsUrl?: string;
}

export interface OrganizationCustomMetric {
  label: string;
  value: string;
}

export interface OrganizationOverviewStats {
  foundedYear?: number | null;
  locationShort?: string;
  teamSize?: string;
  customerBase?: string;
  customMetrics?: OrganizationCustomMetric[];
}

export interface OrganizationValueItem {
  title: string;
  description?: string;
  icon?: string;
}

export interface OrganizationAboutStory {
  aboutCompany?: string;
  mission?: string;
  vision?: string;
  story?: string;
  values?: OrganizationValueItem[];
}

export interface OrganizationBranding {
  logoUrl?: string | null;
  coverUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontHeading?: string;
  fontBody?: string;
  themeMode?: 'light' | 'dark' | 'system';
}

export interface OrganizationSocialLink {
  platform: string;
  url: string;
}

export interface OrganizationSettings {
  allowMemberJobPosting?: boolean;
  requireApprovalForCards?: boolean;
  requireApprovalForProfileChanges?: boolean;
  allowCustomThemes?: boolean;
  defaultVisibility?: 'public' | 'internal' | 'private';
  isPublicDirectory?: boolean;
  defaultTemplateId?: string | null;
}

export interface OrganizationProduct {
  name: string;
  title?: string;
  description?: string;
  imageUrl?: string | null;
  linkUrl?: string;
  ctaUrl?: string;
  tag?: string;
  category?: string;
  badge?: string;
  order?: number;
  isVisible?: boolean;
}

export interface OrganizationProject {
  title: string;
  description?: string;
  client?: string;
  coverUrl?: string | null;
  imageUrl?: string | null;
  linkUrl?: string;
  projectUrl?: string;
  metrics?: string;
  category?: string;
  status?: 'all' | 'ongoing' | 'completed';
  order?: number;
  isVisible?: boolean;
}

export interface OrganizationAchievement {
  title: string;
  subtitle?: string;
  issuer?: string;
  year?: number | null;
  description?: string;
  badgeUrl?: string | null;
  metric?: string;
  order?: number;
  isVisible?: boolean;
}

export interface OrganizationMediaItem {
  title?: string;
  type?: 'all' | 'photo' | 'video' | 'news' | 'event' | 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string | null;
  date?: string;
  caption?: string;
  description?: string;
  order?: number;
  isVisible?: boolean;
}

export interface OrganizationRoleItem {
  _id?: string;
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: OrganizationStatus;
  tagline?: string;
  description?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  website?: string;
  industry?: string;
  size?: string;
  foundedYear?: number | null;
  location?: OrganizationLocation;
  contact?: OrganizationContact;
  overviewStats?: OrganizationOverviewStats;
  about?: OrganizationAboutStory;
  branding?: OrganizationBranding;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: OrganizationSocialLink[];
  ownerId: string;
  isVerified: boolean;
  verifiedAt?: string | null;
  membersCount: number;
  jobsCount: number;
  settings?: OrganizationSettings;
  products?: OrganizationProduct[];
  projects?: OrganizationProject[];
  achievements?: OrganizationAchievement[];
  mediaGallery?: OrganizationMediaItem[];
  executives?: Array<{
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
    jobTitle?: string;
    executivePosition?: string;
    executiveOrder?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganizationMembership {
  membershipId: string;
  role: OrganizationRole;
  jobTitle: string;
  employeeId?: string;
  permissions: string[];
  joinedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    type: OrganizationType;
    status: OrganizationStatus;
    tagline?: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    industry?: string;
    isVerified: boolean;
    membersCount: number;
  };
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parentDepartmentId?: string | null;
  leadMemberId?: string | null;
  membersCount?: number;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  role: OrganizationRole;
  jobTitle: string;
  employeeId?: string;
  isExecutive?: boolean;
  executivePosition?: string | null;
  executiveOrder?: number;
  department?: { id: string; name: string; code: string } | null;
  status: string;
  profileCompletionScore?: number;
  approvalStatus?: ProfileApprovalStatus;
  isLocked?: boolean;
  draftProfile?: any;
  publishedProfile?: any;
  joinedAt: string;
}

export interface OrganizationInvitationItem {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  jobTitle?: string;
  departmentId?: string | null;
  department?: { id: string; name: string; code?: string } | null;
  invitedBy?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationPreviewData {
  invitation: {
    id: string;
    email: string;
    role: OrganizationRole;
    jobTitle?: string;
    status: string;
    isExpired: boolean;
    expiresAt: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    tagline?: string;
    description?: string;
    website?: string;
  };
  department?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  invitedBy?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  userExists: boolean;
  existingUser?: {
    displayName: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface ProfileApprovalDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface ProfileApproval {
  id: string;
  memberId: string;
  user?: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  submittedBy?: {
    id: string;
    displayName: string;
  } | null;
  status: ProfileApprovalStatus;
  diffSummary: ProfileApprovalDiff[];
  draftSnapshot: any;
  reviewer?: {
    id: string;
    displayName: string;
  } | null;
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface EventLocation {
  type: 'PHYSICAL' | 'VIRTUAL' | 'HYBRID';
  venue?: string;
  meetingUrl?: string;
}

export interface EventEligibility {
  type: EventEligibilityType;
  departmentIds?: string[];
  roleIds?: string[];
}

export interface EnterpriseEvent {
  id: string;
  title: string;
  slug?: string;
  category: string;
  description?: string;
  bannerUrl?: string | null;
  location: EventLocation;
  startDate: string;
  endDate: string;
  maxCapacity?: number | null;
  registeredCount: number;
  eligibility: EventEligibility;
  status: EventStatus;
  isEligible?: boolean;
  createdAt: string;
}

export interface EventTicketPass {
  id: string;
  ticketCode: string;
  status: EventRegistrationStatus;
  registeredAt: string;
  event?: {
    id: string;
    title: string;
    category: string;
    bannerUrl?: string | null;
    location: EventLocation;
    startDate: string;
    endDate: string;
  } | null;
}

export interface JobSalary {
  min?: number | null;
  max?: number | null;
  currency?: string;
  period?: 'YEARLY' | 'MONTHLY' | 'HOURLY';
  isDisclosed?: boolean;
}

export interface Job {
  id: string;
  title: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    location?: OrganizationLocation;
    isVerified?: boolean;
    type?: OrganizationType;
  } | null;
  department?: { id: string; name: string; code?: string } | null;
  description: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location?: { city?: string; state?: string; country?: string; isRemote?: boolean };
  salary?: JobSalary;
  skills: string[];
  experienceLevel?: string;
  status: JobStatus;
  applicationsCount?: number;
  viewsCount?: number;
  publishedAt?: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  applicant?: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
    headline?: string;
    skills?: string[];
  };
  workplaceType?: WorkplaceType;
  employmentType?: EmploymentType;
  status: ApplicationStatus;
  resumeUrl?: string | null;
  coverLetter?: string;
  createdAt: string;
}
