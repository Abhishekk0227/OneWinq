import type {
  OrganizationType,
  OrganizationStatus,
  OrganizationRole,
  JobStatus,
  EmploymentType,
  WorkplaceType,
  ApplicationStatus,
} from '@/constants/app.constants';

export interface OrganizationLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isRemoteFriendly?: boolean;
}

export interface OrganizationSocialLink {
  platform: string;
  url: string;
}

export interface OrganizationSettings {
  allowMemberJobPosting?: boolean;
  requireApprovalForCards?: boolean;
  isPublicDirectory?: boolean;
  defaultTemplateId?: string | null;
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
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: OrganizationSocialLink[];
  ownerId: string;
  isVerified: boolean;
  verifiedAt?: string | null;
  membersCount: number;
  jobsCount: number;
  settings?: OrganizationSettings;
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
  department?: { id: string; name: string; code: string } | null;
  status: string;
  joinedAt: string;
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
