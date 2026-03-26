import { type HTMLAttributes, forwardRef, useMemo } from 'react'

import styled from 'styled-components'

import { formatRichTextForReadView } from '@/shared/lib/rich-text-read-view'
import {
  richTextReadonlyEntityLinksCss,
  richTextReadonlyHorizontalRuleCss,
  richTextReadonlyMediaAndTablesCss,
} from '@/shared/styles/rich-text-readonly-content'

/**
 * RichTextEditor 저장 HTML 읽기 전용 표시 — sanitize + 멘션 @ 제거 + 공통 타이포/표·이미지·엔티티 스타일.
 * 편집 화면과 동일한 본문 처리 경로(`formatRichTextForReadView`)를 한곳에서 사용합니다.
 */
const Root = styled.div`
  font-family: inherit;
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
  word-break: break-word;

  p {
    margin: 0 0 1em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  strong {
    font-weight: 700;
  }

  ul,
  ol {
    margin: 12px 0;
    padding-left: 28px;
    list-style-position: outside;
  }
  ul {
    list-style-type: disc;
  }
  ol {
    list-style-type: decimal;
  }
  li {
    margin: 4px 0;
    line-height: 1.55;
  }

  blockquote {
    border-left: 4px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.55)' : '#6366f1'};
    padding-left: 16px;
    margin: 12px 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-style: italic;
  }

  a[href] {
    color: #6366f1;
    text-decoration: underline;
  }

  ${richTextReadonlyHorizontalRuleCss}
  ${richTextReadonlyMediaAndTablesCss}
  ${richTextReadonlyEntityLinksCss}
`

export type RichTextReadViewProps = {
  html: string
  /** true(기본)이면 공백만 있으면 null 반환 */
  hideWhenEmpty?: boolean
} & Omit<HTMLAttributes<HTMLDivElement>, 'dangerouslySetInnerHTML' | 'children'>

export const RichTextReadView = forwardRef<
  HTMLDivElement,
  RichTextReadViewProps
>(function RichTextReadView(
  {
    html,
    hideWhenEmpty = true,
    className,
    role = 'region',
    'aria-label': ariaLabel = '본문',
    ...rest
  },
  ref,
) {
  const safe = useMemo(() => formatRichTextForReadView(html ?? ''), [html])
  if (hideWhenEmpty && !safe.trim()) return null
  return (
    <Root
      ref={ref}
      className={className}
      role={role}
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: safe }}
      {...rest}
    />
  )
})
