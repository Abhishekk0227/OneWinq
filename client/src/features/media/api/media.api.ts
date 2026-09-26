import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'

export interface UploadPresignedResponse {
  mediaId: string
  uploadUrl: string
  method: string
  headers: Record<string, string>
  publicUrl: string
  storageKey: string
}

export const mediaApi = {
  /**
   * Request presigned direct upload URL.
   */
  initiateUpload: (payload: {
    purpose: string
    filename: string
    mimeType: string
    sizeBytes: number
  }) =>
    apiClient.post<never, ApiResponse<UploadPresignedResponse>>('/media/upload-url', payload),

  /**
   * Confirm direct upload after file sent to storage.
   */
  confirmUpload: (mediaId: string) =>
    apiClient.post<never, ApiResponse<{ id: string; publicUrl: string; state: string }>>(`/media/${mediaId}/confirm`, {
      mediaId,
    }),

  /**
   * Helper function to execute full upload cycle for a browser File object.
   */
  async uploadFile(file: File, purpose: 'PROFILE_PHOTO' | 'PROFILE_COVER' | 'PROFILE_SECTION' | 'MESSAGE_ATTACHMENT') {
    const initRes = await this.initiateUpload({
      purpose,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    })

    const { mediaId, uploadUrl, method, headers, publicUrl } = initRes.data

    // Upload directly using fetch
    const uploadRes = await fetch(uploadUrl, {
      method: method || 'PUT',
      headers: {
        'Content-Type': file.type,
        ...(headers || {}),
      },
      body: file,
    })

    if (!uploadRes.ok) {
      throw new Error(`Upload failed with status ${uploadRes.status}`)
    }

    // Confirm with backend
    await this.confirmUpload(mediaId)

    return { mediaId, publicUrl }
  },
}
