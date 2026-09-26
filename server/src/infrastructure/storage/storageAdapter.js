/**
 * StorageAdapter — Abstract base class for storage providers.
 * Follows the adapter pattern (same as emailProviderAdapter.js).
 */
export class StorageAdapter {
  /**
   * Generate a presigned upload URL or local upload target.
   * @param {object} params
   * @param {string} params.key - Storage key (e.g. uploads/profile_photo/123/avatar.jpg)
   * @param {string} params.mimeType - Content-Type of the file
   * @param {number} params.sizeBytes - File size in bytes
   * @param {number} [params.expiresSeconds=900] - Presigned URL validity
   * @returns {Promise<{ uploadUrl: string, method: string, headers: object, publicUrl: string }>}
   */
  async generateUploadUrl(_params) {
    throw new Error('generateUploadUrl() must be implemented by storage adapter');
  }

  /**
   * Generate a public or presigned download URL for an object.
   * @param {string} _key
   * @param {number} [_expiresSeconds=3600]
   * @returns {Promise<string>}
   */
  async generateDownloadUrl(_key, _expiresSeconds = 3600) {
    throw new Error('generateDownloadUrl() must be implemented by storage adapter');
  }

  /**
   * Delete an object from storage.
   * @param {string} _key
   * @returns {Promise<boolean>}
   */
  async deleteObject(_key) {
    throw new Error('deleteObject() must be implemented by storage adapter');
  }
}
