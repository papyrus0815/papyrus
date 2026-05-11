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
 * RichTextEditor가 만든 HTML이 *시각적으로* 비어 있는지 판정.
 *
 * 사용 시점:
 *  - 저장 시 빈 본문을 `null`로 정규화할 때
 *  - 읽기 모드에서 placeholder 노출 분기
 *
 * 규칙:
 *  - sanitize 후 텍스트가 비어 있고
 *  - figure/img/hr/table/iframe 등 *시각 콘텐츠 태그*도 없으면 비어 있음으로 본다.
 *
 * 이전엔 사용처마다(`!html.replace(/<[^>]*>/g,'')` 등) 다른 규칙으로 판정해
 * "어떤 화면에선 비었음, 다른 화면에선 내용 있음"이라는 round-trip 불일치가 났음.
 * 한 곳에 집중해 그 위험을 줄인다.
 */
export function isVisuallyEmptyRichText(
  html: string | null | undefined,
): boolean {
  const raw = html?.trim() ?? ''
  if (raw === '') return true
  const safe = sanitizeRichTextHtml(raw)
  if (!safe.trim()) return true
  // 시각 콘텐츠 태그 — 이게 있으면 텍스트가 비어도 "내용 있음"
  if (/<(?:img|figure|hr|table|iframe|video|audio|svg)\b/i.test(safe)) {
    return false
  }
  // 텍스트만 따로 보고 — 태그·NBSP·zero-width 모두 제거
  const text = safe
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;| /g, ' ')
    .replace(/[​‌‍﻿]/g, '')
    .trim()
  return text.length === 0
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
 * 블록 태그 사이의 소스 포맷용 화이트스페이스(개행 포함)를 제거.
 *
 * 배경: 에디터가 저장한 HTML에 `</p>\n<p>` 같은 인덴트 개행이 들어가면
 * 일부 컨테이너의 `white-space: pre-wrap`이나 본문 가까이 placed된 인라인
 * 텍스트와 만나 빈 줄이 추가로 보이는 현상이 생김. 표시 직전에 한 번 정리.
 *
 * 콘텐츠 안의 텍스트(예: `<p>a   b</p>`)는 건드리지 않고, **닫는 태그와
 * 다음 여는 태그 사이**의 공백만 제거함.
 */
function collapseInterBlockWhitespace(html: string): string {
  if (!html) return html
  return html.replace(/>\s+</g, '><')
}

/**
 * 같은 위치의 `<br>`이 3개 이상 연속이면 2개로 축소 (단락 사이 1줄 공백 유지).
 * 과거 plain-text → `<br>` 변환이 누적되어 빈 줄이 무한히 쌓이는 데이터 보정.
 */
function collapseExcessiveBreaks(html: string): string {
  if (!html) return html
  return html.replace(/(?:<br\s*\/?\s*>\s*){3,}/gi, '<br><br>')
}

/**
 * RichTextEditor로 저장한 HTML을 읽기 전용으로 표시하기 전 처리:
 * 1. `sanitizeRichTextHtml` — 허용 마크업만 유지(XSS 완화)
 * 2. `stripMentionLeadingAt` — 멘션 @ 표시 제거
 * 3. `collapseInterBlockWhitespace` — 블록 태그 사이 소스 개행 제거
 * 4. `collapseExcessiveBreaks` — `<br>` 3개 이상 연속 → 2개로 축소
 * 5. `resolveRichTextImageSrcsForDisplay` — 업로드 이미지 상대 경로 → 절대 URL
 */
export function formatRichTextForReadView(html: string): string {
  const safe = stripMentionLeadingAt(sanitizeRichTextHtml(html ?? ''))
  const compact = collapseExcessiveBreaks(collapseInterBlockWhitespace(safe))
  return resolveRichTextImageSrcsForDisplay(compact)
}
