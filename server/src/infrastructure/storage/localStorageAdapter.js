import fs from 'fs';
import path from 'path';
import { StorageAdapter } from './storageAdapter.js';
import logger from '../../utils/logger.js';

export class LocalStorageAdapter extends StorageAdapter {
  constructor(options = {}) {
    super();
    this.uploadDir = options.uploadDir || path.resolve(process.cwd(), 'uploads');

    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (err) {
      logger.warn('[LocalStorageAdapter] Failed to ensure uploads directory', {
        dir: this.uploadDir,
        error: err.message,
      });
    }
  }

  getRelativeKey(key) {
    if (!key) return '';
    return key.replace(/^(\/)?uploads\//, '').replace(/^\//, '');
  }

  async generateUploadUrl({ key, mimeType }) {
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    const relKey = this.getRelativeKey(key);
    const publicUrl = `${baseUrl}/uploads/${relKey}`;
    const uploadUrl = `${baseUrl}/api/v1/media/upload-local?key=${encodeURIComponent(key)}`;

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
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    const relKey = this.getRelativeKey(key);
    return `${baseUrl}/uploads/${relKey}`;
  }

  async saveObject(key, buffer) {
    try {
      const relKey = this.getRelativeKey(key);
      const fullPath = path.resolve(this.uploadDir, relKey);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
      fs.writeFileSync(fullPath, data);
      return true;
    } catch (err) {
      logger.error('[LocalStorageAdapter] Failed to save file', { key, error: err.message });
      throw err;
    }
  }

  async deleteObject(key) {
    try {
      const relKey = this.getRelativeKey(key);
      const fullPath = path.resolve(this.uploadDir, relKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      // Fallback check in case key was saved with literal 'uploads/' prefix
      const literalPath = path.resolve(this.uploadDir, key);
      if (fs.existsSync(literalPath)) {
        fs.unlinkSync(literalPath);
        return true;
      }
    } catch (err) {
      logger.warn('[LocalStorageAdapter] Failed to delete file', { key, error: err.message });
    }
    return false;
  }
}
