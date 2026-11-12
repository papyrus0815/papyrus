/**
 * 묶음 사건 '전개'(collection-development.tsx)의 조판 — 행·장 머리·구획 띠·목록 끝 줄.
 * 컴포넌트가 3,300줄을 넘어 조판을 떼어 냈다(동작 변경 없음).
 */
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

import * as S from '../styles'

/**
 * 목록 끝 '다음 차례' 줄 — **비어 있는 다음 행**처럼 생겼다.
 *
 * 하위 사건 행(Step)과 같은 격자(번호 28px + 본문)·같은 세로 리듬이라, 번호 자리엔 강조색 '+' 노드,
 * 제목 자리엔 '하위 사건 추가'와 몇 번째 국면이 될지가 선다. 줄 전체가 누르는 자리(hover 면)이고,
 * 이미 있는 사건을 끌어오는 '모으기'는 같은 줄 오른쪽 끝의 보조 버튼이다.
 * 위 머리카락선은 마지막 행의 아래선이 맡고, 이 줄은 점선 아래선으로 '아직 비어 있는 자리'를 말한다.
 */
export const NextStep = styled.div`
  position: relative;
  display: flex;
  /* 보조 단추가 넷(국면·즉위·묶기·모으기)이 되면서 한 줄에 다 세우면 '하위 사건 추 / 가'로 낱말이 꺾였다 —
     추가 줄이 최소 폭을 지키고, 남는 자리가 없으면 보조 단추가 다음 줄 제목 열로 내려간다 */
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  max-width: ${S.PROSE_WIDTH}px;
  /* 구획 간격(22px)을 덜어 마지막 마디에 붙인다 — 떨어져 있으면 목록 밖의 별도 버튼으로 읽힌다 */
  margin-top: -14px;

  /* 타임라인의 다음 마디 — 위 세로선에서 점선으로 이어져 '+' 노드에 닿는다(아직 비어 있는 자리) */
  &::before {
    content: '';
    position: absolute;
    left: 13px;
    top: -10px;
    height: 30px;
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  /* 좁은 지면 — 추가 줄은 한 줄을 다 쓰고, 모으기는 그 아래 제목 열에서 시작(나란히 두면 설명이 낱말 중간에 꺾였다) */
  @container eventdetail (max-width: 639px) {
    flex-wrap: wrap;
  }
`

/** 줄 오른쪽 보조 동작 묶음 — 좁은 지면에선 아래 줄 제목 열에서 시작 */
export const NextStepTools = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;

  @container eventdetail (max-width: 639px) {
    margin: -4px 0 10px 40px;
  }
`

export const AddChildRow = styled.button`
  flex: 1 1 260px;
  min-width: 0;
  display: grid;
  /* 위 마디들과 같은 노드 열(28px)·간격(12px) — '+' 노드가 세로선 위에 선다 */
  grid-template-columns: 28px minmax(0, 1fr);
  /* 노드는 제목 첫 줄에 — 설명이 둘째 줄로 내려가도 '+'가 가운데로 끌려 내려가지 않게 */
  align-items: start;
  gap: 12px;
  /* 좌우 8px 안쪽 여백만큼 바깥으로 — 번호 열·제목 열이 위 행들과 같은 x에 선다 */
  margin: 0 0 0 -8px;
  padding: 10px 8px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s;

  @container eventdetail (max-width: 639px) {
    flex-basis: 100%;
  }

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 번호 자리의 '+' — 번호(우측 정렬)와 같은 오른쪽 끝, 강조색 면 원. hover에 채워진다 */
export const NextStepNode = styled.span`
  position: relative;
  z-index: 1;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
  box-sizing: border-box;
  box-shadow: 0 0 0 4px ${({ theme }) => ledgerBackground(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition:
    background 0.14s,
    color 0.14s;

  svg {
    width: 13px;
    height: 13px;
    stroke-width: 2.5;
  }

  ${AddChildRow}:hover & {
    border-style: solid;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다(ledger 규약) */
    color: ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

export const AddChildText = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  min-width: 0;
`

