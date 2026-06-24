/**
 * 검색어 하이라이트 — 인물 카드/리스트에서 이름·국가·소속·직책에 적용.
 */
import type React from 'react'
import styled from 'styled-components'

export function highlight(text: string, q: string): React.ReactNode {
  const trimmed = q.trim()
  if (!trimmed || !text) return text
  const idx = text.toLowerCase().indexOf(trimmed.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <HLMark>{text.slice(idx, idx + trimmed.length)}</HLMark>
      {text.slice(idx + trimmed.length)}
    </>
  )
}

export const HLMark = styled.mark`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.35)' : '#fef3c7'};
  color: inherit;
  padding: 0 1px;
  border-radius: 2px;
  /* 색상 외 단서 — 색맹·저대비 환경에서도 매칭 구간이 구분되도록 */
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
`
