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

/** 그룹 전체를 감싸는 판 — 좌측 시간 레일을 그린다. */
export const GroupPanel = styled.div`
  --rail-inset: 40px;
  /* 레일 선·공백 점선이 함께 쓰는 색 — 한 곳에서 바꾸면 둘이 같이 바뀐다 */
  --rail-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.14)'};

  position: relative;
  padding: 8px 20px 20px var(--rail-inset);
  border-radius: 12px;
  border: 1px solid ${hairline};
  background: ${surface};

  &::before {
    content: '';
    position: absolute;
    left: calc(var(--rail-inset) / 2);
    top: 34px;
    bottom: 24px;
    width: 1px;
    background: var(--rail-color);
  }

  @media (max-width: 640px) {
    --rail-inset: 24px;
    padding-right: 10px;
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
  /**
   * 레일 위 도트의 무게(0~1) — 이 그룹이 전체에서 얼마나 큰가. 도트 지름이 8~16px로 바뀌어
   * 레일만 훑어도 '어느 세기에 사람이 몰려 있나'가 읽힌다(19세기 161명 vs 8세기 2명).
   * 미지정이면 기본 12px.
   */
  weight?: number
  /**
   * 레일 구슬 안에 새길 짧은 표지 — 세기별 뷰의 '20'·'BC5'. 주면 점 대신 숫자 구슬이
   * 레일에 꿰인다(세기 축이 '선 + 점'이 아니라 읽히는 눈금이 된다). 왕조처럼 시간 축이
   * 아닌 그룹은 주지 않는다 — 점(weight)으로 남는다.
   */
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
  tone = 'primary',
  weight,
  marker,
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
        $tone={tone}
        $dotSize={weight == null ? 12 : Math.round(8 + 8 * Math.min(1, Math.max(0, weight)))}
        $hasMarker={marker != null}
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        {marker != null && (
          <Bead
            aria-hidden
            $tone={tone}
            $size={beadSize(weight)}
            $long={marker.length > 2}
          >
            {marker}
          </Bead>
        )}
        <Chevron size={15} aria-hidden $collapsed={collapsed} />
        <Label>{label}</Label>
        {range && <Range>({range})</Range>}
        <Count>{count}명</Count>
        <Rule aria-hidden />
      </Header>
      {!collapsed && <Body id={bodyId}>{children}</Body>}
    </Section>
  )
}

/**
 * 인접 그룹 사이 시간 공백 — 사건 목록의 'N년 기록 없음'과 같은 점선 표지.
 *
 * 레일도 그 구간만 **점선**이 된다. 예전엔 본문 쪽에만 점선이 있고 레일은 실선으로 그대로
 * 이어져, '시간이 끊김 없이 이어진다'는 선의 뜻과 '2개 세기 기록 없음'이 서로 반대로 말했다.
 * 지면색 띠로 실선을 덮고 그 위에 점선을 다시 긋는다 — 앞 그룹 끝에서 다음 도트까지.
 */
export const GapMarker = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: ${metaText};
  user-select: none;

  &::before {
    content: '';
    position: absolute;
    /* 레일 중심(판 왼쪽에서 rail-inset/2)에 5px 띠를 맞춘다 — 이 요소는 rail-inset만큼 들어와 있다 */
    left: calc(-1 * var(--rail-inset) / 2 - 2px);
    top: -16px;
    bottom: -28px;
    width: 5px;
    background:
      repeating-linear-gradient(180deg, var(--rail-color) 0 3px, transparent 3px 7px)
        center / 1px 100% no-repeat,
      ${surface};
  }

  &::after {
    content: '';
    flex: 1;
    border-top: 1px dashed var(--rail-color);
  }
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

/**
 * 구슬 지름 — 그룹 크기(weight)에 따라 22~28px. 숫자가 들어가므로 점(8~16px)보다 폭이 좁다.
 * 가장 작은 22px에서도 두 자리 숫자(11px)가 들어간다.
 */
function beadSize(weight?: number): number {
  if (weight == null) return 24
  return Math.round(22 + 6 * Math.min(1, Math.max(0, weight)))
}

const Header = styled.button<{
  $tone: DotTone
  $dotSize: number
  $hasMarker: boolean
}>`
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% + var(--rail-inset));
  min-height: 52px;
  margin-left: calc(-1 * var(--rail-inset));
  padding: 10px 0 10px var(--rail-inset);
  border: none;
  /*
   * 레일 칸은 비워 둔다 — 예전엔 머리글 배경이 레일 칸까지 덮어서 선이 머리글마다 52px씩
   * 끊기고, 도트가 선 위가 아니라 빈 자리에 떠 있었다. 이제 선이 도트를 꿰고 지나가며,
   * 머리글이 sticky로 붙어 있는 동안 그 도트가 레일 위의 '지금 여기' 표지가 된다.
   * (카드는 rail-inset 안쪽에서 시작하므로 비운 칸 아래로 비치는 것은 레일뿐이다.)
   */
  background: linear-gradient(
    90deg,
    transparent 0 calc(var(--rail-inset) - 6px),
    ${surface} calc(var(--rail-inset) - 6px)
  );
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  cursor: pointer;

  /* 레일 위 도트 — 지름이 그룹 크기를 말한다(weight). 숫자 구슬(Bead)이 있으면 그리지 않는다. */
  &::before {
    content: '';
    ${({ $hasMarker }) =>
      $hasMarker &&
      css`
        display: none;
      `}
    position: absolute;
    left: calc(var(--rail-inset) / 2 + 0.5px);
    top: 50%;
    width: ${({ $dotSize }) => $dotSize}px;
    height: ${({ $dotSize }) => $dotSize}px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: ${BRAND.primary};
    box-shadow: 0 0 0 3px ${surface};
    ${({ $tone, theme }) =>
      $tone === 'muted' &&
      css`
        width: 10px;
        height: 10px;
        background: ${surface({ theme })};
        border: 1.5px solid ${theme.colors.text.tertiary};
      `}
    ${({ $tone }) =>
      $tone === 'pinned' &&
      css`
        background: #f59e0b;
      `}
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset ${BRAND.focusRing};
  }
`

/**
 * 숫자 구슬 — 레일 위 세기 눈금. 채운 브랜드색 + 흰 숫자, 지면색 3px 고리로 선에서 떼어 낸다.
 * 'BC5'처럼 세 글자 이상이면 글자를 한 단 줄인다.
 */
const Bead = styled.span<{ $tone: DotTone; $size: number; $long: boolean }>`
  position: absolute;
  left: calc(var(--rail-inset) / 2 + 0.5px);
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${BRAND.primary};
  box-shadow: 0 0 0 3px ${surface};
  color: #ffffff;
  font-size: ${({ $long }) => ($long ? 9 : 11)}px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: ${({ $long }) => ($long ? '-0.04em' : '-0.02em')};
  line-height: 1;
  pointer-events: none;

  ${({ $tone, theme }) =>
    $tone === 'muted' &&
    css`
      background: ${surface({ theme })};
      border: 1.5px solid ${theme.colors.text.tertiary};
      color: ${theme.colors.text.secondary};
    `}

  /* 좁은 폭은 레일 칸이 24px — 구슬도 한 크기로 줄인다 */
  @media (max-width: 640px) {
    width: 20px;
    height: 20px;
    font-size: ${({ $long }) => ($long ? 8 : 9.5)}px;
  }
`

const Chevron = styled(FiChevronDown)<{ $collapsed: boolean }>`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform ${MOTION_FAST};
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`

const Label = styled.span`
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
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
