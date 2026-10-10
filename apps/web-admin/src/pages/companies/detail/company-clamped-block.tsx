/**
 * 긴 서술 접기 — 연혁 본문·제품 설명·리포트 요약·건설 배경처럼 리치텍스트가 화면 여러 장을
 * 차지하던 칸을 일정 높이에서 접고 '더 보기'로 편다.
 *
 * 연혁 3건이 화면 6장, 제품 2건이 좁은 2열에서 4장을 넘겼다. 목록을 훑는 단계에서는
 * 첫 몇 줄이면 충분하고, 끝까지 읽을 행만 펼치면 된다.
 *
 * - 넘칠 때만 접는다(짧은 글엔 버튼이 생기지 않는다). 높이는 ResizeObserver로 다시 잰다.
 * - 안을 눌러 편집을 시작하면(포커스 진입) 저절로 펼친다 — 잘린 채 편집하면 커서가 안 보인다.
 * - 페이드는 mask-image라 카드·지면 색과 무관하다(그라데이션 덮개는 배경색을 알아야 했다).
 */
import React, { useEffect, useId, useRef, useState } from 'react'

import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import styled, { css } from 'styled-components'

interface Props {
  children: React.ReactNode
  /** 접힌 높이(px) — 본문 15px·행간 1.78 기준 약 9줄 */
  collapsedHeight?: number
  /** 버튼 라벨에 붙일 대상 이름(보조기기용) */
  label?: string
}

/** 이만큼은 넘쳐야 접는다 — 한두 줄 남기고 '더 보기'를 다는 건 손해 */
const SLACK = 72

export function ClampedBlock({ children, collapsedHeight = 260, label }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const regionId = useId()

  useEffect(() => {
    const node = contentRef.current
    if (!node) return
    const measure = () =>
      setOverflowing(node.scrollHeight > collapsedHeight + SLACK)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [collapsedHeight])

  const clamped = overflowing && !expanded

  return (
    <Wrap>
      <Content
        id={regionId}
        ref={contentRef}
        $clamped={clamped}
        $height={collapsedHeight}
        onFocusCapture={() => setExpanded(true)}
      >
        {children}
      </Content>
      {overflowing && (
        <Toggle
          type="button"
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? (
            <>
              <FiChevronUp aria-hidden /> 접기
            </>
          ) : (
            <>
              <FiChevronDown aria-hidden /> 더 보기
            </>
          )}
          {label && <HiddenLabel> — {label}</HiddenLabel>}
        </Toggle>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  width: 100%;
`

const Content = styled.div<{ $clamped: boolean; $height: number }>`
  width: 100%;
  min-width: 0;
  ${({ $clamped, $height }) =>
    $clamped &&
    css`
      max-height: ${$height}px;
      overflow: hidden;
      mask-image: linear-gradient(to bottom, #000 calc(100% - 72px), transparent);
    `}
`

const Toggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 4px;
  margin-left: -4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const HiddenLabel = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`
