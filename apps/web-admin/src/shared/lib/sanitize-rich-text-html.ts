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

/** 에디터·붙여넣기·읽기 전용 뷰 공통 — 뷰에서도 동일하게 호출해 마크업을 허용 목록으로 맞춤 */
export function sanitizeRichTextHtml(html: string): string {
  const trimmed = html?.trim() ?? ''
  if (trimmed === '') return ''
  return DOMPurify.sanitize(html, RICH_TEXT_PURIFY_CONFIG)
}
