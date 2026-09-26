export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{ field?: string; message: string }> | unknown
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

export interface PaginatedResult<T> {
  items: T[]
  total?: number
  page?: number
  limit?: number
  nextCursor?: string | null
  hasMore?: boolean
}