/** 행 제목(15px·700)과 같은 단 — 강조색이 '아직 없는 행'임을 말한다 */
export const AddChildTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

/** 행의 날짜·분야 줄과 같은 단(12px·metaText) */
export const AddChildHint = styled.span`
  font-size: 12px;
  color: ${metaText};
  word-break: keep-all;
`

/** 보조 동작 — 이미 있는 사건을 이 묶음으로(연관 탭의 모으기). 테두리 알약, 줄 오른쪽 끝 */
export const GatherButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color 0.14s,
    border-color 0.14s;

  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

export const Empty = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: ${S.PROSE_WIDTH}px;
`

export const EmptyText = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
`

export const TextButton = styled.button`
  padding: 4px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/*
 * ───────────────────────── 타임라인 ─────────────────────────
 *
 * 연혁·단락 타임라인과 같은 문법: 왼쪽 세로선 하나에 사건마다 번호 노드가 꿰이고, 노드 옆에 **날짜 줄이 먼저**,
 * 그 아래 제목. 묶음은 노드가 둥근 사각(강조색 면)이라 '그 아래에 더 있다'를 모양으로 말하고, 그 하위는 본문
 * 열 안에서 한 단 작은 타임라인으로 이어진다. 예전엔 행 사이 머리카락선만 있는 목록이라 차례(시간)가 읽히지 않았다.
 */
export const NODE = 24
export const NESTED_NODE = 20
export const columnOf = (_depth: number) => 28
/** 세로선 x — 노드 가운데(선 2px) */
export const lineLeft = (size: number) => size / 2 - 1

/** 한 단 타임라인 — 세로선은 첫 노드 가운데에서 시작해 마지막 행 끝까지 흐른다 */
export const Steps = styled.ol`
  position: relative;
  display: flex;
  flex-direction: column;
  /* 날짜 줄이 생략·가늘어져(같은 해·같은 날은 안 쓴다) 행이 가벼워진 만큼 한 단 더 좁힌다 */
  gap: 10px;
  max-width: ${S.PROSE_WIDTH}px;
  margin: 0;
  padding: 0;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: ${lineLeft(columnOf(1))}px;
    top: ${NODE / 2}px;
    bottom: 6px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  /* 상위 기간 밖 구획 — 선을 점선으로(기간 안이 아니라는 표지) */
  &[data-phase='before']::before,
  &[data-phase='after']::before,
  &[data-phase='undated']::before {
    width: 0;
    background: none;
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

export const Step = styled.li<{ $depth: number }>`
  position: relative;
  /* 목차에서 왔을 때 sticky 구획 머리 아래로 파묻히지 않게 */
  scroll-margin-top: calc(72px + var(--development-head, 0px));
  display: grid;
  grid-template-columns: ${({ $depth }) => columnOf($depth)}px minmax(0, 1fr);
  column-gap: ${({ $depth }) => ($depth > 1 ? 10 : 12)}px;
  border-radius: ${RADIUS.SM};
  transition:
    background 0.12s,
    box-shadow 0.12s,
    opacity 0.12s;

  /* 고른 행 — 강조색 옅은 면(고르기 중에만 생긴다) */
  &[data-selected] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  /* 미리보기에서 돌아온 행 — 잠깐 강조색 면(어디까지 읽었는지) */
  &[data-highlight] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    box-shadow: 0 0 0 6px ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  /* 끄는 중인 행 — 흐리게(어디서 왔는지는 남긴다) */
  &[data-dragging] {
    opacity: 0.35;
  }

  /*
   * 놓을 자리 — 묶음 밑으로(move)는 옅은 면 + 실선, 새 묶음(group)은 점선. 테두리는 inset 그림자·outline이라
   * 레이아웃이 밀리지 않는다. 노드도 함께 강조색으로 채워 '여기에 꿰인다'를 선 위에서 말한다.
   */
  &[data-drop='move'] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    box-shadow: inset 0 0 0 2px ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-drop='group'] {
    outline: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** 노드 열 — 끌기 손잡이이기도 하다(커서 grab) */
export const NodeCol = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 6px;

  &[data-grab] {
    cursor: grab;
  }
  &[data-grab]:active {
    cursor: grabbing;
  }
`

/**
 * 노드 — 개별은 원(10px), 묶음은 둥근 사각(12px, 강조색 테두리·옅은 면). 지면색 후광이 세로선을 끊어 노드가 선 위에 꿰인 것처럼.
 * 손이 닿으면(가장 안쪽 행만) 강조색으로 차서 '잡을 수 있다'를 말한다.
 */
export const Node = styled.span<{ $collection: boolean; $depth: number }>`
  position: relative;
  z-index: 1;
  display: inline-block;
  box-sizing: border-box;
  width: ${({ $collection }) => ($collection ? 12 : 10)}px;
  height: ${({ $collection }) => ($collection ? 12 : 10)}px;
  border-radius: ${({ $collection }) => ($collection ? '4px' : '50%')};
  border: 2px solid
    ${({ theme, $collection }) =>
      $collection ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  background: ${({ theme, $collection }) =>
    $collection
      ? ledgerAccentSubtle(theme.mode)
      : ledgerBackground(theme.mode)};
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};
  user-select: none;
  transition:
    background 0.12s,
    border-color 0.12s;

  li:hover:not(:has(li:hover)) > [data-grab] > &,
  li[data-drop='move'] > div > & {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** 고르기 칸 — 노드 자리 */
export const StepCheck = styled.label`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding-top: 3px;

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${({ theme }) => ledgerAccent(theme.mode)};
    cursor: pointer;
    box-shadow: 0 0 0 4px ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

export const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 2px 0 4px;
`

/** 날짜·제목 줄 묶음 — 끌기 손잡이(노드보다 넓은 잡을 자리) */
export const Grab = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;

  &[data-grab] {
    cursor: grab;
  }
  &[data-grab]:active {
    cursor: grabbing;
  }
`

/** 날짜 줄 — 노드와 같은 높이에서 시작(연혁 날짜 줄과 같은 크기·굵기) */
export const StepPeriod = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  min-height: 18px;
  font-size: 12.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

/** 기간 밖 꼬리표 — 띠를 생략했을 때 그 몇 건에만 */
export const PeriodTag = styled.span`
  padding: 0 6px;
  border-radius: ${RADIUS.PILL};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
`

/** 해가 바뀌는 행의 연도 — 연 표지 줄을 따로 세우지 않고 날짜 줄 안에서 굵게 */
export const YearText = styled('b')`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 1년 넘는 공백 — 행 사이 한 줄. 선 위에 지면색+점선을 덮어 실선을 끊는다 */
export const QuietGap = styled.li<{ $depth: number }>`
  position: relative;
  list-style: none;
  padding: 0 0 6px ${({ $depth }) => columnOf($depth) + ($depth > 1 ? 10 : 12)}px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => lineLeft(columnOf($depth))}px;
    top: -4px;
    bottom: -4px;
    width: 2px;
    box-sizing: border-box;
    background: ${({ theme }) => ledgerBackground(theme.mode)};
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 즉위·취임 표지 — 하위 사건 행과 같은 격자, 한 단 작고 흐리게(사건이 아니라 배경 사실) */
export const AccessionStep = styled.li<{ $depth: number }>`
  position: relative;
  display: grid;
  grid-template-columns: ${({ $depth }) => columnOf($depth)}px minmax(0, 1fr);
  column-gap: ${({ $depth }) => ($depth > 1 ? 10 : 12)}px;
  list-style: none;
`

