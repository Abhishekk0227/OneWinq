import { verifyAccessToken } from '../../modules/auth/tokenService.js';
import { AuthenticationError } from '../../shared/errors.js';
import { ERROR_CODE } from '../../config/constants.js';

/**
 * Socket.IO authentication middleware.
 * Verifies JWT access token passed in handshake auth or headers.
 */
export function socketAuth(socket, next) {
  try {
    let token = socket.handshake.auth?.token;

    if (!token) {
      const authHeader = socket.handshake.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      return next(
        new AuthenticationError(
          'Authentication token is required for socket connection',
          ERROR_CODE.AUTHENTICATION_REQUIRED,
        ),
      );
    }

    const payload = verifyAccessToken(token);

    socket.user = {
      id: payload.userId,
      sessionId: payload.sessionId,
    };

    return next();
  } catch {
    return next(
      new AuthenticationError(
        'Invalid or expired socket authentication token',
        ERROR_CODE.TOKEN_INVALID,
      ),
    );
  }
}
