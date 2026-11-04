import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import styled from 'styled-components'

import { ledgerAccent } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { EVENT_RELATION_LABELS, type EventRelationType } from '@/shared/api/event-relations'

/**
 * 관련 사건 도움말 — 블록 이름 옆 '?'. 무엇을 잇는 곳인지(상위·하위와의 차이), 다섯 유형, 화살표의 뜻을
 * 한곳에 모은다. 예전엔 정의·유형 뜻풀이가 블록 곳곳에 늘 서 있어 목록이 어수선했다.
 * 모양은 국가 대시보드 섹션 도움말(SectionHelpPopover)의 '?' 원형과 같다.
 */

const TYPE_ROWS: Array<{ type: EventRelationType; glyph: string }> = [
  { type: 'LED_TO', glyph: '→' },
  { type: 'INFLUENCED', glyph: '→' },
  { type: 'RESPONSE_TO', glyph: '→' },
  { type: 'CONCURRENT', glyph: '↔' },
  { type: 'RELATED', glyph: '↔' },
]

export function RelatedHelp() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const popoverRef = useRef<HTMLDivElement>(null)
  /** 화면 안에 들이기 — 가로로 넘치면 왼쪽으로 밀고, 아래 자리가 모자라면 위로 연다 */
  const [placement, setPlacement] = useState<{ shiftX: number; above: boolean }>({ shiftX: 0, above: false })

  useLayoutEffect(() => {
    if (!open) {
      setPlacement({ shiftX: 0, above: false })
      return
    }
    const popover = popoverRef.current
    const trigger = triggerRef.current
    if (!popover || !trigger) return
    const margin = 16
    const rect = popover.getBoundingClientRect()
    const triggerRect = trigger.getBoundingClientRect()
    const overflowRight = rect.right - (window.innerWidth - margin)
    const shiftX = overflowRight > 0 ? -Math.min(overflowRight, rect.left - margin) : 0
    const roomBelow = window.innerHeight - triggerRect.bottom - margin
    const above = rect.height > roomBelow && triggerRect.top - margin > roomBelow
    setPlacement({ shiftX, above })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (pointerEvent: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(pointerEvent.target as Node)) setOpen(false)
    }
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return
      keyEvent.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        aria-label="관련 사건이란? 도움말"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        $open={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        ?
      </Trigger>
      {open && (
        <Popover
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="관련 사건 도움말"
          $above={placement.above}
          style={{ transform: placement.shiftX ? `translateX(${placement.shiftX}px)` : undefined }}
        >
          <Head>
            <Title>관련 사건이란?</Title>
            <Close type="button" aria-label="도움말 닫기" onClick={() => setOpen(false)}>
              ×
            </Close>
          </Head>

          <Lead>
            서로 <strong>다른 사건</strong>이 원인·결과로 어떻게 이어지는지 적는 곳입니다.
          </Lead>

          <Compare>
            <CompareRow>
              <CompareName>상위·하위</CompareName>
              <span>
                큰 사건과 그 <em>안의 일부</em>
                <Example>1차세계대전 ⊃ 사라예보 암살</Example>
              </span>
            </CompareRow>
            <CompareRow>
              <CompareName>관련 사건</CompareName>
              <span>
                따로 일어난 두 사건의 <em>인과·영향</em>
                <Example>바스티유 습격 → 연맹제 개최</Example>
              </span>
            </CompareRow>
          </Compare>

          <Section>
            <SectionLabel>관계 다섯 가지</SectionLabel>
            <TypeList>
              {TYPE_ROWS.map(({ type, glyph }) => (
                <li key={type}>
                  <TypeName>
                    <Glyph aria-hidden>{glyph}</Glyph>
                    {EVENT_RELATION_LABELS[type].name}
                  </TypeName>
                  <TypeHint>{EVENT_RELATION_LABELS[type].hint}</TypeHint>
                </li>
              ))}
            </TypeList>
          </Section>

          <Footnote>
            목록의 <Glyph>←</Glyph>은 이 사건보다 앞선 원인, <Glyph>→</Glyph>은 이 사건이 낳은 결과,{' '}
            <Glyph>↔</Glyph>은 같은 때 얽힌 사건입니다. 한 번 이으면 상대 사건에도 반대 방향으로 보입니다.
          </Footnote>
        </Popover>
      )}
    </Wrap>
  )
}

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const Trigger = styled.button<{ $open: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $open }) =>
      $open ? ledgerAccent(theme.mode) : theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)'};
  background: transparent;
  color: ${({ theme, $open }) => ($open ? ledgerAccent(theme.mode) : theme.colors.text.tertiary)};
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;

  /* 24px 터치 타깃 — 원은 18px 그대로 */
  &::after {
    content: '';
    position: absolute;
    inset: -3px;
  }

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const Popover = styled.div<{ $above: boolean }>`
  position: absolute;
  ${({ $above }) => ($above ? 'bottom: calc(100% + 8px);' : 'top: calc(100% + 8px);')}
  left: -8px;
  z-index: 40;
  width: 400px;
  max-width: calc(100vw - 32px);
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1e2028' : '#ffffff')};
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  font-weight: 400;
  letter-spacing: normal;
  white-space: normal;
  word-break: keep-all;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.strong`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Close = styled.button`
  min-width: 24px;
  min-height: 24px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 18px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Lead = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Compare = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)')};
`

const CompareRow = styled.div`
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};

  em {
    font-style: normal;
    font-weight: 600;
  }
`

const CompareName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Example = styled.span`
  display: block;
  font-size: 12px;
  color: ${metaText};
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SectionLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${metaText};
`

const TypeList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 8px;
    font-size: 12.5px;
    line-height: 1.45;
  }
`

const TypeName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TypeHint = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Glyph = styled.span`
  margin-right: 4px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const Footnote = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${metaText};

  ${Glyph} {
    margin: 0 1px;
  }
`