export const AccessionNode = styled.span<{ $verb: '즉위' | '취임' }>`
  position: relative;
  z-index: 1;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-sizing: border-box;
  font-size: 12px;
  line-height: 1;
  border: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};
`

export const AccessionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 1px 0 2px;
`

export const AccessionDate = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};

  span {
    font-weight: 500;
    color: ${metaText};
  }
`

export const AccessionTitle = styled.div`
  font-size: 14px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .prev {
    font-size: 12.5px;
    color: ${metaText};
  }
`

/** 전개 머리의 '하위가 다룬 기간' — 건수 뒤에 이어 쓴다 */
/** 머리 부제 — 좁은 화면에서 '37 / 건'처럼 낱말 가운데가 꺾이지 않게(꺾을 때는 띄어쓰기에서) */
/**
 * 전개 섹션 — 키보드로 옮겨 간 자리가 붙어 있는 머리(탭 줄 + 전개 머리) 밑에 가려지지 않게, 포커스가 닿는 것마다
 * 그만큼 위 여백을 둔다. 머리를 붙인 뒤 Shift+Tab으로 올라가면 40번 중 6번이 머리 밑에 가렸다(WCAG 2.4.11).
 */
export const DevelopmentSection = styled(S.Section)`
  a[href],
  button,
  input {
    scroll-margin-top: calc(56px + var(--development-head, 0px));
  }
`

