/**
 * 최상위 사건 조망 — 조판.
 *
 * 상세(문서)와 다른 지면이다: 읽는 폭(68ch)이 아니라 **콘텐츠 영역 전체**를 쓰고, 본문 대신
 * 패널 격자가 선다. 색은 사건 지면 공통 토큰(ledger-tokens)만 쓴다.
 */
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  ledgerAccent,
  ledgerBackground,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'

import type { RoleTone } from './event-overview.lib'

/** 배역 색 — 넷만. 다크는 밝은 쌍 */
export const ROLE_TONE_COLOR: Record<RoleTone, { light: string; dark: string; label: string }> = {
  lead: { light: '#4f46e5', dark: '#a5b4fc', label: '주도' },
  target: { light: '#b91c1c', dark: '#f87171', label: '대상·피해' },
  statehood: { light: '#4d7c0f', dark: '#a3e635', label: '건국·멸망' },
  neutral: { light: '#64748b', dark: '#94a3b8', label: '참여·기타' },
}

/** 줄무늬 — 반투명이면 스티키 첫 칸과 겹쳐 진해지므로 지면색에 섞은 불투명 색 */
export const stripeFill = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.022)'
const stripeSolid = (mode: 'light' | 'dark') => (mode === 'dark' ? '#1a1a1c' : '#f8f9fb')

export const toneColor = (tone: RoleTone, mode: 'light' | 'dark') =>
  mode === 'dark' ? ROLE_TONE_COLOR[tone].dark : ROLE_TONE_COLOR[tone].light

/** 사건 상세의 '조망' 탭 패널 — 여백·바탕은 상세 지면이 쥔다 */
export const Page = styled.div`
  box-sizing: border-box;
  width: 100%;
  /* 상세의 문서 열 안에 들어오므로 화면 폭이 아니라 이 패널 폭으로 배치를 고른다 */
  container: overviewpanel / inline-size;
  display: flex;
  flex-direction: column;
  gap: 28px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  text-decoration: none;
  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** [조망 | 문서] — 지금 보는 쪽이 채워진다 */
export const ViewSwitch = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 10px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const ViewSwitchItem = styled.button<{ $active: boolean }>`
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0,0,0,0.12)' : 'none')};
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

/**
 * 채움 정도 색 — 막대 **칠**용 단색. 테마의 alert.warning은 배경용 옅은 색이라 막대에 쓰면
 * 40~69% 행의 막대가 비어 보였다.
 */
const fillColor = (pct: number, mode: 'light' | 'dark') =>
  pct >= 70
    ? mode === 'dark' ? '#4ade80' : '#16a34a'
    : pct >= 40
      ? mode === 'dark' ? '#fbbf24' : '#d97706'
      : mode === 'dark' ? '#f87171' : '#dc2626'

export const TextButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 3px;
  }
