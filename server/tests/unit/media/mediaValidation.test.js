import { describe, it, expect } from 'vitest';
import {
  requestUploadUrlSchema,
  confirmUploadSchema,
  validate,
} from '../../../src/modules/media/media.validation.js';

describe('Media Upload Validation & Purpose Rules', () => {
  it('accepts valid profile photo upload within 5MB limit', () => {
    const valid = validate(requestUploadUrlSchema, {
      purpose: 'PROFILE_PHOTO',
      filename: 'avatar.png',
      mimeType: 'image/png',
      sizeBytes: 2 * 1024 * 1024, // 2MB
    });

    expect(valid.purpose).toBe('PROFILE_PHOTO');
    expect(valid.filename).toBe('avatar.png');
    expect(valid.mimeType).toBe('image/png');
  });

  it('rejects profile photo upload exceeding 5MB limit', () => {
    try {
      validate(requestUploadUrlSchema, {
        purpose: 'PROFILE_PHOTO',
        filename: 'huge_avatar.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 6 * 1024 * 1024, // 6MB
      });
      expect.fail('Should have thrown ValidationError');
    } catch (err) {
      expect(err.message).toBe('Validation failed');
      expect(err.details[0].message).toMatch(/File size exceeds maximum/);
    }
  });

  it('rejects disallowed MIME type for profile photo (e.g. PDF)', () => {
    try {
      validate(requestUploadUrlSchema, {
        purpose: 'PROFILE_PHOTO',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 1024,
      });
      expect.fail('Should have thrown ValidationError');
    } catch (err) {
      expect(err.message).toBe('Validation failed');
      expect(err.details[0].message).toMatch(/MIME type 'application\/pdf' is not permitted/);
    }
  });

  it('allows PDF for PROFILE_SECTION up to 15MB', () => {
    const valid = validate(requestUploadUrlSchema, {
      purpose: 'PROFILE_SECTION',
      filename: 'portfolio.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12 * 1024 * 1024, // 12MB
    });

    expect(valid.purpose).toBe('PROFILE_SECTION');
    expect(valid.mimeType).toBe('application/pdf');
  });

  it('allows zip or audio for MESSAGE_ATTACHMENT up to 25MB', () => {
    const valid = validate(requestUploadUrlSchema, {
      purpose: 'MESSAGE_ATTACHMENT',
      filename: 'archive.zip',
      mimeType: 'application/zip',
      sizeBytes: 20 * 1024 * 1024, // 20MB
    });

    expect(valid.purpose).toBe('MESSAGE_ATTACHMENT');
  });

  it('validates confirmUploadSchema for valid and invalid mediaId formats', () => {
    const valid = validate(confirmUploadSchema, {
      mediaId: '60c72b2f9b1d8b2bad000001',
    });
    expect(valid.mediaId).toBe('60c72b2f9b1d8b2bad000001');

    try {
      validate(confirmUploadSchema, {
        mediaId: 'not-a-valid-hex-id',
      });
      expect.fail('Should have thrown ValidationError');
    } catch (err) {
      expect(err.message).toBe('Validation failed');
      expect(err.details[0].message).toMatch(/Invalid media ID format/);
    }
  });
});
