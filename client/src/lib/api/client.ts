import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/app/config/env'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import type { ApiResponse, ApiErrorResponse } from '@/types/api.types'

export class ApiError extends Error {
  code: string
  statusCode: number
  details?: unknown

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

import { disconnectSocket } from '@/lib/socket/socketClient'

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor: attach bearer token from authStore and active org header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const orgContext = useOrganizationContextStore.getState().activeContext
    if (orgContext?.type === 'ORGANIZATION' && orgContext.organizationId && config.headers) {
      config.headers['x-organization-id'] = orgContext.organizationId
    }

    return config
  },
  (error) => Promise.reject(error)
)


// Concurrency lock for refresh token rotation
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else if (token) {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor: handle 401 refresh rotation & errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If 401 and not already retried and not the auth login/refresh/register endpoint itself
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                           originalRequest?.url?.includes('/auth/register') ||
                           originalRequest?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Backend takes refresh token from HTTP-only cookie automatically
        const refreshResponse = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${env.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = refreshResponse.data.data.accessToken
        useAuthStore.getState().setAccessToken(newAccessToken)
        processQueue(null, newAccessToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        return apiClient(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        disconnectSocket()
        useAuthStore.getState().logout()
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    // Format normalized ApiError
    const errorData = error.response?.data?.error
    let message = errorData?.message || error.message || 'An unexpected error occurred'
    const code = errorData?.code || 'UNKNOWN_ERROR'
    const statusCode = error.response?.status || 500
    const details = errorData?.details

    if (details) {
      if (Array.isArray(details)) {
        const messages = details
          .map((d: any) =>
            typeof d === 'string'
              ? d
              : d?.message
              ? `${d.field ? `${d.field}: ` : ''}${d.message}`
              : d?.field
              ? `${d.field} is invalid`
              : ''
          )
          .filter(Boolean)
        if (messages.length > 0) {
          message = messages.join('. ')
        }
      } else if (typeof details === 'object') {
        const messages = Object.entries(details)
          .map(([key, val]: [string, any]) =>
            typeof val === 'string'
              ? val
              : val?.message
              ? `${key}: ${val.message}`
              : `${key} is invalid`
          )
          .filter(Boolean)
        if (messages.length > 0) {
          message = messages.join('. ')
        }
      }
    }

    return Promise.reject(new ApiError(message, code, statusCode, details))
  }
)