`

// ─── 핵심 숫자 ─────────────────────────────────────────────────────────────
// 상자 다섯 개 대신 한 줄의 숫자 띠 — 숫자가 주인공이고 테두리는 칸 사이 세로선 하나뿐.

export const StatRow = styled.dl`
  margin: 0;
  display: grid;
  /* 기본(좁은 패널)은 2열 — 5칸이 auto-fit로 4+1로 꺾이면 마지막 칸 혼자 둘째 줄에 남았다 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  /* 칸 사이 세로선은 부모에서 — 자식의 '& + &'는 props가 다른 형제(흐린 칸)와 매칭이 안 된다 */
  > *:nth-child(even) {
    padding-left: 16px;
    border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
  > *:nth-child(n + 3) {
    border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
  /* 2열에서 다섯째(기록 충실도)가 혼자 반 칸만 쓰고 오른쪽이 비었다 — 홀수 끝 칸은 한 줄을 다 쓴다
     (5칸 한 줄 규칙이 아래에서 같은 선택자로 되돌린다) */
  > *:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
  /* 패널이 600px 이상이면 5칸 한 줄 — 칸 사이 세로선만 */
  @container overviewpanel (min-width: 600px) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    > *:nth-child(n) {
      padding-left: 0;
      border-left: none;
      border-top: none;
    }
    /* nth-child — 위 초기화와 우선순위가 같아야 뒤에 오는 이 규칙이 이긴다(* + * 는 약하다) */
    > *:nth-child(n + 2) {
      padding-left: 16px;
      border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    }
    > *:last-child:nth-child(odd) {
      grid-column: auto;
    }
  }
`

export const Stat = styled.div<{ $muted?: boolean; $link?: boolean }>`
  padding: 14px 18px 14px 0;
  /* 칸을 누르면 그 숫자를 펼친 탭으로 */
  ${({ $link, theme }) =>
    $link
      ? `cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s;
  &:hover { background: ${ledgerHoverFill(theme.mode)}; }
  &:focus-visible { outline: 2px solid ${ledgerAccent(theme.mode)}; outline-offset: -2px; }`
      : ''}
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  opacity: ${({ $muted }) => ($muted ? 0.55 : 1)};
`

export const StatLabel = styled.dt`
  order: 2;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const StatValue = styled.dd<{ $pair?: boolean }>`
  order: 1;
  margin: 0;
  /* 숫자 둘(진영 6 · 수치 0)은 한 줄을 지키게 조금 작게 — 좁은 칸에서 '0'만 둘째 줄로 떨어졌다 */
  font-size: ${({ $pair }) => ($pair ? 'clamp(22px, 2vw, 30px)' : 'clamp(26px, 2.4vw, 34px)')};
  white-space: nowrap;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.1;
`

/** 거른 값 뒤 전체('12 / 20'의 '/ 20') */
export const StatOf = styled.span`
  margin-left: 4px;
  font-size: 0.55em;
  font-weight: 700;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 한 칸에 숫자가 둘일 때 숫자 앞 이름표('진영 6  수치 0') */
export const StatUnit = styled.span<{ $gap?: boolean }>`
  margin: ${({ $gap }) => ($gap ? '0 3px 0 10px' : '0 3px 0 0')};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const StatNote = styled.span`
  order: 3;
  font-size: 11.5px;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.tertiary};
  /* 두 줄까지 — 한 줄 말줄임이면 1100 화면에서 '최다 오스만 제국 1…'로 숫자가 잘렸다 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: keep-all;
`

/** 충실도 막대 — 숫자 밑에 얇게 */
export const Meter = styled.span`
  order: 4;
  display: block;
  height: 4px;
  margin-top: 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

export const MeterFill = styled.span<{ $pct: number }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ $pct, theme }) => fillColor($pct, theme.mode)};
`

// ─── 섹션 내비 ─────────────────────────────────────────────────────────────
// 지면이 길다(1차대전 기준 화면 3장). 머리 아래에 붙어 따라오는 목차.

/*
 * 상세 탭 바 **바로 아래**에 붙는다 — 예전엔 둘 다 top 0이면 겹쳐서 흐름에 두었는데, 그러면 화면 세 장짜리
 * 지면에서 첫 화면 뒤로 목차가 사라져 '지금 읽는 곳' 표시가 소용없었다. 탭 바 높이는 상세가
 * --event-tabs-height로 재서 준다. 지면색 불투명 필수(아래로 지나가는 패널이 비치면 안 된다).
 */
/** 조망 탭 줄 — 머리 아래 따라온다(상세 탭 바 높이만큼 아래) */
export const SectionNav = styled.div`
  position: sticky;
  top: var(--event-tabs-height, 45px);
  z-index: 4;
  margin: -12px 0 0;
  display: flex;
  align-items: stretch;
  gap: 2px;
  overflow-x: auto;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  scrollbar-width: none;
`

/** 탭 목록 — 탭 줄 안에서 탭만 묶는다(오른쪽 거르기 요약은 목록 밖) */
export const SectionTabs = styled.div`
  display: flex;
  align-items: stretch;
  gap: 2px;
`

/**
 * 탭 하나 — 위에 성격 낱말(언제·누가·무엇·얼마나), 아래에 이름·건수. 고른 탭은 아래 굵은 선.
 * 예전 목차는 둥근 알약이라 '지금 어디'가 옅은 회색 바탕뿐이었다.
 */
export const SectionNavLink = styled.button<{ $active?: boolean }>`
  position: relative;
  flex-shrink: 0;
  display: inline-grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  column-gap: 6px;
  align-items: baseline;
  padding: 8px 16px 10px;
  border: none;
  background: none;
  font: inherit;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  cursor: pointer;
  &::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: -1px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: ${({ $active, theme }) => ($active ? ledgerAccent(theme.mode) : 'transparent')};
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:hover::after {
    background: ${({ $active, theme }) => ($active ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode))};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
    border-radius: 6px;
  }
`

/** 탭 줄 오른쪽 끝 거르기 요약 — 내려가 있어도 '걸러 보는 중'이 보이게 */
export const SectionNavFilter = styled.div`
  flex-shrink: 0;
  align-self: center;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  white-space: nowrap;
  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    padding: 0 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.light};
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: pointer;
  }
  button:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  /* 좁으면 풀기 단추만 — 숫자까지 세우면 탭 줄 밖으로 밀려 잘렸다 */
  @container overviewpanel (max-width: 560px) {
    > span {
      display: none;
    }
  }
`

/** 탭 위 성격 낱말 — 두 칸을 가로질러 왼쪽 위에 */
export const SectionNavHint = styled.span`
  grid-column: 1 / -1;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SectionNavCount = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 필터 줄 ───────────────────────────────────────────────────────────────

export const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const FilterChip = styled.button`
  ${buttonBase}
  height: 28px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text.primary};
`

// ─── 묶음 ──────────────────────────────────────────────────────────────────

/**
 * 묶음 색 — 막대 색(분야)과 겹치지 않게 청록·호박·분홍·남색·연두·회청. 묶음 표지(띠·칸 머리·칩)에만 쓴다.
 * 막대는 여전히 분야 색이라, 묶음 색은 막대 밖(왼쪽 선·옅은 띠)에서 말한다.
 */
const GROUP_PALETTE = {
  light: ['#0d9488', '#d97706', '#db2777', '#4f46e5', '#65a30d', '#475569'],
  dark: ['#2dd4bf', '#fbbf24', '#f472b6', '#818cf8', '#a3e635', '#94a3b8'],
} as const

export const groupColor = (index: number, mode: 'light' | 'dark') =>
  GROUP_PALETTE[mode][index % GROUP_PALETTE[mode].length]

/**
 * 묶음 고르기 줄 — 탭 바로 아래 거르기 줄. 전체 · 묶음들 · 개별 중 하나를 고른다.
 * 거르기는 탭을 건너도 남으므로 탭(무엇을 볼까) 다음, 내용(어떻게 거를까) 앞에 둔다.
 */
export const GroupStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  /* 좁으면 한 줄 가로 스크롤 — 줄바꿈이면 420 화면에서 칩이 세 줄(108px)을 먹었다 */
  @container overviewpanel (max-width: 640px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    > * {
      flex-shrink: 0;
    }
  }
`

