import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique request ID to every request.
 *
 * Priority order (honours upstream proxies/load balancers):
 *   1. X-Request-ID header from client
 *   2. Generated UUID v4
 *
 * The ID is:
 *   - Available as req.id throughout the request lifecycle
 *   - Echoed back in the X-Request-ID response header
 */
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
}
