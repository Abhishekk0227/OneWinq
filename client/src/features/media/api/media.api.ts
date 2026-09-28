import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'

export interface UploadPresignedResponse {
  mediaId: string
  uploadUrl: string
  method: string
  headers?: Record<string, string>
  fields?: Record<string, string | number>
  publicUrl: string
  storageKey: string
}

export type MediaPurpose =
  | 'PROFILE_PHOTO'
  | 'PROFILE_COVER'
  | 'PROFILE_SECTION'
  | 'MESSAGE_ATTACHMENT'
  | 'POST_MEDIA'
  | 'CARD_MEDIA'
  | 'SUPPORT_EVIDENCE'
  | 'REPORT_EVIDENCE'

function resolveMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type.toLowerCase()
  }
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'pdf':
      return 'application/pdf'
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    default:
      return file.type || 'application/octet-stream'
  }
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
  async uploadFile(file: File, purpose: MediaPurpose) {
    const mimeType = resolveMimeType(file)
    const initRes = await this.initiateUpload({
      purpose,
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
    })

    const payload = (initRes as any)?.data || initRes
    const { mediaId, uploadUrl, method, headers, fields, publicUrl } = payload as UploadPresignedResponse

    if (!uploadUrl) {
      throw new Error('Upload initialization did not return a valid upload URL.')
    }

    if (fields && Object.keys(fields).length > 0) {
      // Multipart form upload (e.g. Cloudinary, S3 presigned POST)
      const formData = new FormData()
      Object.entries(fields).forEach(([k, v]) => {
        formData.append(k, String(v))
      })
      formData.append('file', file)

      const uploadRes = await fetch(uploadUrl, {
        method: method || 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        let errMessage = `Upload failed with status ${uploadRes.status}`
        try {
          const errBody = await uploadRes.json()
          if (errBody?.error?.message) errMessage = errBody.error.message
        } catch {
          // ignore parsing error
        }
        throw new Error(errMessage)
      }
    } else {
      // Direct raw upload (e.g. LocalStorageAdapter or S3 presigned PUT)
      const uploadRes = await fetch(uploadUrl, {
        method: method || 'PUT',
        headers: {
          'Content-Type': mimeType,
          ...(headers || {}),
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`)
      }
    }

    // Confirm with backend
    await this.confirmUpload(mediaId)

    return { mediaId, publicUrl }
  },
}