export const GroupStripLabel = styled.span`
  margin-right: 4px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 묶음 칩 — 색은 왼쪽 점 하나로만(간트 묶음 띠와 같은 색). 고른 칩은 진한 테두리·옅은 바탕 */
export const GroupCard = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  max-width: 360px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.border.light)};
  border-radius: 999px;
  background: ${({ $active, theme }) => ($active ? ledgerSubtleFill(theme.mode) : 'transparent')};
  font: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

export const GroupDot = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`

export const GroupCardTitle = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const GroupCardCount = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const GroupCardMeta = styled.span`
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

/** 표 제목 칸 들여쓰기 — 단계마다 16px, 끝에 └ */
export const ListIndent = styled.span<{ $levels: number }>`
  display: inline-block;
  width: ${({ $levels }) => $levels * 16}px;
  padding-right: 5px;
  text-align: right;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#4b5563' : '#94a3b8')};
`

/** 접기 칸(빈 자리) — 묶음 머리 줄의 접기 단추와 같은 폭 */
export const FoldSlot = styled.span`
  flex-shrink: 0;
  width: 16px;
`

/** 한 단계 들여쓰기 폭 */
const TREE_STEP = 20

/** 하위 제목 들여쓰기 — 단계 수만큼 폭, 안에 가지선 */
export const TreeIndent = styled.span<{ $levels: number }>`
  position: relative;
  flex-shrink: 0;
  align-self: stretch;
  /* 직계(0단계)는 줄기만 그리려고 세운 빈 칸 — 폭 0, 뒤 flex 틈(8px)도 되돌린다 */
  width: ${({ $levels }) => Math.max(0, $levels * TREE_STEP - 8)}px;
  margin-right: ${({ $levels }) => ($levels === 0 ? -8 : -2)}px;
`

/**
 * 가지선 한 단계 — level 2가 맨 왼쪽 칸. tee(├)·elbow(└)는 세로선+가로 가지, pass는 세로선만.
 * 세로선 x는 바로 위 단계 제목의 분야 점 아래쯤이라 '이 줄은 저 줄의 하위'로 읽힌다.
 */
export const TreeGuide = styled.span<{ $level: number; $kind: 'pass' | 'tee' | 'elbow' | 'stem' }>`
  position: absolute;
  /* stem = 자식이 있는 줄의 분야 점에서 아래로 내려가는 줄기(첫 자식 가지선과 이어진다) */
  top: ${({ $kind }) => ($kind === 'stem' ? '50%' : '0')};
  left: ${({ $level }) => ($level - 2) * TREE_STEP + 3}px;
  width: ${({ $kind }) => ($kind === 'pass' || $kind === 'stem' ? 0 : TREE_STEP - 7)}px;
  height: ${({ $kind }) => ($kind === 'elbow' || $kind === 'stem' ? '50%' : '100%')};
  border-left: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#4b5563' : '#cbd5e1')};
  ${({ $kind, theme }) =>
    $kind === 'pass' || $kind === 'stem'
      ? ''
      : $kind === 'elbow'
        ? `border-bottom: 1.5px solid ${theme.mode === 'dark' ? '#4b5563' : '#cbd5e1'}; border-bottom-left-radius: 6px;`
        : `background: linear-gradient(${theme.mode === 'dark' ? '#4b5563' : '#cbd5e1'}, ${theme.mode === 'dark' ? '#4b5563' : '#cbd5e1'}) no-repeat 0 50% / 100% 1.5px;`}
`

/** 간트 묶음 머리 줄의 접기 단추 */
export const GroupFold = styled.button`
  flex-shrink: 0;
  width: 16px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: none;
  font-size: 12px;
  line-height: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** 간트 묶음 머리 줄 — 묶음 이름 옆 '묶음 · N건' */
export const GroupTag = styled.span<{ $color: string }>`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 12%, transparent)`};
`

/** 간트 트랙 뒤 묶음 기간 띠 — 묶음의 모든 줄에 같은 자리로 깔려 한 덩어리로 읽힌다 */
export const GroupBand = styled.div<{ $color: string; $head?: boolean }>`
  position: absolute;
  top: ${({ $head }) => ($head ? '4px' : '0')};
  bottom: 0;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 9%, transparent)`};
  border-left: 1px solid ${({ $color }) => `color-mix(in srgb, ${$color} 45%, transparent)`};
  border-right: 1px solid ${({ $color }) => `color-mix(in srgb, ${$color} 45%, transparent)`};
  ${({ $head, $color }) =>
    $head ? `border-top: 2px solid color-mix(in srgb, ${$color} 70%, transparent); border-radius: 4px 4px 0 0;` : ''}
  pointer-events: none;
`

/** 매트릭스 맨 위 묶음 머리 칸 */
export const MatrixGroupHead = styled.th<{ $color: string | null }>`
  padding: 4px 6px 3px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
  color: ${({ $color, theme }) => $color ?? theme.colors.text.tertiary};
  border-bottom: 2px solid ${({ $color, theme }) => $color ?? theme.colors.border.light};
  border-left: 6px solid ${({ theme }) => theme.colors.background.primary};
  &&& {
    background: ${({ $color }) => ($color ? `color-mix(in srgb, ${$color} 8%, transparent)` : 'transparent')};
  }
`

