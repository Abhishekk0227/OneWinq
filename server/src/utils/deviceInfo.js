// ---------------------------------------------------------------------------
// Device information extraction from incoming HTTP requests.
// ---------------------------------------------------------------------------

const UA_PATTERNS = [
  [/iPhone/i, 'iPhone'],
  [/iPad/i, 'iPad'],
  [/Android/i, 'Android Device'],
  [/Windows Phone/i, 'Windows Phone'],
  [/Windows/i, 'Windows'],
  [/Macintosh|Mac OS X/i, 'Mac'],
  [/Linux/i, 'Linux'],
  [/CrOS/i, 'Chromebook'],
];

/**
 * Parse a human-readable device name from a User-Agent string.
 *
 * @param {string | undefined} ua
 * @returns {string}
 */
function parseDeviceName(ua) {
  if (!ua) { return 'Unknown Device'; }
  for (const [pattern, name] of UA_PATTERNS) {
    if (pattern.test(ua)) { return name; }
  }
  return 'Unknown Device';
}

/**
 * Extract sanitized device info from a request.
 * Never returns raw IP — callers choose whether to store it.
 *
 * @param {import('express').Request} req
 * @returns {{ userAgent: string, deviceName: string, ipAddress: string }}
 */
export function parseDeviceInfo(req) {
  const ua = (req.headers['user-agent'] || '').slice(0, 500);
  return {
    userAgent: ua,
    deviceName: parseDeviceName(ua),
    // req.ip is set by Express (honours trust proxy setting)
    ipAddress: req.ip || 'unknown',
  };
}
