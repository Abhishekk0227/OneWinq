import { apiClient } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  Organization,
  UserOrganizationMembership,
  OrganizationMember,
  Department,
} from '@/types/organization.types';

export const organizationsApi = {
  getMyOrganizations: () =>
    apiClient.get<never, ApiResponse<{ organizations: UserOrganizationMembership[] }>>(
      '/me/organizations'
    ),

  create: (data: Partial<Organization>) =>
    apiClient.post<never, ApiResponse<{ organization: Organization }>>(
      '/organizations',
      data
    ),

  getById: (organizationId: string) =>
    apiClient.get<never, ApiResponse<{ organization: Organization }>>(
      `/organizations/${organizationId}`
    ),

  getBySlug: (slug: string) =>
    apiClient.get<never, ApiResponse<{ organization: Organization }>>(
      `/organizations/slug/${slug}`
    ),

  update: (organizationId: string, data: Partial<Organization>) =>
    apiClient.patch<never, ApiResponse<{ organization: Organization }>>(
      `/organizations/${organizationId}`,
      data
    ),

  listMembers: (organizationId: string, params?: { page?: number; limit?: number; role?: string; departmentId?: string; q?: string }) =>
    apiClient.get<never, ApiResponse<{ members: OrganizationMember[]; pagination: any }>>(
      `/organizations/${organizationId}/members`,
      { params }
    ),

  inviteMember: (organizationId: string, data: { email: string; role?: string; departmentId?: string; jobTitle?: string }) =>
    apiClient.post<never, ApiResponse<{ invitation: any; inviteLink: string }>>(
      `/organizations/${organizationId}/invitations`,
      data
    ),

  updateMember: (organizationId: string, memberId: string, data: Partial<OrganizationMember>) =>
    apiClient.patch<never, ApiResponse<{ member: OrganizationMember }>>(
      `/organizations/${organizationId}/members/${memberId}`,
      data
    ),

  removeMember: (organizationId: string, memberId: string) =>
    apiClient.delete<never, ApiResponse<{ success: boolean }>>(
      `/organizations/${organizationId}/members/${memberId}`
    ),

  acceptInvitation: (token: string) =>
    apiClient.post<never, ApiResponse<{ member: OrganizationMember }>>(
      '/organizations/invitations/accept',
      { token }
    ),

  listDepartments: (organizationId: string) =>
    apiClient.get<never, ApiResponse<{ departments: Department[] }>>(
      `/organizations/${organizationId}/departments`
    ),

  createDepartment: (organizationId: string, data: { name: string; code?: string; description?: string }) =>
    apiClient.post<never, ApiResponse<{ department: Department }>>(
      `/organizations/${organizationId}/departments`,
      data
    ),

  updateDepartment: (organizationId: string, departmentId: string, data: { name?: string; code?: string; description?: string }) =>
    apiClient.patch<never, ApiResponse<{ department: Department }>>(
      `/organizations/${organizationId}/departments/${departmentId}`,
      data
    ),

  deleteDepartment: (organizationId: string, departmentId: string) =>
    apiClient.delete<never, ApiResponse<{ success: boolean }>>(
      `/organizations/${organizationId}/departments/${departmentId}`
    ),

  listAuditLogs: (organizationId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ logs: any[]; pagination: any }>>(
      `/organizations/${organizationId}/audit-logs`,
      { params }
    ),
};
