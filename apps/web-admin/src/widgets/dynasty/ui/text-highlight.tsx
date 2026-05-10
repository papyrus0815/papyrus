/**
 * 검색어 매치 부분에 mark 강조. 정규식 메타 문자는 escape 해서 안전.
 */
import { Fragment, type ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  text: string
  query: string
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function HighlightedText({ text, query }: Props): ReactNode {
  const q = query.trim()
  if (!q) return text
  const re = new RegExp(`(${escapeRegExp(q)})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        // re에 capturing group을 두면 split 결과의 홀수 인덱스가 매치된 토큰
        i % 2 === 1 ? (
          <Mark key={i}>{part}</Mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

const Mark = styled.mark`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,213,0,0.32)'
      : 'rgba(255,235,59,0.55)'};
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
`
