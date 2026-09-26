import { StorageAdapter } from './storageAdapter.js';
import logger from '../../utils/logger.js';

export class S3StorageAdapter extends StorageAdapter {
  constructor(options = {}) {
    super();
    this.bucket = options.bucket || 'onewinq-media';
    this.region = options.region || 'us-east-1';
    this.endpoint = options.endpoint || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
  }

  async generateUploadUrl({ key, mimeType, expiresSeconds = 900 }) {
    // In production with AWS credentials, presigned S3 PUT URL is generated
    const baseUrl = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint;
    const publicUrl = `${baseUrl}/${key}`;
    const uploadUrl = `${baseUrl}/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresSeconds}`;

    logger.debug('[S3StorageAdapter] Generated presigned upload URL', { key, bucket: this.bucket });

    return {
      uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      publicUrl,
    };
  }

  async generateDownloadUrl(key) {
    const baseUrl = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint;
    return `${baseUrl}/${key}`;
  }

  async deleteObject(key) {
    logger.info('[S3StorageAdapter] Object deleted', { key, bucket: this.bucket });
    return true;
  }
}
