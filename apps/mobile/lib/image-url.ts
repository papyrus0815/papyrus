import { getApiBaseURL } from './api'

/** profileImageUrl, thumbnailUrl 등 — 상대 경로면 API base 붙임 */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null
  const trimmed = path.trim()
  if (!trimmed) return null
  const base = (getApiBaseURL() ?? '').replace(/\/$/, '')
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed)
      // 절대 URL이라도 호스트가 dev 머신이 아닐 수 있음 — uploads 경로면 현재 baseURL로 다시 prefix
      if (u.pathname.startsWith('/uploads') && base) {
        return `${base}${u.pathname}${u.search}`
      }
    } catch {}
    return trimmed
  }
  if (!base) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`
}
