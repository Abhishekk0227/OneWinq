import * as authService from './auth.service.js';
import {
  setRefreshCookie,
  clearRefreshCookie,
  parseRefreshCookieValue,
} from './tokenService.js';
import { sendSuccess } from '../../shared/response.js';
import { AuthenticationError } from '../../shared/errors.js';
import { ERROR_CODE } from '../../config/constants.js';

// ---------------------------------------------------------------------------
// Auth controllers — keep thin.
// All business logic lives in auth.service.js.
// Controllers only: parse request, call service, shape response.
// ---------------------------------------------------------------------------

export async function registerController(req, res, next) {
  try {
    const user = await authService.register(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Account created. Please check your email for a verification code.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

export async function verifyEmailController(req, res, next) {
  try {
    const user = await authService.verifyEmail(req.body);
    return sendSuccess(res, {
      message: 'Email verified successfully.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

export async function resendVerificationController(req, res, next) {
  try {
    const result = await authService.resendEmailVerification(req.body);
    return sendSuccess(res, { message: result.message, data: null });
  } catch (err) {
    return next(err);
  }
}

export async function loginController(req, res, next) {
  try {
    const { accessToken, tokenFamily, rawToken, expiresAt, user } =
      await authService.login(req.body, req);

    // Set refresh token as HTTP-only cookie
    setRefreshCookie(res, tokenFamily, rawToken, expiresAt);

    return sendSuccess(res, {
      message: 'Logged in successfully.',
      data: { accessToken, user },
    });
  } catch (err) {
    return next(err);
  }
}

export async function refreshController(req, res, next) {
  try {
    const cookieValue = req.cookies?.refreshToken;
    const parsed = parseRefreshCookieValue(cookieValue);

    if (!parsed) {
      clearRefreshCookie(res);
      throw new AuthenticationError('Refresh token is missing or malformed', ERROR_CODE.TOKEN_INVALID);
    }

    const { accessToken, tokenFamily, rawToken, expiresAt } =
      await authService.refreshTokens(parsed);

    // Rotate: set new cookie
    setRefreshCookie(res, tokenFamily, rawToken, expiresAt);

    return sendSuccess(res, {
      message: 'Token refreshed.',
      data: { accessToken },
    });
  } catch (err) {
    // On any refresh failure, clear the cookie
    clearRefreshCookie(res);
    return next(err);
  }
}

export async function logoutController(req, res, next) {
  try {
    const cookieValue = req.cookies?.refreshToken;
    const parsed = parseRefreshCookieValue(cookieValue);

    if (parsed) {
      await authService.logout({ tokenFamily: parsed.tokenFamily });
    }

    clearRefreshCookie(res);

    return sendSuccess(res, { message: 'Logged out successfully.', data: null });
  } catch (err) {
    return next(err);
  }
}

export async function logoutAllController(req, res, next) {
  try {
    const cookieValue = req.cookies?.refreshToken;
    const parsed = parseRefreshCookieValue(cookieValue);

    await authService.logoutOtherSessions({
      userId: req.user.id,
      exceptSessionId: req.user.sessionId,
    });

    // Log out current session too if requested via query
    if (req.query.includeCurrent === 'true') {
      if (parsed) {
        await authService.logout({ tokenFamily: parsed.tokenFamily });
      }
      clearRefreshCookie(res);
    }

    return sendSuccess(res, { message: 'Other sessions have been signed out.', data: null });
  } catch (err) {
    return next(err);
  }
}

export async function getSessionsController(req, res, next) {
  try {
    const sessions = await authService.getActiveSessions(req.user.id);
    return sendSuccess(res, {
      message: 'Active sessions retrieved.',
      data: { sessions },
    });
  } catch (err) {
    return next(err);
  }
}

export async function revokeSessionController(req, res, next) {
  try {
    await authService.revokeSession({
      userId: req.user.id,
      sessionId: req.params.sessionId,
    });
    return sendSuccess(res, { message: 'Session revoked.', data: null });
  } catch (err) {
    return next(err);
  }
}

export async function forgotPasswordController(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    return sendSuccess(res, { message: result.message, data: null });
  } catch (err) {
    return next(err);
  }
}

export async function resetPasswordController(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    return sendSuccess(res, { message: result.message, data: null });
  } catch (err) {
    return next(err);
  }
}

export async function changePasswordController(req, res, next) {
  try {
    const result = await authService.changePassword({
      userId: req.user.id,
      sessionId: req.user.sessionId,
      ...req.body,
      req,
    });
    return sendSuccess(res, { message: result.message, data: null });
  } catch (err) {
    return next(err);
  }
}

export async function getMeController(req, res, next) {
  try {
    const { User } = await import('../users/user.model.js');
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new Error('User not found'));
    }
    return sendSuccess(res, { message: 'Profile retrieved.', data: { user: user.toSafeObject() } });
  } catch (err) {
    return next(err);
  }
}

export async function requestEmailChangeController(req, res, next) {
  try {
    const result = await authService.requestEmailChange({
      userId: req.user.id,
      currentPassword: req.body.password,
      newEmail: req.body.newEmail,
    });
    return sendSuccess(res, { message: result.message, data: null });
  } catch (err) {
    return next(err);
  }
}

export async function verifyEmailChangeController(req, res, next) {
  try {
    const result = await authService.verifyEmailChange({
      userId: req.user.id,
      newEmail: req.body.newEmail,
      otp: req.body.otp,
    });
    return sendSuccess(res, { message: result.message, data: { email: result.email } });
  } catch (err) {
    return next(err);
  }
}

