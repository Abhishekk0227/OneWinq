/**
 * Application environment configuration
 */

export const env = {
  apiUrl: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5000/api/v1'),
  socketUrl: import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000'),
  appName: import.meta.env.VITE_APP_NAME || 'OneWinq',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const