/** 기록 점검 위 묶음별 채움 요약 */
export const GroupFillList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const GroupFillRow = styled.button<{ $active: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px 44px minmax(0, 150px);
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.text.primary : 'transparent')};
  border-radius: 8px;
  background: ${({ $active, theme }) => ($active ? ledgerSubtleFill(theme.mode) : 'transparent')};
  font: inherit;
  font-size: 13px;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const GroupFillName = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-weight: 600;
  > span:nth-child(2),
  > span:first-child:not([aria-hidden]) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const GroupFillPct = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
`

export const GroupFillWorst = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 점검표 묶음 머리 줄 */
export const ChecklistGroupRow = styled.tr<{ $color: string | null }>`
  &&& td {
    padding: 10px 8px 6px;
    background: transparent;
    border-bottom: 2px solid ${({ $color, theme }) => $color ?? theme.colors.border.default};
    font-size: 12.5px;
    font-weight: 700;
    color: ${({ $color, theme }) => $color ?? theme.colors.text.secondary};
  }
  span {
    margin-left: 8px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

// ─── 패널 격자 ─────────────────────────────────────────────────────────────

/*
 * 2열은 **패널 폭** 기준 — 화면 폭(@media 1100)으로 갈랐더니 좌측 사이드바·우측 장부 사이에 끼어
 * 실제 폭이 600~700px인데도 2열이 되어 인물·진영 패널이 300px 남짓으로 눌렸다(숫자 줄 02e050f8c와 같은 결함).
 * Page가 overviewpanel 컨테이너다.
 */
export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 36px 40px;
  @container overviewpanel (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  /* 탭 줄 밑선 바로 아래 첫 패널의 윗선 — 선이 두 겹으로 섰다 */
  > section:first-child {
    border-top: none;
    padding-top: 4px;
  }
`

/**
 * 패널은 상자가 아니다 — 위쪽 선 하나와 제목. 상자 7개 + 숫자 상자 5개가 같은 무게로 서면
 * 무엇이 주인공인지 사라진다(첫 판 실측).
 */
export const Panel = styled.section<{ $wide?: boolean }>`
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  min-width: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 탭 바 + 섹션 목차 높이만큼 — 앵커로 뛰면 제목이 둘 밑에 숨지 않게 */
  scroll-margin-top: calc(var(--event-tabs-height, 45px) + 56px);
`

export const PanelHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
`

export const PanelTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
`

export const PanelNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const Empty = styled.p`
  margin: 0;
  padding: 10px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 가로로 넘치는 표·도표만 가로 스크롤 — 지면 전체는 가로로 밀리지 않는다 */
export const Scroll = styled.div`
  overflow-x: auto;
  min-width: 0;
`

/** 가로로 넘치는 표의 오른쪽 끝 흐림 — 남은 열이 있을 때만(data-more-right) */
export const EdgeFadeFrame = styled.div`
  position: relative;
  min-width: 0;
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 48px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    background: linear-gradient(to right, transparent, ${({ theme }) => theme.colors.background.primary});
  }
  &[data-more-right]::after {
    opacity: 1;
  }
`

// ─── 간트 ──────────────────────────────────────────────────────────────────

/* 200px(30%) 하한에서 번호·점·표지를 빼면 제목이 6자('사라예보 암살…')만 남아 18줄이 거의 안 읽혔다 */
export const GANTT_LABEL_WIDTH = 'clamp(240px, 38%, 420px)'

export const GanttGrid = styled.div`
  display: grid;
  grid-template-columns: ${GANTT_LABEL_WIDTH} minmax(420px, 1fr);
  min-width: 640px;
`

/**
 * 간트 스크롤 틀 — 좁을 때만 가로 스크롤. 넓으면 overflow를 풀어야 축 줄의 sticky가 페이지 스크롤을 따른다
 * (overflow-x: auto 안의 sticky는 그 틀 기준이라 위로 붙지 않는다).
 */
export const GanttScroll = styled.div`
  overflow-x: auto;
  min-width: 0;
  @container overviewpanel (min-width: 660px) {
    overflow: visible;
  }
`

/** 축 줄 — 탭 두 줄(상세 탭·조망 탭) 바로 아래에 붙는다. 20줄을 내려가도 날짜가 남는다 */
const ganttAxisSticky = css`
  position: sticky;
  top: calc(var(--event-tabs-height, 45px) + var(--survey-tabs-height, 62px));
  z-index: 3;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

/** 축 줄 왼쪽(제목 열) 빈 칸 — 축과 함께 붙어 아래 제목이 비치지 않게 */
export const GanttAxisCorner = styled.div`
  ${ganttAxisSticky}
  left: 0;
  z-index: 4;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const GanttAxis = styled.div`
  ${ganttAxisSticky}
  /* 위 14px = '상위 기간' 표지, 아래 = 눈금 — 둘이 한 줄에 서면 글자가 겹쳤다 */
  height: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

/** 축 위 '상위 기간' 표지 — 회색 띠가 무엇인지 범례 없이 읽히게 */
export const ParentBandMark = styled.span`
  position: absolute;
  top: 0;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border.default};
  &::after {
    content: '상위 기간';
    position: absolute;
    left: 0;
    top: 5px;
    font-size: 10px;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/**
 * 상위 사건의 시작·끝 표지(축) — 띠가 축을 다 덮어 그리지 않을 때 경계를 말한다.
 * 시작은 선 오른쪽, 끝은 선 왼쪽으로 글자를 뻗어 축 밖으로 나가지 않게.
 */
export const ParentEdgeMark = styled.span<{ $side: 'start' | 'end' }>`
  position: absolute;
  top: 0;
  transform: ${({ $side }) => ($side === 'end' ? 'translateX(-100%)' : 'none')};
  padding: 0 4px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  border-${({ $side }) => ($side === 'end' ? 'right' : 'left')}: 2px solid
    ${({ theme }) => ledgerAccent(theme.mode)};
`

/** 상위 사건의 시작·끝 선(줄마다) — 눈금선보다 진하고 점선 */
export const ParentEdgeLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1.5px dashed ${({ theme }) => ledgerAccent(theme.mode)};
  opacity: 0.7;
  pointer-events: none;
`

/** 간트 막대 색(분야) 범례 — 둘 이상의 분야가 섞일 때만 */
export const DomainLegend = styled.ul`
  flex-basis: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

/** 접은 빈 구간 — 축의 BREAK_PCT(4%) 폭 틈. 줄마다 같은 자리에 끊긴 띠 */
export const BREAK_HALF_PCT = 2

export const AxisBreak = styled.span`
  position: absolute;
  bottom: 2px;
  transform: translateX(-50%);
  padding: 0 3px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: help;
`

export const BreakBand = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-right: 1px dashed ${({ theme }) => theme.colors.border.default};
  /* 빗금은 '상위 기간 중 하위 없음'(주황) 몫이라 여기선 줄무늬를 끊는 지면색만 */
  background: ${({ theme }) => theme.colors.background.primary};
  pointer-events: none;
`

export const GanttTick = styled.span<{ $align?: 'start' | 'center' | 'end' }>`
  position: absolute;
  bottom: 4px;
  transform: translateX(
    ${({ $align = 'center' }) => ($align === 'start' ? '0' : $align === 'end' ? '-100%' : '-50%')}
  );
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

export const GanttLabel = styled.div<{
  $depth: number
  $dim: boolean
  $hot: boolean
  $stripe?: boolean
  /** 묶음 자신(머리 줄) — 굵게 */
  $groupHead?: boolean
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 34px;
  /* 들여쓰기는 번호 뒤 TreeIndent가 맡는다 — 번호 열은 줄마다 같은 자리 */
  padding: 0 10px 0 6px;
  font-size: 13.5px;
  font-weight: ${({ $groupHead }) => ($groupHead ? 700 : 'inherit')};
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  /* 제목 열 고정 — 좁은 화면에서 간트를 가로로 밀면 제목이 함께 사라졌다(매트릭스 나라 열과 같은 규칙).
     줄무늬·강조는 반투명이라 지면색 위에 겹쳐 불투명하게 만든다 */
  position: sticky;
  left: 0;
  z-index: 1;
  background:
    linear-gradient(
      ${({ $hot, $stripe, theme }) =>
        $hot ? ledgerHoverFill(theme.mode) : $stripe ? stripeFill(theme.mode) : 'transparent'},
      ${({ $hot, $stripe, theme }) =>
        $hot ? ledgerHoverFill(theme.mode) : $stripe ? stripeFill(theme.mode) : 'transparent'}
    ),
    ${({ theme }) => theme.colors.background.primary};
`

/** 개요 번호 '3' · '3-1' — 직계는 진하게, 그 아래는 옅게. 폭 고정 열이라 제목 들여쓰기가 번호에 안 묻힌다 */
export const GanttNumber = styled.span<{ $sub?: boolean }>`
  flex-shrink: 0;
  width: 34px;
  font-size: 11px;
  font-weight: ${({ $sub }) => ($sub ? 500 : 700)};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ $sub, theme }) => ($sub ? theme.colors.text.tertiary : theme.colors.text.secondary)};
  text-align: right;
