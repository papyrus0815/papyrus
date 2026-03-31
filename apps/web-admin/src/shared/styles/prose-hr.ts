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

/** 짧고 얇은 구분선 — 본문 폭 대비 중앙 정렬, 위·아래 여백 축소 */
export const proseHrSmallStyles = css`
  border: none !important;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(148, 163, 184, 0.55)'} !important;
  margin: 10px auto !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  background: none !important;
  display: block !important;
  max-width: 10rem;
`

/** 수평선 삽입 시 사용할 HTML (에디터 insertHTML용). 상세 페이지에서도 동일 스타일 적용. */
export const PROSE_HR_HTML = '<div class="prose-hr" role="separator"></div>'

/** 작은 수평선 — `prose-hr` 베이스와 함께 `prose-hr--small`로 덮어씀 */
export const PROSE_HR_SMALL_HTML =
  '<div class="prose-hr prose-hr--small" role="separator"></div>'
