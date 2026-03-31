import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { getUploadImageUrl } from '@/shared/api/upload'

/**
 * 전기·본문이 RichTextEditor HTML인지 판별 (평문으로 두면 태그가 이스케이프되어 엔티티가 안 보임)
 * - `<`로 시작하지 않아도 본문 중간에만 `<span class="entity-link">` 등이 있으면 HTML로 렌더링해야 함
 */
export function isLikelyRichTextHtml(html: string | null | undefined): boolean {
  const raw = html?.trim() ?? ''
  if (raw === '') return false
  if (raw.startsWith('<')) return true
  if (/<br\s*\/?>/i.test(html ?? '')) return true
  return /<\/?(?:p|div|span|ul|ol|li|strong|em|b|i|u|h[1-6]|figure|table|img|hr|blockquote|a)\b/i.test(
    html ?? '',
  )
}

/**
 * 본문 HTML에서 멘션 스팬의 선두 @ 제거 (상세 뷰에서는 이름만 표시)
 */
export function stripMentionLeadingAt(html: string): string {
  return html.replace(/(<span[^>]*class="[^"]*mention[^"]*"[^>]*>)@/g, '$1')
}

/**
 * 본문 HTML의 `img[src]` — `/uploads/...` 등 상대 경로를 API 호스트 기준 절대 URL로 바꿈.
 * (관리 SPA와 API 도메인이 다를 때 삽입 직후·저장 본문 로드 시 깨짐 방지)
 */
export function resolveRichTextImageSrcsForDisplay(html: string): string {
  const raw = html?.trim() ?? ''
  if (raw === '' || !/<img\b/i.test(raw)) return html ?? ''
  if (typeof document === 'undefined') return html ?? ''
  try {
    const tpl = document.createElement('template')
    tpl.innerHTML = raw
    tpl.content.querySelectorAll('img[src]').forEach((node) => {
      const img = node as HTMLImageElement
      const src = img.getAttribute('src')
      if (!src) return
      if (src.startsWith('data:') || src.startsWith('blob:')) return
      // 상대·절대 모두 getUploadImageUrl — DB에 이전 호스트의 절대 URL이 남아 있어도 /uploads/면 현재 API로 재작성
      const resolved = getUploadImageUrl(src)
      if (resolved) img.setAttribute('src', resolved)
    })
    return tpl.innerHTML
  } catch {
    return html ?? ''
  }
}

/**
 * RichTextEditor로 저장한 HTML을 읽기 전용으로 표시하기 전 처리:
 * 1. `sanitizeRichTextHtml` — 허용 마크업만 유지(XSS 완화)
 * 2. `stripMentionLeadingAt` — 멘션 @ 표시 제거
 * 3. `resolveRichTextImageSrcsForDisplay` — 업로드 이미지 상대 경로 → 절대 URL
 */
export function formatRichTextForReadView(html: string): string {
  const safe = stripMentionLeadingAt(sanitizeRichTextHtml(html ?? ''))
  return resolveRichTextImageSrcsForDisplay(safe)
}