`

export const CategoryDot = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

/** 사건 제목 — 누르면 조망 속 모달. 링크처럼 보이되 페이지를 떠나지 않는다 */
export const RowTitleButton = styled.button<{ $wrap?: boolean }>`
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 간트 제목은 두 줄까지 — 들여쓰기가 제목 열을 먹어 1100 화면에서 20줄 중 10줄이 잘렸다 */
  ${({ $wrap }) =>
    $wrap
      ? `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; white-space: normal; word-break: keep-all; overflow-wrap: anywhere; line-height: 1.3;`
      : 'white-space: nowrap;'}
  color: inherit;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
    border-radius: 3px;
  }
`

export const GanttTrack = styled.div<{ $dim: boolean; $hot: boolean; $stripe?: boolean }>`
  position: relative;
  min-height: 34px;
  cursor: pointer;
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  background: ${({ $hot, $stripe, theme }) =>
    $hot ? ledgerHoverFill(theme.mode) : $stripe ? stripeFill(theme.mode) : 'transparent'};
`

/** 상위 사건 자신의 기간 — 모든 줄 뒤에 깔리는 띠 */
export const ParentBand = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  pointer-events: none;
`

export const GridLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  pointer-events: none;
`

export const Bar = styled.div<{ $color: string; $uncertain: boolean; $point: boolean }>`
  position: absolute;
  top: 50%;
  height: ${({ $point }) => ($point ? '11px' : '14px')};
  min-width: ${({ $point }) => ($point ? '11px' : '6px')};
  transform: translate(${({ $point }) => ($point ? '-50%' : '0')}, -50%);
  border-radius: 999px;
  ${({ $uncertain, $color }) =>
    $uncertain
      ? css`
          background: transparent;
          border: 1.5px dashed ${$color};
        `
      : css`
          background: ${$color};
        `}
