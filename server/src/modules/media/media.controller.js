import { mediaService } from './media.service.js';
import { storageService } from '../../infrastructure/storage/storageService.js';
import {
  requestUploadUrlSchema,
  confirmUploadSchema,
  validate,
} from './media.validation.js';
import { successResponse } from '../../shared/response.js';

export const mediaController = {
  /**
   * PUT /api/v1/media/upload-local
   * Direct upload receiver for local storage adapter (mimics direct presigned upload).
   */
  async uploadLocal(req, res, next) {
    try {
      const rawKey = req.query.key || req.params[0] || req.params.key;
      if (!rawKey) {
        return res.status(400).json({ error: 'Storage key is required for upload' });
      }
      const key = decodeURIComponent(rawKey);
      if (key.includes('..') || !key.startsWith('uploads/')) {
        return res.status(400).json({ error: 'Invalid or unauthorized storage key format' });
      }

      await storageService.saveObject(key, req.body);
      return res.status(200).json({ success: true, message: 'File uploaded successfully' });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/media/upload-url
   */
  async initiateUpload(req, res, next) {
    try {
      const validated = validate(requestUploadUrlSchema, req.body);
      const result = await mediaService.initiateUpload({
        userId: req.user.id,
        ...validated,
      });
      return res.status(200).json(
        successResponse(result, 'Upload URL generated successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/media/:id/confirm or POST /api/v1/media/confirm
   */
  async confirmUpload(req, res, next) {
    try {
      const mediaId = req.params.id && req.params.id !== 'confirm' ? req.params.id : req.body?.mediaId;
      validate(confirmUploadSchema, { mediaId });
      const result = await mediaService.confirmUpload({
        userId: req.user.id,
        mediaId,
      });
      return res.status(200).json(
        successResponse(result, 'Media upload confirmed successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/media/:id
   */
  async getMedia(req, res, next) {
    try {
      const media = await mediaService.getMedia(req.params.id);
      return res.status(200).json(
        successResponse({ media }, 'Media details retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * DELETE /api/v1/media/:id
   */
  async deleteMedia(req, res, next) {
    try {
      const result = await mediaService.deleteMedia(req.user.id, req.params.id);
      return res.status(200).json(
        successResponse(result, 'Media deleted successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },
};
