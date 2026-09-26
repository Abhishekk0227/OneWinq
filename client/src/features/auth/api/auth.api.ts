import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'
import type { User, AuthSession, AuthResponseData, RefreshResponseData } from '@/types/auth.types'

export interface RegisterPayload {
  email: string
  password: string
  displayName: string
  username: string
}

export interface VerifyEmailPayload {
  email: string
  otp?: string
  code?: string
}

export interface LoginPayload {
  email?: string
  login?: string
  password?: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  otp?: string
  code?: string
  newPassword?: string
}

export interface ChangePasswordPayload {
  currentPassword?: string
  newPassword?: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<never, ApiResponse<{ user: User }>>('/auth/register', payload),

  verifyEmail: (payload: VerifyEmailPayload) =>
    apiClient.post<never, ApiResponse<{ user: User }>>('/auth/verify-email', {
      email: payload.email,
      otp: payload.otp || payload.code,
    }),

  resendVerification: (email: string) =>
    apiClient.post<never, ApiResponse<null>>('/auth/resend-verification', { email }),

  login: (payload: LoginPayload) =>
    apiClient.post<never, ApiResponse<AuthResponseData>>('/auth/login', {
      email: payload.email || payload.login,
      password: payload.password,
    }),

  refresh: () =>
    apiClient.post<never, ApiResponse<RefreshResponseData>>('/auth/refresh', {}),

  logout: () =>
    apiClient.post<never, ApiResponse<null>>('/auth/logout', {}),

  getMe: () =>
    apiClient.get<never, ApiResponse<{ user: User }>>('/auth/me'),

  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.post<never, ApiResponse<null>>('/auth/change-password', payload),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiClient.post<never, ApiResponse<null>>('/auth/forgot-password', payload),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiClient.post<never, ApiResponse<null>>('/auth/reset-password', {
      email: payload.email,
      otp: payload.otp || payload.code,
      newPassword: payload.newPassword,
    }),

  getSessions: () =>
    apiClient.get<never, ApiResponse<{ sessions: AuthSession[] }>>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    apiClient.delete<never, ApiResponse<null>>(`/auth/sessions/${sessionId}`),

  revokeOtherSessions: () =>
    apiClient.delete<never, ApiResponse<null>>('/auth/sessions/others'),
}