`

export const BarLabel = styled.span<{ $inside?: boolean; $pinned?: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding-left: 8px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  /* 막대 안이면 막대 색 위에서 읽히게 — 갈래색은 라이트에선 짙고 다크에선 옅다(노랑 위 흰 글씨 금지) */
  color: ${({ $inside, theme }) =>
    $inside ? (theme.mode === 'dark' ? '#111827' : '#fff') : theme.colors.text.tertiary};
  font-weight: ${({ $inside }) => ($inside ? 600 : 400)};
  pointer-events: none;
  /* 어디에도 자리가 없어 트랙 끝에 붙인 라벨 — 막대 위에 겹쳐도 읽히게 칩 바탕 */
  ${({ $pinned, theme }) =>
    $pinned
      ? `
    padding: 1px 6px;
    border-radius: 4px;
    background: ${theme.colors.background.primary};
    box-shadow: 0 0 0 1px ${theme.colors.border.light};
    color: ${theme.colors.text.secondary};
  `
      : ''}
`

// ─── 매트릭스 ──────────────────────────────────────────────────────────────

export const MatrixTable = styled.table`
  width: 100%;
  table-layout: auto;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
  tbody tr:nth-child(even) td {
    background: ${({ theme }) => stripeFill(theme.mode)};
  }
  tbody tr:nth-child(even) th {
    background: ${({ theme }) => stripeSolid(theme.mode)};
  }
  /* 가로 십자선 — 마우스가 있는 나라 줄을 끝까지 칠해 먼 열의 점도 어느 나라인지 따라간다 */
  tbody tr:hover td {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  thead th {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`

export const MatrixHeadCell = styled.th<{ $hot?: boolean; $dim?: boolean }>`
  min-width: 30px;
  /* '3-1-2'가 하이픈에서 꺾이지 않게 */
  white-space: nowrap;
  /* 거르기 밖의 사건 열 — 간트·점검표와 같은 농도로 흐린다 */
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  button {
    padding: 2px 4px;
    border: none;
    border-radius: 4px;
    background: none;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  button:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  button:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  }
  padding: 6px 2px;
  font-weight: 600;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
  text-align: center;
`

export const MatrixCountryCell = styled.th`
  position: sticky;
  left: 0;
  z-index: 1;
  width: 1%;
  text-align: left;
  padding: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  font-weight: 500;
`

/** 상위에만 걸린 나라를 접은 줄 — 표 폭 전체, 줄무늬 없이 */
export const RootOnlyCell = styled.td`
  padding: 0;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent !important;
`

