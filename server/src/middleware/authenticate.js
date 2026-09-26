import { verifyAccessToken } from '../modules/auth/tokenService.js';
import { AuthenticationError } from '../shared/errors.js';
import { ERROR_CODE } from '../config/constants.js';

// ---------------------------------------------------------------------------
// authenticate middleware — verifies the JWT access token.
//
// On success: attaches req.user = { id, sessionId } and calls next().
// On failure: calls next(AuthenticationError).
//
// The access token is expected in the Authorization header:
//   Authorization: Bearer <token>
// ---------------------------------------------------------------------------

export function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError(
        'Access token is required',
        ERROR_CODE.AUTHENTICATION_REQUIRED,
      );
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new AuthenticationError(
        'Access token is required',
        ERROR_CODE.AUTHENTICATION_REQUIRED,
      );
    }

    // verifyAccessToken throws AuthenticationError on failure
    const payload = verifyAccessToken(token);

    // Attach minimal user info — services must query DB for anything else
    req.user = {
      id: payload.userId,
      sessionId: payload.sessionId,
    };

    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// optionalAuthenticate — same as authenticate but does not fail if no token.
// Useful for public endpoints that behave differently for logged-in users.
// ---------------------------------------------------------------------------

export function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, sessionId: payload.sessionId };
  } catch {
    req.user = null;
  }

  return next();
}
