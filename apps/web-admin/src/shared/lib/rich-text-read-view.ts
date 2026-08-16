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
 * 순수 텍스트 본문을 RichTextEditor가 다룰 수 있는 HTML로 변환한다
 * (`isLikelyRichTextHtml`의 짝 — 둘이 함께 «본문 필드 이중 형식» 계약을 이룬다).
 *
 * 왜 필요한가: 전기·설명 같은 본문 필드에는 두 형식이 공존한다 — 시드가 넣은 순수
 * 텍스트(문단 구분이 `\n\n`)와 에디터가 만든 HTML. 읽기 뷰는 `isLikelyRichTextHtml`로
 * 분기해 순수 텍스트를 `white-space: pre-wrap`으로 그리지만, 에디터는 값을 그대로
 * `innerHTML`에 넣으므로 변환 없이는 개행이 전부 공백으로 접힌다 — 그 상태로 저장하면
 * 접힌 DOM에서 HTML이 만들어져 문단 구분이 **영구 소실**된다.
 *
 * 규칙: 빈 줄(개행 2개 이상)을 문단 경계로 삼아 `<p>`로 감싸고, 문단 안의 단일 개행은
 * `<br>`로 옮긴다. 태그 문자는 이스케이프해 평문의 `<`가 마크업으로 해석되지 않게 한다.
 */
export function plainTextToRichTextHtml(text: string | null | undefined): string {
  const normalized = (text ?? '').replace(/\r\n?/g, '\n')
  if (normalized.trim() === '') return ''
  const escaped = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .split(/\n[ \t]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
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
 * ⚠ 인라인 경계 보존: 예전엔 `/>\s+</g` 로 `>`와 `<` 사이 공백을 무차별 제거했는데,
 * `<strong>가</strong> <em>나</em>` 처럼 **인라인 요소 사이의 의미 있는 공백**까지
 * 지워 단어가 붙어 렌더됐다(RD1). 원래 목적은 소스 포맷용 *개행* 정리이므로,
 * 닫는 태그가 **블록 태그**일 때에 한해, 그 뒤 공백에 개행(\n·\r)이 포함된 경우만
 * 제거한다. 인라인 경계의 순수 스페이스(개행 없음)는 항상 보존된다.
 */
const BLOCK_TAG_BOUNDARY =
  /(<\/(?:p|div|ul|ol|li|table|thead|tbody|tr|td|th|figure|figcaption|blockquote|h[1-6]|section|article)>)[ \t]*[\r\n]\s*</gi

function collapseInterBlockWhitespace(html: string): string {
  if (!html) return html
  return html.replace(BLOCK_TAG_BOUNDARY, '$1<')
}

/**
 * 저장/표시 직전 img의 편집 전용 title(예: '클릭하여 크기 조절')을 제거하고,
 * alt가 없으면 figcaption에서 파생하거나 빈 문자열(장식 처리)로 채운다.
 *
 * 배경(AY2): 에디터가 이미지 삽입 시 리사이즈 힌트를 `img.title`로 남기는데, 이 title이
 * 저장 HTML에 그대로 실려 스크린리더가 '클릭하여 크기 조절'을 이미지 이름으로 낭독한다.
 * title은 편집 DOM에서만 쓰고 읽기 표시 단계에서 벗겨낸다. alt 없는 이미지도 SR이
 * 파일명·URL을 읽지 않도록 여기서 보정한다.
 */
function normalizeImageA11y(html: string): string {
  const raw = html?.trim() ?? ''
  if (raw === '' || !/<img\b/i.test(raw)) return html ?? ''
  if (typeof document === 'undefined') return html ?? ''
  try {
    const tpl = document.createElement('template')
    tpl.innerHTML = raw
    tpl.content.querySelectorAll('img').forEach((node) => {
      const img = node as HTMLImageElement
      img.removeAttribute('title')
      if (!img.hasAttribute('alt')) {
        const figure = img.closest('figure')
        const caption =
          figure?.querySelector('figcaption')?.textContent?.trim() ?? ''
        img.setAttribute('alt', caption)
      }
    })
    return tpl.innerHTML
  } catch {
    return html ?? ''
  }
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
 * 5. `normalizeImageA11y` — img 편집용 title 제거 + alt 보정(SR 오낭독 방지)
 * 6. `resolveRichTextImageSrcsForDisplay` — 업로드 이미지 상대 경로 → 절대 URL
 */
export function formatRichTextForReadView(html: string): string {
  const safe = stripMentionLeadingAt(sanitizeRichTextHtml(html ?? ''))
  const compact = collapseExcessiveBreaks(collapseInterBlockWhitespace(safe))
  return resolveRichTextImageSrcsForDisplay(normalizeImageA11y(compact))
}
