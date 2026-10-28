/**
 * 긴 본문 섹션(배경·전개·여파)의 '줄여 보기' — 상태 훅과 머리·끝 버튼.
 *
 * 처음엔 배경에만 있었다. 전개 5,000자 초과 29건·여파 5,000자 초과 20건이라 같은 장치를 세 섹션이 함께 쓴다.
 * 줄인 섹션은 요약 몇 줄 + 단락 제목(목차처럼)만 보이고, 단락은 하나씩 열 수 있다(NarrativeSectionList).
 */
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent } from '@/entities/event/ui/ledger-tokens'

import { LONG_BACKGROUND_CHARS } from './narrative-sections.lib'
import { REVEAL_ANCHOR_EVENT, scrollToAnchor } from './scroll-to-anchor'

/**
 * @param anchorId 섹션 앵커(#background 등) — 끝에서 줄이면 이 머리로 데려간다
 * @param initiallyCollapsed 처음 상태 — **연 순간 한 번** 정한다(편집으로 길이가 바뀌어도 다시 접지 않는다)
 * @param chars 지금 글자수 — 1,200자 이하로 줄면 줄여 보기 자체를 거둔다
 */
export function useSectionCollapse(anchorId: string, initiallyCollapsed: boolean, chars: number) {
  const [collapsedState, setCollapsed] = useState(initiallyCollapsed)
  const canCollapse = chars > LONG_BACKGROUND_CHARS
  const collapsed = collapsedState && canCollapse

  /*
   * 목차·장부·해시가 줄여 둔 섹션 안의 단락(#narrative-3)으로 가려 하면 — 그 단락만 여는 건 목록이 맡고
   * (stopPropagation), 거기까지 못 간 경우(요약 등)만 여기서 섹션째 편다. 섹션 머리 자체로 가는 건 펴지 않는다.
   * flushSync — 부른 쪽이 바로 이어서 scrollIntoView로 좌표를 잰다.
   */
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const onReveal = (revealEvent: Event) => {
      if (revealEvent.target === node) return
      flushSync(() => setCollapsed(false))
    }
    node.addEventListener(REVEAL_ANCHOR_EVENT, onReveal)
    return () => node.removeEventListener(REVEAL_ANCHOR_EVENT, onReveal)
  })

  /** 끝 줄에서 줄이기 — 줄어든 만큼 화면이 엉뚱한 데로 밀리지 않게 섹션 머리로 데려간다 */
  const collapseFromEnd = () => {
    flushSync(() => setCollapsed(true))
    scrollToAnchor(anchorId, { updateHash: false })
  }

  return { ref, collapsed, canCollapse, setCollapsed, collapseFromEnd }
}

/** 섹션 머리 오른쪽 '줄여 보기 / 전체 보기' */
export function CollapseHeaderToggle({
  collapsed,
  bodyId,
  onToggle,
}: {
  collapsed: boolean
  bodyId: string
  onToggle: () => void
}) {
  return (
    <HeaderTextAction type="button" aria-expanded={!collapsed} aria-controls={bodyId} onClick={onToggle}>
      {collapsed ? '전체 보기' : '줄여 보기'}
    </HeaderTextAction>
  )
}

/**
 * 섹션 끝 줄 — 줄였으면 '배경 전체 읽기 · 6단락 · 약 15,121자'(얼마나 남았는지), 펼쳤으면 다 읽고 내려온 자리에서
 * 머리까지 올라가지 않고 줄이기(단락이 둘 이상일 때만).
 */
export function CollapseEndBar({
  label,
  collapsed,
  canCollapse,
  bodyId,
  rowCount,
  chars,
  onExpand,
  onCollapseFromEnd,
}: {
  label: string
  collapsed: boolean
  canCollapse: boolean
  bodyId: string
  rowCount: number
  chars: number
  onExpand: () => void
  onCollapseFromEnd: () => void
}) {
  if (collapsed) {
    return (
      <ExpandBar type="button" aria-expanded={false} aria-controls={bodyId} onClick={onExpand}>
        <FiChevronDown aria-hidden />
        {label} 전체 읽기{' '}
        <ExpandBarMeta>
          {rowCount > 0 ? `${rowCount}단락 · ` : ''}약 {chars.toLocaleString('ko-KR')}자
        </ExpandBarMeta>
      </ExpandBar>
    )
  }
  if (!canCollapse || rowCount < 2) return null
  return (
    <ExpandBar type="button" aria-expanded aria-controls={bodyId} onClick={onCollapseFromEnd}>
      <FiChevronUp aria-hidden />
      {label} 줄여 보기
    </ExpandBar>
  )
}

/** 섹션 머리의 글자 버튼 — 본문 편집을 가리지 않게 낮은 목소리로 */
export const HeaderTextAction = styled.button`
  padding: 4px 2px;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

/** 섹션 끝 줄 — 카드·점선 상자가 아니라 단락 목록의 마지막 행처럼 읽히는 글자 버튼 */
const ExpandBar = styled.button`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  align-self: flex-start;
  padding: 6px 12px 6px 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }

  svg {
    width: 14px;
    height: 14px;
    align-self: center;
  }
`

const ExpandBarMeta = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`
