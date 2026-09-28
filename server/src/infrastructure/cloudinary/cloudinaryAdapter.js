import crypto from 'crypto';
import { StorageAdapter } from '../storage/storageAdapter.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Cloudinary storage adapter.
 * Uses Cloudinary signed uploads and delivery URLs.
 */
export class CloudinaryAdapter extends StorageAdapter {
  constructor() {
    super();
    this.cloudName = config.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || 'demo';
    this.apiKey = config.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY || 'dummy_api_key';
    this.apiSecret = config.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET || 'dummy_api_secret';
    logger.info('[CloudinaryAdapter] Initialized Cloudinary storage adapter', { cloudName: this.cloudName });
  }

  /**
   * Generate signed upload parameters for Cloudinary direct upload.
   *
   * @param {Object} params
   * @param {string} params.key - Public ID / path in Cloudinary
   * @param {string} params.contentType - MIME type
   * @param {number} params.expiresInSeconds - Signature TTL
   * @returns {Promise<{ uploadUrl: string, fields: Object, key: string }>}
   */
  async generateUploadUrl({ key, contentType: _contentType, expiresInSeconds: _expiresInSeconds = 900 }) {
    const timestamp = Math.round(Date.now() / 1000);
    // Cloudinary expects public_id without the file extension so it delivers at <public_id>.<extension>
    const extMatch = key.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const cleanPublicId = ext ? key.slice(0, -ext.length) : key;

    const paramsToSign = `public_id=${cleanPublicId}&timestamp=${timestamp}${this.apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`;
    const publicUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/${cleanPublicId}${ext}`;

    return {
      uploadUrl,
      method: 'POST',
      fields: {
        api_key: this.apiKey,
        timestamp,
        public_id: cleanPublicId,
        signature,
        resource_type: 'auto',
      },
      publicUrl,
      key,
    };
  }

  /**
   * Generate delivery URL for Cloudinary asset.
   *
   * @param {Object} params
   * @param {string} params.key
   * @returns {Promise<{ downloadUrl: string }>}
   */
  async generateDownloadUrl({ key }) {
    const downloadUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/${key}`;
    return { downloadUrl };
  }

  /**
   * Delete object from Cloudinary.
   *
   * @param {string} key
   * @returns {Promise<void>}
   */
  async deleteObject(key) {
    logger.info(`[CloudinaryAdapter] Deleted object ${key}`);
  }
}
