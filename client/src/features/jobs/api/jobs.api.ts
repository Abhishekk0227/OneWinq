import { apiClient } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api.types';
import type { Job, JobApplication } from '@/types/organization.types';

export const jobsApi = {
  listPublicJobs: (params?: { page?: number; limit?: number; q?: string; employmentType?: string; workplaceType?: string }) =>
    apiClient.get<never, ApiResponse<{ jobs: Job[]; pagination: any }>>('/jobs', { params }),

  getPublicJob: (jobId: string) =>
    apiClient.get<never, ApiResponse<{ job: Job }>>(`/jobs/${jobId}`),

  apply: (jobId: string, data: { resumeUrl?: string | null; coverLetter?: string }) =>
    apiClient.post<never, ApiResponse<{ application: JobApplication }>>(
      `/jobs/${jobId}/apply`,
      data
    ),

  getMyApplications: (params?: { page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ applications: JobApplication[]; pagination: any }>>(
      '/me/applications',
      { params }
    ),

  listOrgJobs: (organizationId: string, params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<never, ApiResponse<{ jobs: Job[]; pagination: any }>>(
      `/organizations/${organizationId}/jobs`,
      { params }
    ),

  createOrgJob: (organizationId: string, data: Partial<Job>) =>
    apiClient.post<never, ApiResponse<{ job: Job }>>(
      `/organizations/${organizationId}/jobs`,
      data
    ),

  updateOrgJob: (organizationId: string, jobId: string, data: Partial<Job>) =>
    apiClient.patch<never, ApiResponse<{ job: Job }>>(
      `/organizations/${organizationId}/jobs/${jobId}`,
      data
    ),

  deleteOrgJob: (organizationId: string, jobId: string) =>
    apiClient.delete<never, ApiResponse<{ success: boolean }>>(
      `/organizations/${organizationId}/jobs/${jobId}`
    ),

  listApplications: (organizationId: string, params?: { jobId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<never, ApiResponse<{ applications: JobApplication[]; pagination: any }>>(
      `/organizations/${organizationId}/applications`,
      { params }
    ),

  updateAppStatus: (organizationId: string, applicationId: string, data: { status: string; comment?: string }) =>
    apiClient.patch<never, ApiResponse<{ application: JobApplication }>>(
      `/organizations/${organizationId}/applications/${applicationId}/status`,
      data
    ),

  addAppNote: (organizationId: string, applicationId: string, data: { note: string }) =>
    apiClient.post<never, ApiResponse<{ application: JobApplication }>>(
      `/organizations/${organizationId}/applications/${applicationId}/notes`,
      data
    ),
};