/**
 * 전개 머리 — 섹션을 읽는 동안 탭 줄 아래에 붙는다(제목·건수·보기 단추). 프랑스 혁명 '전부'는 6,500px라 보기를 바꾸려면
 * 맨 위까지 올라가야 했다. 좁은 지면에선 붙이지 않는다(머리가 세 줄이라 화면을 너무 먹는다).
 * 높이는 --development-head로 섹션에 알려, 구획 띠·앵커 이동이 그 아래에 서게 한다.
 */
export const DevelopmentHeader = styled(S.SectionHeader)`
  position: sticky;
  top: 48px;
  z-index: 4;
  margin-bottom: 0;
  padding: 8px 0;
  background: ${({ theme }) => ledgerBackground(theme.mode)};

  @container eventdetail (max-width: 639px) {
    position: static;
    padding: 0;
    margin-bottom: 4px;
  }
`

export const DevelopmentSubtitle = styled(S.SectionSubtitle)`
  word-break: keep-all;
`

export const CoveredRange = styled.span`
  font-variant-numeric: tabular-nums;
  /* 좁은 화면에서 '1941년 6월 30 / 일'처럼 날짜 중간이 끊기지 않게 — 줄을 넘기면 통째로 */
  white-space: nowrap;
`

/** 제목 + 하위 펼침 — 좁으면 펼침 단추가 다음 줄로 */
export const StepHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
`

export const StepTitle = styled(Link)<{ $nested?: boolean }>`
  font-size: ${({ $nested }) => ($nested ? 14 : 15.5)}px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`




/**
 * 행 도구(개별|묶음) — 날짜 줄 오른쪽 끝에 겹쳐 뜬다. 가장 안쪽 행에 손이 닿을 때만(손자에 닿으면 부모도
 * :hover라 겹겹이 떴다). 흐름 밖이라 숨어 있어도 줄을 만들지 않는다.
 */
export const StepTools = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  position: absolute;
  top: -2px;
  right: 0;
  z-index: 2;
  padding-left: 8px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s;

  li:hover:not(:has(li:hover)) > div > div > &,
  div:focus-within > &,
  &:has([aria-expanded='true']) {
    opacity: 1;
    pointer-events: auto;
  }

  /* 터치 환경 — 손이 닿는 순간이 없으니 '⋯' 하나는 늘 보인다(예전 '개별 | 묶음' 두 칸 줄과 달리 행을 늘리지 않는다) */
  @media (hover: none) {
    opacity: 1;
    pointer-events: auto;
  }
`

/** 놓을 자리의 결과 한 줄 — '‘7월 위기’ 밑으로 옮기기' */
export const DropLabel = styled.span`
  align-self: flex-start;
  margin-top: 2px;
  padding: 1px 8px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
`

