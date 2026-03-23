/**
 * 포스트/에디터 공통 수평선 스타일.
 * RichTextEditor, DetailProse, 사건 상세 등에서 동일한 hr/.prose-hr 사용.
 */
import { css } from 'styled-components'

export const proseHrStyles = css`
  border: none !important;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : '#e5e7eb'} !important;
  margin: 24px 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  background: none !important;
  display: block !important;
`

/** 수평선 삽입 시 사용할 HTML (에디터 insertHTML용). 상세 페이지에서도 동일 스타일 적용. */
export const PROSE_HR_HTML = '<div class="prose-hr" role="separator"></div>'
