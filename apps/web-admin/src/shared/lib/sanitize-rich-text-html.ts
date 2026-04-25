import DOMPurify from 'dompurify'
import type { Config } from 'dompurify'

/**
 * RichTextEditor(contentEditable)에서 허용하는 마크업만 남깁니다.
 * 붙여넣기·외부에서 주입된 value 로드 시 XSS 완화용.
 */
const RICH_TEXT_PURIFY_CONFIG: Config = {
  /* blob: 붙여넣기 등이 잠깐 DOM에 남아도 제거되지 않게 (허용 태그만 쓰므로 script 등은 여전히 차단) */
  ALLOW_UNKNOWN_PROTOCOLS: true,
  ADD_TAGS: [
    'figure',
    'figcaption',
    'img',
    'hr',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    'colgroup',
    'col',
  ],
  ADD_ATTR: [
    'href',
    'target',
    'rel',
    'class',
    'style',
    'width',
    'height',
    'alt',
    'title',
    'src',
    'data-entity-type',
    'data-entity-id',
    'data-entity-name',
    'data-entity-country-id',
    'data-term-id',
    'data-term-name',
    'data-resizable',
    'data-align',
    'data-aspect-ratio',
    'contenteditable',
    'draggable',
    'data-type',
    'id',
    'role',
    'colspan',
    'rowspan',
    'scope',
    'abbr',
    'headers',
    'align',
    'valign',
    'border',
    'span',
  ],
  ALLOW_ARIA_ATTR: true,
}

/**
 * 저장·표시 단계에서 임시 표시용 마크업을 제거.
 *
 * - `.resize-handle` 자식 span: 이미지 리사이즈 시 동적으로 추가되는 핸들 4개.
 *   임시 DOM이라 저장에 들어가면 안 되는데, figure에 직접 append돼 `innerHTML`
 *   읽을 때 같이 들어갔던 회귀를 정리.
 * - `is-selected`, `resizing` 클래스: 선택/드래그 중에만 의미 있는 상태 클래스.
 */
function stripTransientMarkup(html: string): string {
  if (!html) return html
  return html
    // <span class="resize-handle ..."></span> 모두 제거 (자가폐쇄·내용 없음 가정)
    .replace(/<span\b[^>]*\bclass="[^"]*\bresize-handle\b[^"]*"[^>]*>\s*<\/span>/gi, '')
    // class 속성에 박힌 is-selected / resizing 토큰 제거 (다른 클래스는 유지)
    .replace(/\s*\bis-selected\b/g, '')
    .replace(/\s*\bresizing\b/g, '')
    // 위 제거로 class=""만 남으면 속성 자체 제거
    .replace(/\sclass="\s*"/g, '')
}

/**
 * 사용자가 figure 사이 등에 Enter를 여러 번 친 결과로 누적된 빈 단락 시퀀스를
 * 저장 시점에 압축. 단락 사이 1줄 공백(<p><br></p> 1개·<div><br></div> 1개)은
 * 의미 있을 수 있으니 보존하고, 3개 이상 연속만 압축.
 */
function collapseEmptyBlockRuns(html: string): string {
  if (!html) return html
  const emptyP = /(?:<p>\s*<br\s*\/?\s*>\s*<\/p>|<p>\s*<\/p>)/gi
  const emptyDiv = /(?:<div>\s*<br\s*\/?\s*>\s*<\/div>|<div>\s*<\/div>)/gi
  return html
    // 빈 <p> 3개+ → 1개로
    .replace(
      new RegExp(`(?:${emptyP.source}\\s*){3,}`, 'gi'),
      '<p><br></p>',
    )
    // 빈 <div> 3개+ → 1개로
    .replace(
      new RegExp(`(?:${emptyDiv.source}\\s*){3,}`, 'gi'),
      '<div><br></div>',
    )
    // <br> 4개 이상 연속 → 2개로 (1줄 공백)
    .replace(/(?:<br\s*\/?\s*>\s*){4,}/gi, '<br><br>')
}

/** 에디터·붙여넣기·읽기 전용 뷰 공통 — 뷰에서도 동일하게 호출해 마크업을 허용 목록으로 맞춤 */
export function sanitizeRichTextHtml(html: string): string {
  const trimmed = html?.trim() ?? ''
  if (trimmed === '') return ''
  const cleaned = collapseEmptyBlockRuns(stripTransientMarkup(html))
  return DOMPurify.sanitize(cleaned, RICH_TEXT_PURIFY_CONFIG)
}
