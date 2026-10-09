import { apiClient } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  Organization,
  UserOrganizationMembership,
  OrganizationMember,
  Department,
  OrganizationInvitationItem,
  InvitationPreviewData,
} from '@/types/organization.types';

export const organizationsApi = {
  getMyOrganizations: () =>
    apiClient.get<never, ApiResponse<{ organizations: UserOrganizationMembership[] }>>(
      '/me/organizations'
    ),

  getMyPendingInvitations: () =>
    apiClient.get<never, ApiResponse<{ invitations: any[] }>>(
      '/organizations/my/invitations'
    ),

  acceptMyPendingInvitation: (invitationId: string) =>
    apiClient.post<never, ApiResponse<{ member: any; organization: any }>>(
      `/organizations/my/invitations/${invitationId}/accept`
    ),

  declineMyPendingInvitation: (invitationId: string) =>
    apiClient.post<never, ApiResponse<{ success: boolean; message: string }>>(
      `/organizations/my/invitations/${invitationId}/decline`
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

  listInvitations: (organizationId: string, params?: { status?: string; q?: string; page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ invitations: OrganizationInvitationItem[]; pagination: any }>>(
      `/organizations/${organizationId}/invitations`,
      { params }
    ),

  inviteMember: (organizationId: string, data: { email: string; role?: string; departmentId?: string; jobTitle?: string }) =>
    apiClient.post<never, ApiResponse<{ invitation: any; inviteLink: string }>>(
      `/organizations/${organizationId}/invitations`,
      data
    ),

  resendInvitation: (organizationId: string, invitationId: string) =>
    apiClient.post<never, ApiResponse<{ invitation: OrganizationInvitationItem; inviteLink: string }>>(
      `/organizations/${organizationId}/invitations/${invitationId}/resend`
    ),

  revokeInvitation: (organizationId: string, invitationId: string) =>
    apiClient.delete<never, ApiResponse<{ success: boolean; message: string }>>(
      `/organizations/${organizationId}/invitations/${invitationId}`
    ),

  getInvitationPreview: (token: string) =>
    apiClient.get<never, ApiResponse<InvitationPreviewData>>(
      '/organizations/invitations/preview',
      { params: { token } }
    ),

  updateMember: (
    organizationId: string,
    memberId: string,
    data: { departmentId?: string | null; role?: string; jobTitle?: string; employeeId?: string; status?: string; isExecutive?: boolean; executivePosition?: string | null; executiveOrder?: number } | Partial<OrganizationMember>
  ) =>
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

  acceptInvitationWithRegistration: (data: { token: string; displayName: string; username: string; password: string }) =>
    apiClient.post<never, ApiResponse<{ accessToken: string; refreshToken: string; user: any; member: OrganizationMember; organization: any }>>(
      '/organizations/invitations/accept-register',
      data
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

  // Profile Approvals & Moderation
  listApprovals: (organizationId: string, params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ approvals: ProfileApproval[]; pagination: any }>>(
      `/organizations/${organizationId}/approvals`,
      { params }
    ),

  submitProfileApproval: (organizationId: string, data: { memberId: string; draftProfile: any }) =>
    apiClient.post<never, ApiResponse<{ approval: ProfileApproval }>>(
      `/organizations/${organizationId}/approvals/submit`,
      data
    ),

  reviewProfileApproval: (organizationId: string, approvalId: string, data: { action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'; reviewNote?: string }) =>
    apiClient.post<never, ApiResponse<{ approval: ProfileApproval; member: OrganizationMember }>>(
      `/organizations/${organizationId}/approvals/${approvalId}/review`,
      data
    ),

  // Enterprise Events & Ticketing
  listEvents: (organizationId: string, params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ events: EnterpriseEvent[]; pagination: any }>>(
      `/organizations/${organizationId}/events`,
      { params }
    ),

  createEvent: (organizationId: string, data: Partial<EnterpriseEvent>) =>
    apiClient.post<never, ApiResponse<{ event: EnterpriseEvent }>>(
      `/organizations/${organizationId}/events`,
      data
    ),

  rsvpEvent: (organizationId: string, eventId: string) =>
    apiClient.post<never, ApiResponse<{ registration: EventTicketPass }>>(
      `/organizations/${organizationId}/events/${eventId}/rsvp`
    ),

  cancelEventRsvp: (organizationId: string, eventId: string) =>
    apiClient.post<never, ApiResponse<{ success: boolean }>>(
      `/organizations/${organizationId}/events/${eventId}/cancel`
    ),

  getMyEventTickets: (organizationId: string) =>
    apiClient.get<never, ApiResponse<{ tickets: EventTicketPass[] }>>(
      `/organizations/${organizationId}/events/my-tickets`
    ),

  // Custom Roles & Permissions
  listRoles: (organizationId: string) =>
    apiClient.get<never, ApiResponse<{ roles: OrganizationRoleItem[] }>>(
      `/organizations/${organizationId}/roles`
    ),

  createRole: (organizationId: string, data: Partial<OrganizationRoleItem>) =>
    apiClient.post<never, ApiResponse<{ role: OrganizationRoleItem }>>(
      `/organizations/${organizationId}/roles`,
      data
    ),

  updateRole: (organizationId: string, roleId: string, data: Partial<OrganizationRoleItem>) =>
    apiClient.put<never, ApiResponse<{ role: OrganizationRoleItem }>>(
      `/organizations/${organizationId}/roles/${roleId}`,
      data
    ),

  deleteRole: (organizationId: string, roleId: string) =>
    apiClient.delete<never, ApiResponse<{ deleted: boolean; roleId: string }>>(
      `/organizations/${organizationId}/roles/${roleId}`
    ),
};
