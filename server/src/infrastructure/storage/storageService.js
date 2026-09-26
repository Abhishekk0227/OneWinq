import { config } from '../../config/env.js';
import { LocalStorageAdapter } from './localStorageAdapter.js';
import { S3StorageAdapter } from './s3StorageAdapter.js';
import { CloudinaryAdapter } from '../cloudinary/cloudinaryAdapter.js';
import logger from '../../utils/logger.js';

class StorageService {
  constructor() {
    const provider = config.storage?.provider || 'local';

    if (provider === 'cloudinary') {
      logger.info('[StorageService] Initialized Cloudinary storage adapter', {
        cloudName: config.cloudinary?.cloudName,
      });
      this.adapter = new CloudinaryAdapter();
    } else if (provider === 's3') {
      logger.info('[StorageService] Initialized S3 storage adapter', {
        bucket: config.storage.s3?.bucket,
        region: config.storage.s3?.region,
      });
      this.adapter = new S3StorageAdapter(config.storage.s3 || {});
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
    if (this.adapter.saveObject) {
      return this.adapter.saveObject(key, buffer);
    }
    return false;
  }

  async deleteObject(key) {
    return this.adapter.deleteObject(key);
  }
}

export const storageService = new StorageService();
