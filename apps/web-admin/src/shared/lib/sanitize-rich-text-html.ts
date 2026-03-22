import DOMPurify from 'dompurify'
import type { Config } from 'dompurify'

/**
 * RichTextEditor(contentEditable)에서 허용하는 마크업만 남깁니다.
 * 붙여넣기·외부에서 주입된 value 로드 시 XSS 완화용.
 */
const RICH_TEXT_PURIFY_CONFIG: Config = {
  ADD_TAGS: ['figure', 'figcaption', 'img', 'hr'],
  ADD_ATTR: [
    'href',
    'target',
    'rel',
    'class',
    'style',
    'width',
    'height',
    'alt',
    'src',
    'data-entity-type',
    'data-entity-id',
    'data-entity-name',
    'data-term-id',
    'data-term-name',
    'data-resizable',
    'contenteditable',
    'draggable',
    'data-type',
    'id',
    'role',
  ],
  ALLOW_ARIA_ATTR: true,
}

export function sanitizeRichTextHtml(html: string): string {
  const trimmed = html?.trim() ?? ''
  if (trimmed === '') return ''
  return DOMPurify.sanitize(html, RICH_TEXT_PURIFY_CONFIG)
}
