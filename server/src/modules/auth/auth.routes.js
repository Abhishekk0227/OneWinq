import { Router } from 'express';
import {
  authRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
} from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  validate,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  revokeSessionSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
} from './auth.validation.js';
import {
  registerController,
  verifyEmailController,
  resendVerificationController,
  loginController,
  refreshController,
  logoutController,
  logoutAllController,
  getSessionsController,
  revokeSessionController,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
  requestEmailChangeController,
  verifyEmailChangeController,
  getMeController,
} from './auth.controller.js';

// ---------------------------------------------------------------------------
// Auth routes — all under /api/v1/auth
// ---------------------------------------------------------------------------

const router = Router();

// ---- Middleware to validate + attach parsed body ---------------------------
function withValidation(schema) {
  return (req, _res, next) => {
    try {
      req.body = validate(schema, req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

// POST /api/v1/auth/register
router.post(
  '/register',
  authRateLimiter,
  withValidation(registerSchema),
  registerController,
);

// POST /api/v1/auth/verify-email
router.post(
  '/verify-email',
  otpRateLimiter,
  withValidation(verifyEmailSchema),
  verifyEmailController,
);

// POST /api/v1/auth/resend-verification
router.post(
  '/resend-verification',
  otpRateLimiter,
  withValidation(resendVerificationSchema),
  resendVerificationController,
);

// POST /api/v1/auth/login
router.post(
  '/login',
  authRateLimiter,
  withValidation(loginSchema),
  loginController,
);

// POST /api/v1/auth/refresh  — refresh token is in the HTTP-only cookie
router.post(
  '/refresh',
  refreshController,
);

// POST /api/v1/auth/logout — works with or without valid token
router.post(
  '/logout',
  logoutController,
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  withValidation(forgotPasswordSchema),
  forgotPasswordController,
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  otpRateLimiter,
  withValidation(resetPasswordSchema),
  resetPasswordController,
);

// ---------------------------------------------------------------------------
// Authenticated routes
// ---------------------------------------------------------------------------

// GET /api/v1/auth/me
router.get('/me', authenticate, getMeController);

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authenticate,
  withValidation(changePasswordSchema),
  changePasswordController,
);

// GET /api/v1/auth/sessions
router.get('/sessions', authenticate, getSessionsController);

// DELETE /api/v1/auth/sessions/others — revoke all other sessions
router.delete('/sessions/others', authenticate, logoutAllController);

// DELETE /api/v1/auth/sessions/:sessionId — revoke a specific session
router.delete(
  '/sessions/:sessionId',
  authenticate,
  (req, _res, next) => {
    try {
      validate(revokeSessionSchema, { sessionId: req.params.sessionId });
      next();
    } catch (err) {
      next(err);
    }
  },
  revokeSessionController,
);

// POST /api/v1/auth/email/change-request
router.post(
  '/email/change-request',
  authenticate,
  otpRateLimiter,
  withValidation(requestEmailChangeSchema),
  requestEmailChangeController,
);

// POST /api/v1/auth/email/change-verify
router.post(
  '/email/change-verify',
  authenticate,
  otpRateLimiter,
  withValidation(verifyEmailChangeSchema),
  verifyEmailChangeController,
);

export default router;

