const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? ''

/** profileImageUrl, thumbnailUrl 등 — 상대 경로면 API base 붙임 */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null
  const trimmed = path.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed)
      if (u.pathname.startsWith('/uploads') && API_BASE) {
        return `${API_BASE}${u.pathname}${u.search}`
      }
    } catch {}
    return trimmed
  }
  if (!API_BASE) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return trimmed.startsWith('/') ? `${API_BASE}${trimmed}` : `${API_BASE}/${trimmed}`
}
