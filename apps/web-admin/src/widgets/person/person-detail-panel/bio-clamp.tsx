/**
 * 긴 전기 접기 — 처음 몇 단락만 보이고 '전기 전체 읽기'로 펼친다.
 *
 * 왜. 개요의 첫 묶음이 전기 전문이라, 조프르처럼 전기가 긴 인물은 약 1,500px를 지나야
 * 출생·사망·재임 같은 기본 사실에 닿았다. 요약을 먼저 보이고 나머지는 원하는 사람만 펼친다.
 *
 * - 내용이 COLLAPSE_AFTER보다 짧으면 아무것도 하지 않는다(버튼도 없음).
 * - 안에서 편집을 시작하면(포커스가 들어오면) 자동으로 펼친다 — 접힌 채 편집기가 잘리지 않게.
 * - 높이는 ResizeObserver로 잰다 — 전기 편집·섹션 추가로 길이가 바뀌어도 판정이 따라간다.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { FiChevronDown } from 'react-icons/fi'
import styled, { css } from 'styled-components'

/** 접힌 높이 — 본문 약 10줄. 이보다 COLLAPSE_SLACK 이상 길 때만 접는다(조금 넘는 글을 굳이 접지 않게) */
const COLLAPSED_HEIGHT = 420
const COLLAPSE_SLACK = 160

export function BioClamp({ children }: { children: ReactNode }) {
  /* 잴 대상은 접히는 상자(Inner)가 아니라 그 안의 내용 — 접힌 상자는 크기가 고정이라
     안에서 글이 늘어도 ResizeObserver가 울리지 않는다 */
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const content = contentRef.current
    if (!content) return undefined
    const observer = new ResizeObserver(() => setContentHeight(content.offsetHeight))
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  const clampable = contentHeight > COLLAPSED_HEIGHT + COLLAPSE_SLACK
  const clamped = clampable && !expanded

  return (
    <Wrap>
      <Inner
        $clamped={clamped}
        // 접힌 부분 안으로 키보드·편집 포커스가 들어오면 펼친다
        onFocusCapture={() => {
          if (clamped) setExpanded(true)
        }}
      >
        <div ref={contentRef}>{children}</div>
      </Inner>
      {clampable && (
        <Toggle
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          <FiChevronDown
            size={14}
            aria-hidden
            style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
          {expanded ? '전기 접기' : '전기 전체 읽기'}
        </Toggle>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
`

const Inner = styled.div<{ $clamped: boolean }>`
  ${({ $clamped }) =>
    $clamped &&
    css`
      max-height: ${COLLAPSED_HEIGHT}px;
      overflow: hidden;
      /* 끝을 칼로 자르지 않고 흐리게 — '이어지는 글'임을 말한다 */
      mask-image: linear-gradient(180deg, #000 70%, transparent 100%);
      -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent 100%);
    `}
`

const Toggle = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  > svg {
    transition: transform 0.15s ease;
  }

  &:hover,
  &:focus-visible {
    border-color: #6366f1;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
    outline: none;
  }
`
