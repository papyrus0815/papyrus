import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'

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
 * RichTextEditor로 저장한 HTML을 읽기 전용으로 표시하기 전 처리:
 * 1. `sanitizeRichTextHtml` — 허용 마크업만 유지(XSS 완화)
 * 2. `stripMentionLeadingAt` — 멘션 @ 표시 제거
 */
export function formatRichTextForReadView(html: string): string {
  return stripMentionLeadingAt(sanitizeRichTextHtml(html ?? ''))
}
