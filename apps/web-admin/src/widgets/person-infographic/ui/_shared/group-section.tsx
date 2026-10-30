/**
 * 그룹 뷰(시대 스토리·왕조·고정) 공용 틀 — 사건 목록(/events)의 세기 머리와 같은 문법.
 *
 *   ●  20세기 (1901–2000) 7명 ───────────────────────
 *   │  [카드][카드][카드]…
 *   │  3개 세기 기록 없음 - - - - - - - - - - - - - - -
 *   ●  17세기 …
 *
 * - 좌측 레일 위 도트 + 큰 제목(20/800) + 옅은 기간 + 건수 + 가로 헤어라인.
 * - 머리는 접기 버튼이며 sticky — 스크롤 중에도 지금 어느 그룹인지 보인다.
 * - 면(glass 카드 상자)을 걷어내고 여백·타입 크기로 그룹을 가른다.
 */
import type { ReactNode } from 'react'

import { FiChevronDown } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { BRAND, hairline, metaText, MOTION_FAST, srOnly, surface } from './catalog.styles'

/** 그룹 전체를 감싸는 판 */
export const GroupPanel = styled.div`
  position: relative;
  padding: 12px 20px 20px;
  border-radius: 12px;
  border: 1px solid ${hairline};
  background: ${surface};

  @media (max-width: 640px) {
    padding: 10px 12px 16px;
  }
`

type DotTone = 'primary' | 'muted' | 'pinned'

interface GroupSectionProps {
  id: string
  label: ReactNode
  /** 제목 옆 옅은 보조 정보 — 기간·국가 */
  range?: ReactNode
  count: number
  tone?: DotTone
  weight?: number
  marker?: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}

export function GroupSection({
  id,
  label,
  range,
  count,
  collapsed,
  onToggle,
  children,
}: GroupSectionProps) {
  const headingId = `person-group-${id}`
  const bodyId = `${headingId}-body`
  return (
    <Section aria-labelledby={headingId}>
      <Heading id={headingId}>
        {label} {count}명
      </Heading>
      <Header
        type="button"
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <Chevron size={15} aria-hidden $collapsed={collapsed} />
        <Label>{label}</Label>
        {range && <Range>{range}</Range>}
        <Count>{count}명</Count>
        <Rule aria-hidden />
      </Header>
      {!collapsed && <Body id={bodyId}>{children}</Body>}
    </Section>
  )
}

export const GapMarker = styled.div`
  display: none;
`

/** '+N명 더 보기' — 헤어라인 알약 */
export const MoreBtn = styled.button`
  display: block;
  margin: 14px auto 0;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid ${hairline};
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color ${MOTION_FAST}, border-color ${MOTION_FAST}, background ${MOTION_FAST};

  &:hover {
    color: ${BRAND.primary};
    border-color: ${BRAND.primaryBorder};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const Section = styled.section`
  position: relative;
  & + & {
    margin-top: 8px;
  }
`

const Heading = styled.h2`
  ${srOnly}
`

const Header = styled.button`
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 8px 0;
  border: none;
  background: ${surface};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: inset ${BRAND.focusRing};
  }
`

const Chevron = styled(FiChevronDown)<{ $collapsed: boolean }>`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform ${MOTION_FAST}, color ${MOTION_FAST};
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});

  ${Header}:hover & {
    color: ${BRAND.primary};
  }
`

const Label = styled.span`
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  transition: color ${MOTION_FAST};

  ${Header}:hover & {
    color: ${BRAND.primary};
  }
`

const Range = styled.span`
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 640px) {
    display: none;
  }
`

const Count = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Rule = styled.span`
  flex: 1;
  min-width: 16px;
  height: 1px;
  margin-left: 8px;
  background: ${hairline};
`

const Body = styled.div`
  padding: 4px 0 16px;
`
