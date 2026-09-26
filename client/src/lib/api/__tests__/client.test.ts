import { describe, it, expect } from 'vitest'
import { ApiError } from '../client'

describe('API Client Error Handling', () => {
  it('instantiates ApiError with proper status codes and details', () => {
    const error = new ApiError('Forbidden operation', 'FORBIDDEN', 403, { reason: 'insufficient_role' })
    expect(error.message).toBe('Forbidden operation')
    expect(error.code).toBe('FORBIDDEN')
    expect(error.statusCode).toBe(403)
    expect(error.details).toEqual({ reason: 'insufficient_role' })
  })

  it('defaults to 500 when status code is omitted', () => {
    const error = new ApiError('Internal crash')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_ERROR')
  })
})