export const RootOnlyToggle = styled.button`
  position: sticky;
  left: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  max-width: min(100%, 900px);
  padding: 9px 6px;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  strong {
    flex-shrink: 0;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover strong {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

export const CountryButton = styled.button<{ $active: boolean; $dim?: boolean }>`
  /* 걸린 사건에 한 번도 나오지 않는 나라 */
  opacity: ${({ $dim }) => ($dim ? 0.45 : 1)};
  display: flex;
  align-items: center;
  gap: 6px;
  width: 240px;
  padding: 6px 12px 6px 6px;
  border: none;
  background: ${({ $active, theme }) => ($active ? ledgerHoverFill(theme.mode) : 'transparent')};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  text-align: left;
  cursor: pointer;
  span:first-of-type {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 나라별 하위 건수 — 숫자 옆 작은 막대로 많고 적음이 한눈에 */
export const CountBadge = styled.span<{ $pct?: number }>`
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  &::before {
    content: '';
    display: block;
    width: ${({ $pct = 0 }) => Math.max(4, ($pct / 100) * 40)}px;
    height: 4px;
    border-radius: 999px;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    opacity: 0.55;
  }
`

export const MatrixCell = styled.td<{ $hot: boolean; $dim?: boolean }>`
  text-align: center;
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  cursor: pointer;
  padding: 5px 2px;
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
`

/**
 * 배역 표시 — 주도·대상·건국멸망은 **채운** 칸, 그 밖의 관여는 **속 빈** 칸.
 * 대부분이 '참여'라 같은 무게로 채우면 회색이 매트릭스를 덮어 주도·대상이 묻혔다.
 */
/**
 * 배역 표시 — 주도·대상·건국멸망은 **채운 칸**, 그 밖의 관여는 **작은 점**.
 * 대부분이 '참여'라 같은 크기로 그리면(채움이든 테두리든) 그것이 매트릭스를 덮어 주도·대상이 묻혔다.
 */
export const RoleMark = styled.span<{ $color: string; $hollow?: boolean }>`
  display: inline-block;
  width: ${({ $hollow }) => ($hollow ? '8px' : '15px')};
  height: ${({ $hollow }) => ($hollow ? '8px' : '15px')};
  border-radius: ${({ $hollow }) => ($hollow ? '50%' : '4px')};
  background: ${({ $color }) => $color};
  vertical-align: middle;
`

export const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

// ─── 막대 분포 ─────────────────────────────────────────────────────────────

/** 시기 밀도 — 세로 막대 */
export const Histogram = styled.div<{ $aligned?: boolean }>`
  /* 간트 축에 맞출 때는 칸이 저마다 축 위 자리(left·width)에 선다 */
  position: ${({ $aligned }) => ($aligned ? 'relative' : 'static')};
  display: ${({ $aligned }) => ($aligned ? 'block' : 'flex')};
  align-items: flex-end;
  justify-content: center;
  /* 칸이 폭을 나눠 쓰면서 막대가 벽돌처럼 붙었다 — 틈을 넓혀 칸이 갈려 읽히게 */
  gap: clamp(6px, 1.4%, 14px);
  height: 150px;
  padding-top: 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

/**
 * 칸이 축 폭을 나눠 쓴다 — 예전 64px 상한은 칸이 적으면 가운데 몰리고 양옆이 비어 축과 어긋났다.
 * 칸 전체가 버튼 — 누르면 그 시기로 거른다.
 */
export const HistogramColumn = styled.button<{ $selected?: boolean }>`
  flex: 1;
  min-width: 6px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  height: 100%;
  position: relative;
  padding: 0;
  border: none;
  border-radius: 4px 4px 0 0;
  background: ${({ $selected, theme }) => ($selected ? ledgerHoverFill(theme.mode) : 'transparent')};
  font: inherit;
  cursor: pointer;
  &:disabled {
    cursor: default;
  }
  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

export const HistogramCount = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 간트 축 정렬 시 왼쪽 제목 열 자리 — 척도 */
export const HistogramScale = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  padding: 0 12px 30px 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  span:first-child {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/** 간트 축 정렬 시 막대 아래 눈금 — 간트 눈금과 같은 자리 */
export const HistogramTickRow = styled.div`
  position: relative;
  height: 22px;
`

export const HistogramLabels = styled.div`
  display: flex;
  justify-content: center;
  /* 막대 칸과 같은 틈 — 다르면 눈금 글자가 칸 가운데서 밀린다 */
  gap: clamp(6px, 1.4%, 14px);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  span {
    flex: 1;
    min-width: 6px;
    text-align: center;
    white-space: nowrap;
  }
`

export const HistogramAxis = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 목록형 표 (인물·수치·점검) ────────────────────────────────────────────

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  th {
    text-align: left;
    font-weight: 600;
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
    padding: 6px 8px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
    white-space: nowrap;
  }
  td {
    padding: 8px;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) {
    background: ${({ theme }) => stripeFill(theme.mode)};
  }
`

export const CheckHead = styled.th`
  text-align: center !important;
`

export const CheckCell = styled.td<{ $state: 'full' | 'partial' | 'empty' | 'na' }>`
  text-align: center;
  font-weight: 700;
  color: ${({ $state, theme }) =>
    $state === 'full'
      ? theme.colors.success
      : $state === 'partial'
        ? fillColor(50, theme.mode)
        : theme.colors.text.tertiary};
  /* 흐림은 기호에만 — 칸 전체에 걸면 '채우러 가기' 링크의 강조색까지 흐려졌다 */
  span[aria-hidden] {
    opacity: ${({ $state }) => ($state === 'empty' ? 0.45 : $state === 'na' ? 0.25 : 1)};
  }
  a:hover span[aria-hidden],
  a:focus-visible span[aria-hidden] {
    opacity: 1;
  }
`

/** 점검표 빈 칸 — 그 사건 문서의 해당 섹션으로 가는 링크. 마우스를 올리면 '+'로 바뀌어 '채우기'로 읽힌다 */
export const FillLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  border-radius: 5px;
  color: inherit;
  text-decoration: none;
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:hover > span[aria-hidden],
  &:focus-visible > span[aria-hidden] {
    font-size: 0;
  }
  &:hover > span[aria-hidden]::after,
  &:focus-visible > span[aria-hidden]::after {
    content: '+';
    font-size: 14px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** 행별 채움 — 9칸 중 몇 칸 */
/** 진영 칩 — 진영 색 왼쪽 띠 + 옅은 바탕 */
export const SideChips = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const SideChip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px 2px 7px;
  border-radius: 4px;
  border-left: 3px solid ${({ $color }) => $color};
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 10%, transparent)`};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

export const SideVersus = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FillCell = styled.td`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  span {
    display: inline-block;
    vertical-align: middle;
  }
`

export const FillBar = styled.span<{ $pct: number }>`
  width: 56px;
  height: 6px;
  margin-right: 8px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => $pct}%;
    border-radius: 999px;
    /* 줄마다 신호등 색이면 18줄 중 15줄이 빨강이라 표가 경보판처럼 보였다 — 줄은 한 색 농도로,
       신호등은 위 '기록 충실도' 계기 하나에만 */
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    opacity: ${({ $pct }) => (0.45 + ($pct / 100) * 0.55).toFixed(2)};
  }
`

export const ChecklistRow = styled.tr<{ $hot: boolean; $dim?: boolean }>`
  cursor: pointer;
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  /* 강조는 표의 줄무늬(부모 선택자)보다 이겨야 한다 — 특이도를 올린다 */
  &&& {
    ${({ $hot, theme }) => ($hot ? `background: ${ledgerHoverFill(theme.mode)};` : '')}
  }
`

/** 열별 빈 칸 수 — 점검표의 결론이라 머리글에서 눈에 띄게. 절반 넘게 비면 경고색 */
export const EmptyCount = styled.span<{ $severe: boolean }>`
  display: inline-block;
  margin-top: 4px;
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $severe, theme }) => ($severe ? theme.colors.error : theme.colors.text.secondary)};
  background: ${({ $severe, theme }) =>
    $severe ? (theme.mode === 'dark' ? 'rgba(248,113,113,0.14)' : 'rgba(185,28,28,0.08)') : ledgerSubtleFill(theme.mode)};
`

/** 비어 있는 기록 묶음 — 큰 패널 둘이 '없습니다'만 말하던 자리를 한 줄로 */
export const EmptyStrip = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

// ─── 점검 신호 (배치 B) ────────────────────────────────────────────────────

/** 하위가 없는 구간 경고 — 점검 지면의 가장 큰 결론이라 간트 머리에 */
export const GapNotice = styled.div`
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.10)' : 'rgba(217,119,6,0.08)'};
  strong {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`

/** 공백 구간 빗금 — 간트 줄 뒤에 깔린다 */
export const GapHatch = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    135deg,
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.16)' : 'rgba(217,119,6,0.13)')} 0 2px,
    transparent 2px 7px
  );