/*
 * '찾으면 펼쳐지는 숨김' — React 19 타입이 hidden을 boolean으로만 알아 ref로 단다. 지원하지 않는 브라우저는
 * 그냥 hidden(display:none)으로 읽어 지금처럼 숨기기만 한다.
 */
export const markUntilFound = (element: HTMLElement | null) => {
  element?.setAttribute('hidden', 'until-found')
}
export const clearUntilFound = (element: HTMLElement | null) => {
  element?.removeAttribute('hidden')
}

/**
 * 접은 국면의 행 덩어리 — 지원 브라우저에선 숨긴 상자(높이 0)가 남아 목록 간격 한 칸을 먹으므로 그만큼 당긴다.
 * 미지원 브라우저는 display:none이라 여백이 생기지 않는다.
 */
export const FoldedRun = styled.li<{ $depth: number }>`
  list-style: none;
  margin-top: ${({ $depth }) => ($depth > 1 ? -8 : -10)}px;
`

export const FoldedList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`

/** 묶음의 하위 — 본문 열 안에서 한 단 작은 타임라인 */
export const NestedSteps = styled.ol<{ $depth: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0 2px;

  /* 접힌 묶음(찾으면 펼쳐지는 숨김) — 높이 0 상자에 여백까지 남지 않게 */
  &[hidden] {
    margin: 0;
  }
  padding: 0;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => lineLeft(columnOf($depth))}px;
    top: ${NESTED_NODE / 2}px;
    bottom: 10px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 끄는 동안 지면 위쪽에 붙는 띠 — 여기 놓으면 이 사건 바로 밑(묶음에서 꺼내기) */
export const RootDrop = styled.div`
  position: sticky;
  top: calc(64px + var(--development-head, 0px));
  z-index: 6;
  max-width: ${S.PROSE_WIDTH}px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 6px 18px rgba(0, 0, 0, 0.45)' : '0 6px 18px rgba(15, 23, 42, 0.08)'};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;

  &[data-active] {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-disabled] {
    opacity: 0.6;
  }
`

/** 끌기 미리보기 칩 — 화면 밖에 두고 setDragImage로만 쓴다(커서 옆에 제목 한 줄) */
export const DragPreview = styled.div`
  position: fixed;
  top: -200px;
  left: -2000px;
  max-width: 320px;
  padding: 6px 12px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`

/** 개별 위에 놓아 새 묶음 — 이름을 받는 줄(놓인 사건 아래) */
export const GroupPromptForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

export const GroupPromptText = styled.span`
  flex-basis: 100%;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const GroupPromptInput = styled.input`
  flex: 1 1 180px;
  min-width: 0;
  padding: 6px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const GroupPromptSubmit = styled.button`
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }
`

export const GroupPromptCancel = styled.button`
  padding: 6px 4px;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  cursor: pointer;
`

export const TruncatedNote = styled.p`
  margin: -8px 0 0;
  font-size: 12.5px;
  color: ${metaText};
`

export const Phases = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: ${S.PROSE_WIDTH}px;
`

/**
 * 구획 — 상위 기간에 비춘 '시작 이전 · 기간 중 · 끝난 뒤 · 날짜 미상'. 구획마다 머리 줄(표지 + 이름 + 기준 시점 +
 * 건수)과 위 경계선으로 갈라, 타임라인이 구획마다 끊겼다 다시 시작한다. **기간 밖(이전·이후) 구획은 세로선을
 * 점선으로** — 상위 사건의 기간 바깥이라는 것을 선 모양이 말한다(예전엔 작은 라벨 하나라 구획이 안 갈렸다).
 */
/**
 * 구획 — 상위 기간에 비춘 '시작 이전 · 기간 중 · 끝난 뒤 · 날짜 미상'. 구획마다 **면이 있는 머리 띠**로 갈라
 * (기간 중 = 강조색 옅은 면, 기간 밖 = 점선 테두리), 스크롤하는 동안 탭 아래에 붙어 지금 어느 구획을 읽는지
 * 늘 보인다. 기간 밖 구획은 세로선도 점선이다. 예전엔 작은 라벨 + 머리카락선뿐이라 구획이 안 갈렸다.
 */
