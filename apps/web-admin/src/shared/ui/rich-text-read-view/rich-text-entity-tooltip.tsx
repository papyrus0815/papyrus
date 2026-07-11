import { useLayoutEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

/**
 * 리치텍스트 본문의 용어(.term)·가문(.mention/.entity-link) 클릭 시 뜨는 설명 팝오버.
 *
 * 기존에 person-detail·국가·인라인 등 사용처마다 제각각 인라인으로 렌더하던 것을
 * 한 컴포넌트로 모아 다음을 보장한다:
 *  - **body 포털**(C3): framer-motion 등 `transform`이 걸린 조상 안에서 렌더돼도
 *    `position:fixed` 기준이 뷰포트로 유지되도록 document.body로 포털.
 *  - **뷰포트 클램프/flip**(C2): 렌더 후 실제 크기를 재 우/하단 경계를 넘으면 안쪽으로
 *    당기거나 위로 뒤집어, 화면 밖으로 잘려 못 읽는 문제를 없앤다.
 *  - **a11y**(C1): 팝오버에 `role="tooltip"` + `aria-live="polite"`로 설명 로드 시 SR 안내.
 *  - **더 보기 액션**(C5): 출처 국가/가문 상세 등으로 이어갈 선택적 버튼.
 */
export type RichTextEntityTooltipAction = {
  label: string
  onClick: () => void
}

export type RichTextEntityTooltipProps = {
  /** 트리거 클릭 지점(뷰포트 좌표). 여기서 +12,+12 오프셋 후 경계 클램프. */
  x: number
  y: number
  /** 상단 eyebrow(용어명 또는 "가문 · 이름"). */
  eyebrow: string
  /** eyebrow 강조색(용어=teal, 가문=indigo 등). */
  eyebrowColor?: string
  /** null이면 로딩, ''이면 "(설명 없음)". */
  description: string | null
  onClose: () => void
  action?: RichTextEntityTooltipAction | null
}

const OFFSET = 12
const MARGIN = 8

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: transparent;
`

const Popover = styled.div<{ $left: number; $top: number }>`
  position: fixed;
  left: ${({ $left }) => $left}px;
  top: ${({ $top }) => $top}px;
  max-width: min(360px, calc(100vw - 16px));
  padding: 14px 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.96)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(12px)' : 'none'};
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};

  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Body = styled.span`
  white-space: pre-wrap;
  word-break: break-word;
`

const MoreButton = styled.button`
  display: inline-flex;
  align-items: center;
  margin-top: 10px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : '#e5e7eb')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#eef2ff'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 1px;
  }
`

export function RichTextEntityTooltip({
  x,
  y,
  eyebrow,
  eyebrowColor,
  description,
  onClose,
  action,
}: RichTextEntityTooltipProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: x + OFFSET,
    top: y + OFFSET,
  })

  // 렌더 후 실제 크기로 뷰포트 안에 들어오도록 보정. useLayoutEffect라 paint 전에 반영돼
  // 잘린 위치가 화면에 보이지 않는다. 설명 로드로 크기가 바뀌면 다시 클램프.
  useLayoutEffect(() => {
    const node = popoverRef.current
    if (typeof window === 'undefined' || !node) return
    const rect = node.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = x + OFFSET
    let top = y + OFFSET
    if (left + rect.width + MARGIN > vw) left = vw - rect.width - MARGIN
    if (left < MARGIN) left = MARGIN
    if (top + rect.height + MARGIN > vh) {
      // 아래로 넘치면 클릭 지점 위로 뒤집기(그래도 넘치면 상단 여백에 고정).
      top = Math.max(MARGIN, y - rect.height - OFFSET)
    }
    if (top < MARGIN) top = MARGIN
    setPos((prev) =>
      prev.left === left && prev.top === top ? prev : { left, top },
    )
  }, [x, y, description, eyebrow])

  if (typeof document === 'undefined') return null

  return createPortal(
    <Overlay role="presentation" onClick={onClose}>
      <Popover
        ref={popoverRef}
        role="tooltip"
        aria-live="polite"
        $left={pos.left}
        $top={pos.top}
        onClick={(event) => event.stopPropagation()}
      >
        <strong style={eyebrowColor ? { color: eyebrowColor } : undefined}>
          {eyebrow}
        </strong>
        <Body>
          {description === null
            ? ' 로딩…'
            : description || '(설명 없음)'}
        </Body>
        {action ? (
          <div>
            <MoreButton type="button" onClick={action.onClick}>
              {action.label}
            </MoreButton>
          </div>
        ) : null}
      </Popover>
    </Overlay>,
    document.body,
  )
}
