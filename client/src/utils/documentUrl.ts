/**
 * Resolves document / media URLs to ensure they open seamlessly across mobile and web.
 * - Resolves legacy or dev `localhost:5000/uploads/...` links into valid relative or origin-based URLs.
 * - Keeps valid Cloudinary, AWS S3, or external URLs intact.
 */
export function resolveDocumentUrl(url?: string): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // If URL references localhost or 127.0.0.1 on any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(trimmed)) {
    const relativePath = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?/, '')
    return `/${relativePath}`
  }

  return trimmed
}