export const PhaseGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;

  & + & {
    margin-top: 14px;
  }
`

/**
 * 장(국면) 머리 — 면 없는 목차 줄. 예전엔 옅은 강조색 카드 + 번호 칸 + 설명 3줄이라, 사건 1건짜리 국면은
 * 사건보다 장 머리가 더 컸고 하위 묶음 안에서도 같은 카드가 또 섰다(한 화면에 카드 6개).
 * - 직계(depth 1): 위 줄 작은 표지(N국면 · 기간 · 건수) + 아래 줄 이름 + 설명 2줄. 노드 자리엔 강조색 막대.
 * - 펼친 하위 묶음 안: 한 줄 구분선 'N국면 이름 · N건'. 노드 자리엔 짧은 가로 눈금.
 */
export const ChapterHead = styled.li<{ $depth: number; $inline: boolean }>`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: ${({ $depth }) => columnOf($depth)}px minmax(0, 1fr);
  column-gap: ${({ $depth }) => ($depth > 1 ? 10 : 12)}px;
  align-items: ${({ $inline }) => ($inline ? 'center' : 'start')};
  margin: ${({ $depth, $inline }) =>
    $depth > 1 ? '6px 0 -2px' : $inline ? '10px 0 -2px' : '14px 0 0'};
  padding: ${({ $inline }) => ($inline ? '0' : '2px 0')};
  list-style: none;
  border-radius: 8px;

  &:first-child {
    margin-top: 0;
  }

  &[data-drop-chapter] {
    box-shadow: inset 0 0 0 2px ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

/** 노드 자리 표지 — 직계는 세로 막대(장의 시작), 하위 묶음 안은 짧은 가로 눈금. 국면 밖은 회색 */
export const ChapterMark = styled.span<{ $inline: boolean }>`
  justify-self: center;
  display: block;
  width: ${({ $inline }) => ($inline ? 10 : 4)}px;
  height: ${({ $inline }) => ($inline ? 2 : 34)}px;
  margin-top: ${({ $inline }) => ($inline ? 0 : 2)}px;
  border-radius: 2px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  /* 세로선 위에 떠 있게 — 지면색 테두리로 선을 끊는다 */
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};

  [data-outside] > & {
    background: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const ChapterText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  &[data-inline] {
    flex-direction: row;
  }
`

export const ChapterKicker = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  b {
    font-weight: 800;
    letter-spacing: 0.02em;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  [data-outside] & b {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* 하위 묶음 안 한 줄 — 줄바꿈 없이, 넘치는 이름만 말줄임 */
  [data-inline] > & {
    flex-wrap: nowrap;
    min-width: 0;
    white-space: nowrap;
  }

  /*
   * 좁은 지면 — 이름이 첫 줄을 다 쓰고 기간·건수·'+ 이 국면에 사건'은 둘째 줄로.
   * 한 줄에 다 세우면 390px에서 이름이 '독..'까지 잘렸다.
   */
  @container eventdetail (max-width: 639px) {
    [data-inline] > & {
      flex-wrap: wrap;
    }
  }
`

export const ChapterFold = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: -2px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')};
  }
`

/** 접힌 묶음의 국면 차례 — 제목 아래 작은 한 줄 */
export const ChapterSummary = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: left;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/** 일부만 접힌 상태 — 보기 단추 앞 흐린 글자 */
export const PartialFold = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

/** 펼침 단계 — 고른 단계는 굵게 */
export const FoldLevels = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;

  [data-active] {
    font-weight: 800;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const ChapterAdd = styled.button`
  margin-left: auto;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
  /* 장 머리에 손이 닿을 때만 — 늘 서 있으면 국면마다 강조색 글자가 하나씩 더 붙었다 */
  opacity: 0;

  li:hover > div > span > &,
  li:focus-within > div > span > &,
  li[data-empty] > div > span > & {
    opacity: 0.8;
  }
  &:hover,
  &:focus-visible {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  @media (hover: none) {
    opacity: 0.8;
  }

  /*
   * 한 줄 머리(하위 묶음 안)에선 줄 흐름 밖에 — 투명한 채로 84px를 차지해, '국면만' 보기에서 오른쪽이 비어 있는데도
   * 국면 이름 20개 중 10개가 '삼부회에서 국민의회로 — 제3신분…'처럼 잘렸다. 손이 닿을 때만 줄 끝 위에 겹쳐 선다.
   * 빈 국면('아직 없음' 옆에 늘 서 있음)과 좁은 지면(둘째 줄에 자리가 있음)은 그대로 줄 안에.
   */
  @container eventdetail (min-width: 640px) {
    li:not([data-empty]) > [data-inline] > span > & {
      position: absolute;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      padding-left: 12px;
      background: ${({ theme }) => ledgerBackground(theme.mode)};
    }
  }
`

/** 국면 설명 — 직계 장 머리 아래 두 줄까지 */
export const ChapterDescription = styled.p`
  margin: 2px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 국면 이름 — 직계는 사건 제목보다 한 단 크게, 하위 묶음 안은 표지 줄 안의 한 토막(넘치면 말줄임) */
export const ChapterTitle = styled.span<{ $inline: boolean }>`
  font-size: ${({ $inline }) => ($inline ? 12.5 : 16)}px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: ${({ theme, $inline }) =>
    $inline ? theme.colors.text.secondary : theme.colors.text.primary};
  overflow-wrap: anywhere;

  ${({ $inline }) =>
    $inline
      ? `
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `
      : ''}

  [data-outside] & {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /*
   * 좁은 지면 — 이름이 첫 줄을 다 쓰고 기간·건수는 둘째 줄로. 예전엔 표지 줄의 ':nth-child(3)'을 키웠는데,
   * 이름이 없는 줄('국면 사이')·접기 단추가 없는 빈 국면에선 그 자리가 건수라 '2건'만 다음 줄로 떨어졌다.
   */
  @container eventdetail (max-width: 639px) {
    [data-inline] & {
      flex: 1 1 calc(100% - 72px);
      /* 첫 줄을 혼자 쓰는데도 말줄임이면 390px에서 20개 중 8개가 잘렸다 — 줄을 바꾼다 */
      white-space: normal;
      word-break: keep-all;
    }
  }
`

/** 머리 부제의 한 토막 — 좁으면 토막째 다음 줄로('그 아래까지 / 39건'처럼 숫자 앞에서 꺾이지 않게) */
export const NoBreak = styled.span`
  white-space: nowrap;
`

/**
 * 구획 머리 — 국면 머리와 같은 목차 줄(면·테두리 상자 없이). 탭 아래에 붙어(sticky) 지금 어느 구획인지
 * 남기므로 바탕만 지면색으로 불투명하게, 아래 머리카락선 하나로 행과 가른다.
 */
export const PhaseHead = styled.h3`
  position: sticky;
  /* 탭 줄(sticky top 0)과 붙어 있는 전개 머리(--development-head) 바로 아래 */
  top: calc(48px + var(--development-head, 0px));
  z-index: 3;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

/** 구획 표지 — 노드 열 자리(세로선 위). 기간 중은 강조색으로 찬 사각, 기간 밖은 테두리만, 날짜 미상은 회색 */
export const PhaseMark = styled.span`
  display: inline-block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin: 0 0 0 ${(28 - 12) / 2}px;
  border-radius: 3px;
  border: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: transparent;

  [data-phase='during'] > h3 > & {
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  [data-phase='undated'] > h3 > & {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const PhaseLabel = styled.span`
  margin-left: 6px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};

  [data-phase='during'] > h3 > & {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** 기준 시점 — '1914년 7월 28일 이전' */
export const PhaseRange = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const PhaseCount = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`