`

/**
 * 상위 기간 밖 하위 — 제목 열 **왼쪽 끝의 주황 표지**(3px). 예전 '기간 전' 알약은 줄마다 40px을 먹어
 * 제목이 6자에서 잘렸다. 전·후 구분과 설명은 표지의 title(툴팁)과 범례가 든다.
 */
/** 상위 기간 밖 — 제목 뒤 작은 글자 표지(예전 줄 맨 왼쪽 주황 세로선) */
export const OutsideTag = styled.span`
  flex-shrink: 0;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 17px;
  white-space: nowrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.12)' : 'rgba(217,119,6,0.1)')};
  cursor: help;
`

/** 간트 '묶음 만들기' 켜기 */
export const RegroupToggle = styled.button<{ $active: boolean }>`
  height: 30px;
  padding: 0 12px;
  border: 1px solid ${({ $active, theme }) => ($active ? ledgerAccent(theme.mode) : theme.colors.border.light)};
  border-radius: 8px;
  background: ${({ $active, theme }) => ($active ? ledgerHoverFill(theme.mode) : 'transparent')};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ $active, theme }) => ($active ? ledgerAccent(theme.mode) : theme.colors.text.secondary)};
  cursor: pointer;
  margin-left: auto;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  & + * {
    margin-left: 0;
  }
`

/** 고르기 중 안내·묶기 막대 자리 */
export const RegroupArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

/** 고르기 상자 — 접기 칸과 같은 폭(번호 열이 줄마다 같은 자리) */
export const RowPick = styled.input`
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
`

// ─── 분포 (배치 C) ─────────────────────────────────────────────────────────

/**
 * 세부 분야 — 정렬된 가로 막대. 한 줄 = [점·이름 | 막대 | 건수·%], 줄 전체가 거르기 버튼.
 * 같은 분야 색이 여러 세부에 겹쳐도 위치(줄)가 세부를 가르므로 비율이 읽힌다.
 */
export const TypeBarList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const TypeBarRow = styled.button<{ $active: boolean; $dim: boolean }>`
  display: grid;
  /* 세부 이름은 길어야 9자 남짓 — 180px 칸이면 이름과 막대 사이가 70px 넘게 비었다 */
  grid-template-columns: minmax(96px, 136px) minmax(0, 1fr) 72px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 28px;
  padding: 2px 8px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) => ($active ? ledgerHoverFill(theme.mode) : 'transparent')};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  text-align: left;
  cursor: pointer;
  opacity: ${({ $dim }) => ($dim ? 0.4 : 1)};
  transition: opacity 0.15s;
  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

export const TypeBarName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const TypeBarTrack = styled.span`
  position: relative;
  display: block;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

export const TypeBarFill = styled.span<{ $color: string; $empty?: boolean }>`
  position: relative;
  display: block;
  height: 100%;
  min-width: ${({ $empty }) => ($empty ? 0 : 4)}px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

/** 거르기 전 전체 몫 — 걸린 몫 뒤의 점선 윤곽(시기 막대의 GhostBar와 같은 말) */
export const TypeBarGhost = styled.span`
  position: absolute;
  inset: 0 auto 0 0;
  box-sizing: border-box;
  border: 1px dashed ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 999px;
  opacity: 0.6;
`

export const TypeBarCount = styled.span`
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
`

export const ChartLegend = styled.div`
  margin-top: 8px;
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

export const LegendSwatch = styled.span<{ $tone: 'active' | 'started' | 'ghost' }>`
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  ${({ $tone, theme }) =>
    $tone === 'ghost'
      ? `border: 1px dashed ${theme.colors.text.tertiary};`
      : `background: ${ledgerAccent(theme.mode)}; opacity: ${$tone === 'active' ? 0.3 : 1};`}
`

/** 히스토그램 한 칸의 쌓음 — 높이는 전체(거르기 전) 건수, 안쪽 막대들이 그 비율로 바닥부터 찬다 */
export const HistogramStack = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`

/** 거르기 전 전체 — 걸린 몫 뒤의 점선 윤곽 */
export const GhostBar = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 1px dashed ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: none;
  border-radius: 3px 3px 0 0;
  opacity: 0.7;
`

/** 막대 위 숫자 옆 '+새로 시작' — 툴팁에만 있던 값 */
/** 진행 중 숫자 밑 둘째 줄 '새 5' — 예전 '9 +5'는 더하기로 읽혔다 */
export const HistogramStarted = styled.span`
  display: block;
  font-size: 10.5px;
  white-space: nowrap;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

/** 진행 중(옅게) 막대 안에 새로 시작(진하게)을 바닥부터 겹친다 */
export const ActiveBar = styled.div<{ $pct: number }>`
  position: relative;
  height: ${({ $pct }) => $pct}%;
  min-height: ${({ $pct }) => ($pct > 0 ? '3px' : '0')};
  border-radius: 3px 3px 0 0;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(165,180,252,0.30)' : 'rgba(79,70,229,0.22)'};
`

export const StartedBar = styled.div<{ $pct: number }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
`

/**
 * 패널 본문에 바로 놓는 안내 — GapNotice는 머리(가로 줄) 안에서 한 줄을 다 쓰려고 flex-basis 100%를
 * 갖는데, 세로로 쌓는 패널에 그대로 두면 그 값이 **높이**가 되어 상자가 패널만큼 커졌다.
 */
export const PanelNotice = styled(GapNotice)`
  flex-basis: auto;
`
