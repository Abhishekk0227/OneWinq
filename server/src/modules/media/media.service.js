import path from 'path';
import { Media } from './media.model.js';
import { storageService } from '../../infrastructure/storage/storageService.js';
import { NotFoundError, AppError } from '../../shared/errors.js';
import { ERROR_CODE } from '../../config/constants.js';

function sanitizeFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base || 'file'}${ext.toLowerCase()}`;
}

export const mediaService = {
  /**
   * Request a presigned direct upload URL.
   */
  async initiateUpload({ userId, purpose, filename, mimeType, sizeBytes }) {
    const cleanFilename = sanitizeFilename(filename);
    const timestamp = Date.now();
    const storageKey = `uploads/${purpose.toLowerCase()}/${userId}/${timestamp}-${cleanFilename}`;

    const { uploadUrl, method, headers, fields, publicUrl } =
      await storageService.generateUploadUrl({
        key: storageKey,
        mimeType,
        sizeBytes,
      });

    const media = await Media.create({
      uploader: userId,
      purpose,
      mimeType,
      sizeBytes,
      storageKey,
      publicUrl,
      state: 'PENDING_UPLOAD',
      metadata: {
        originalFilename: filename,
      },
    });

    return {
      mediaId: media._id.toString(),
      uploadUrl,
      method,
      headers,
      fields,
      publicUrl,
      storageKey,
    };
  },

  /**
   * Confirm successful direct upload.
   */
  async confirmUpload({ userId, mediaId }) {
    const media = await Media.findOne({
      _id: mediaId,
      uploader: userId,
    });

    if (!media) {
      throw new NotFoundError('Media record not found or unauthorized');
    }

    if (media.state === 'DELETED') {
      throw new AppError('Media has already been deleted', ERROR_CODE.VALIDATION_ERROR, 400);
    }

    media.state = 'UPLOADED';
    await media.save();

    return {
      id: media._id.toString(),
      purpose: media.purpose,
      state: media.state,
      publicUrl: media.publicUrl,
      sizeBytes: media.sizeBytes,
      mimeType: media.mimeType,
    };
  },

  /**
   * Get media metadata.
   */
  async getMedia(mediaId) {
    const media = await Media.findById(mediaId).lean();

    if (!media || media.state === 'DELETED') {
      throw new NotFoundError('Media not found');
    }

    return {
      id: media._id.toString(),
      uploaderId: media.uploader.toString(),
      purpose: media.purpose,
      state: media.state,
      publicUrl: media.publicUrl,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      createdAt: media.createdAt,
    };
  },

  /**
   * Delete uploaded media.
   */
  async deleteMedia(userId, mediaId) {
    const media = await Media.findOne({
      _id: mediaId,
      uploader: userId,
    });

    if (!media) {
      throw new NotFoundError('Media record not found or unauthorized');
    }

    await storageService.deleteObject(media.storageKey);

    media.state = 'DELETED';
    await media.save();

    return {
      id: media._id.toString(),
      state: 'DELETED',
    };
  },
};
