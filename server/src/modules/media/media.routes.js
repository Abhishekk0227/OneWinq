import express, { Router } from 'express';
import { mediaController } from './media.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const mediaRoutes = Router();

// Local direct upload receiver (simulates direct S3 presigned PUT).
// Must NOT require authentication header since presigned direct uploads do not send Bearer tokens.
mediaRoutes.put(
  '/upload-local',
  express.raw({ type: '*/*', limit: '25mb' }),
  mediaController.uploadLocal,
);
mediaRoutes.put(
  /\/upload-local\/(.+)/,
  express.raw({ type: '*/*', limit: '25mb' }),
  mediaController.uploadLocal,
);

mediaRoutes.use(authenticate);

mediaRoutes.post('/upload-url', mediaController.initiateUpload);
mediaRoutes.post('/confirm', mediaController.confirmUpload);
mediaRoutes.post('/:id/confirm', mediaController.confirmUpload);
mediaRoutes.get('/:id', mediaController.getMedia);
mediaRoutes.delete('/:id', mediaController.deleteMedia);
