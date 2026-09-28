import { config } from '../../config/env.js';
import { LocalStorageAdapter } from './localStorageAdapter.js';
import { S3StorageAdapter } from './s3StorageAdapter.js';
import { CloudinaryAdapter } from '../cloudinary/cloudinaryAdapter.js';
import logger from '../../utils/logger.js';

class StorageService {
  constructor() {
    const provider = config.storage?.provider || 'local';

    const isCloudinaryConfigured =
      Boolean(config.cloudinary?.cloudName) &&
      config.cloudinary.cloudName !== 'your_cloud_name' &&
      config.cloudinary.cloudName !== 'demo' &&
      Boolean(config.cloudinary?.apiKey) &&
      config.cloudinary.apiKey !== 'your_api_key' &&
      config.cloudinary.apiKey !== 'dummy_api_key' &&
      Boolean(config.cloudinary?.apiSecret) &&
      config.cloudinary.apiSecret !== 'your_api_secret' &&
      config.cloudinary.apiSecret !== 'dummy_api_secret';

    const isS3Configured =
      Boolean(config.storage.s3?.bucket) &&
      config.storage.s3.bucket !== 'your_bucket_name' &&
      Boolean(config.storage.s3?.accessKeyId);

    if (provider === 'cloudinary') {
      if (isCloudinaryConfigured) {
        logger.info('[StorageService] Initialized Cloudinary storage adapter', {
          cloudName: config.cloudinary?.cloudName,
        });
        this.adapter = new CloudinaryAdapter();
      } else {
        logger.warn(
          '[StorageService] STORAGE_PROVIDER is set to "cloudinary", but valid credentials were not found (using dummy or empty values). Falling back to LocalStorageAdapter.',
        );
        this.adapter = new LocalStorageAdapter({ uploadDir: config.storage?.localDir });
      }
    } else if (provider === 's3') {
      if (isS3Configured) {
        logger.info('[StorageService] Initialized S3 storage adapter', {
          bucket: config.storage.s3?.bucket,
          region: config.storage.s3?.region,
        });
        this.adapter = new S3StorageAdapter(config.storage.s3 || {});
      } else {
        logger.warn(
          '[StorageService] STORAGE_PROVIDER is set to "s3", but valid bucket/keys were not found. Falling back to LocalStorageAdapter.',
        );
        this.adapter = new LocalStorageAdapter({ uploadDir: config.storage?.localDir });
      }
    } else {
      logger.info('[StorageService] Initialized local storage adapter', {
        dir: config.storage?.localDir,
      });
      this.adapter = new LocalStorageAdapter({ uploadDir: config.storage?.localDir });
    }
  }

  async generateUploadUrl(params) {
    return this.adapter.generateUploadUrl(params);
  }

  async generateDownloadUrl(key, expiresSeconds) {
    return this.adapter.generateDownloadUrl(key, expiresSeconds);
  }

  async saveObject(key, buffer) {
    if (this.adapter && typeof this.adapter.saveObject === 'function') {
      return this.adapter.saveObject(key, buffer);
    }
    // Fallback: save to local disk
    if (!this.fallbackLocalAdapter) {
      this.fallbackLocalAdapter = new LocalStorageAdapter({ uploadDir: config.storage?.localDir });
    }
    return this.fallbackLocalAdapter.saveObject(key, buffer);
  }

  async deleteObject(key) {
    return this.adapter.deleteObject(key);
  }
}

export const storageService = new StorageService();
