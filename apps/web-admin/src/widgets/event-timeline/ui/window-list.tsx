/**
 * 연표 리스트 — 창 안 모든 사건의 이름 정본.
 * FSD: widgets/event-timeline/ui
 *
 * v3의 우측 '사건 레일'(보조 지면)을 본문으로 승격했다. 소속은 시작 시점 기준이라
 * 내비게이터 버킷 숫자와 행 수가 항상 일치한다. 행 클릭 = 기존 상세 드로어.
 *
 * 성능·키보드(검토 R7·R8)
 *  - 행은 React.memo — hover·roving 변화 시 영향받은 행만 재렌더(전체 창 = 전 사건).
 *  - 자기 hover는 CSS `:hover`, `$hovered`는 **밴드↔리스트 교차 강조** 전용.
 *  - 리스트 전체가 탭 정지점 하나(roving) — ↑/↓/Home/End로 행 이동.
 *    v3의 '탭 정지점 폭증'(LIST 3차 검토가 고친 결함)을 재도입하지 않는다.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react'

import styled, { css, keyframes } from 'styled-components'

import { formatYearLabel, parseIsoDateParts } from '@/shared/lib/iso-date'

import { resolveCategory } from '../../../pages/events/ledger/styles/ledger-tokens'
import { BRAND, MOTION } from '../../../pages/events/styles/theme'
import type {
  ListGroup,
  TimelinePoint,
  TimelineWindow,
} from '../model/timeline-model'

interface WindowListProps {
  groups: ListGroup[]
  window: TimelineWindow | null
  selectedEventId: string | null
  hoveredEventId: string | null
  onHoverEvent: (id: string | null) => void
  onSelectEvent: (id: string) => void
  /** 내비게이터 연도 클릭으로 강조 중인 그룹 key (`y1874` 형태) */
  flashGroupKey: string | null
  /**
   * 그룹 key → '이전 세기부터 계속' 건수(검토 R9) — 전체 단계 전용.
   * 여러 세기 걸침 대형 사건의 존재감을 헤더 라인으로 되살린다.
   */
  continuingCounts?: ReadonlyMap<string, number> | null
}

/** 연도를 짧게 — 행 leading 셀용. BC는 'BC 44'. */
const shortYear = (year: number): string =>
  year > 0 ? `${year}` : `BC ${-year}`

/** 10년 창의 행 leading 셀 — 정밀도가 허락하는 만큼만 월·일 표시. */
const monthDayLabel = (point: TimelinePoint): string | null => {
  if (!point.startDate) return null
  if (point.startPrecision !== 'month' && point.startPrecision !== 'day') {
    return null
  }
  const parts = parseIsoDateParts(point.startDate)
  if (!parts) return null
  return point.startPrecision === 'month'
    ? `${parts.month}월`
    : `${parts.month}월 ${parts.day}일`
}

const leadingCell = (
  point: TimelinePoint,
  currentWindow: TimelineWindow | null,
): string => {
  if (currentWindow?.level === 'unknown' || point.startYearInt === null) {
    return '미상'
  }
  if (currentWindow?.level === 'span10') {
    // 연도는 그룹 헤더가 이미 말했다 — 월·일이 있으면 그것만.
    return monthDayLabel(point) ?? '—'
  }
  return shortYear(point.startYearInt)
}

const durationCell = (point: TimelinePoint): string | null => {
  if (
    point.startYearInt === null ||
    point.endYearInt === null ||
    point.endYearInt === point.startYearInt
  ) {
    return null
  }
  return `${shortYear(point.startYearInt)}–${shortYear(point.endYearInt)}`
}

/* ── 행 — React.memo. hover·roving이 바뀌어도 영향받은 행만 다시 그린다. ── */

interface TimelineListRowProps {
  point: TimelinePoint
  window: TimelineWindow | null
  isActive: boolean
  isHovered: boolean
  /**
   * 부모 행이 같은 그룹에 있는가 — 트리 문맥 복원(W2).
   * 있으면 인접 복원(들여쓰기+↳)이 문맥을 대신하고, 없을 때만
   * '↳ {부모제목}' 프리픽스로 누구의 하위인지 밝힌다.
   */
  parentInGroup: boolean
  /**
   * leading 열 접기(검토 R25) — 10년 창에서 그룹 내 월·일 보유 행이 0이면
   * '—'만 반복되는 52px 열을 통째로 접는다(그룹 단위로 계산해 내려온다).
   */
  hideLeading: boolean
  tabIndex: 0 | -1
  onSelectEvent: (id: string) => void
  onHoverEvent: (id: string | null) => void
  onFocusRow: (id: string) => void
}

const TimelineListRow = React.memo(function TimelineListRow({
  point,
  window: currentWindow,
  isActive,
  isHovered,
  parentInGroup,
  hideLeading,
  tabIndex,
  onSelectEvent,
  onHoverEvent,
  onFocusRow,
}: TimelineListRowProps) {
  const duration = durationCell(point)
  const parentContextTitle = point.parentTitle ?? '상위 사건'
  const importanceChip =
    point.importance === 'critical'
      ? '핵심'
      : point.importance === 'major'
        ? '주요'
        : null
  const leading = leadingCell(point, currentWindow)
  return (
    <EventRow
      type="button"
      data-tl-row
      data-tl-event={point.id}
      tabIndex={tabIndex}
      $active={isActive}
      $hovered={isHovered}
      $noLeading={hideLeading}
      aria-current={isActive ? 'true' : undefined}
      onClick={() => onSelectEvent(point.id)}
      onMouseEnter={() => onHoverEvent(point.id)}
      onMouseLeave={() => onHoverEvent(null)}
      onFocus={() => onFocusRow(point.id)}
    >
      {!hideLeading && (
        /* '—' 자리 표시는 SR에 '대시' 노이즈만 낸다(검토 R25) — 숨긴다 */
        <RowLeading aria-hidden={leading === '—' ? 'true' : undefined}>
          {leading}
        </RowLeading>
      )}
      <RowDot
        style={{ background: resolveCategory(point.category).color }}
        title={point.category}
        aria-hidden="true"
      />
      <RowTitle
        $critical={point.importance === 'critical'}
        style={
          point.depth > 0
            ? { paddingLeft: `${Math.min(3, point.depth) * 14}px` }
            : undefined
        }
      >
        {point.depth > 0 && (
          <>
            {/* 스크린리더는 글리프 대신 '○○의 하위 사건'을 읽는다 */}
            <ChildMark aria-hidden="true">↳</ChildMark>
            <SrOnly>{`${parentContextTitle}의 하위 사건`}</SrOnly>
            {!parentInGroup && (
              <>
                <ParentContext aria-hidden="true">
                  {parentContextTitle}
                </ParentContext>
                {/* 부모 문맥(12px tertiary)과 제목(13px primary)이 구분자 없이
                    한 문장처럼 붙어 읽히던 문제 — 경계 글리프로 끊는다. */}
                <ContextDivider aria-hidden="true">›</ContextDivider>
              </>
            )}
          </>
        )}
        {/* 컨테이너(inline-flex)의 ellipsis는 익명 flex item인 맨몸 텍스트에 안 먹는다
            — 전용 span으로 감싸야 긴 제목이 하드 클리핑 대신 말줄임된다. */}
        <TitleText>{point.title}</TitleText>
        {/* 카테고리는 색 점(aria-hidden)만으로는 SR에 전달되지 않는다(검토 R32) */}
        <SrOnly>{`· ${point.category}`}</SrOnly>
        {importanceChip && (
          <ImportanceChip $critical={point.importance === 'critical'}>
            {importanceChip}
          </ImportanceChip>
        )}
      </RowTitle>
      {duration && <RowDuration>{duration}</RowDuration>}
    </EventRow>
  )
})

export const WindowList: React.FC<WindowListProps> = ({
  groups,
  window: currentWindow,
  selectedEventId,
  hoveredEventId,
  onHoverEvent,
  onSelectEvent,
  flashGroupKey,
  continuingCounts,
}) => {
  /**
   * ── roving tabindex — 리스트 전체가 탭 정지점 하나(검토 R8) ────────────
   * 시작 정지점은 마지막 포커스 행 → 선택 행 → 첫 행 순. 창이 바뀌어 이전
   * 행이 사라지면 멤버십 검사로 자연 폴백한다(내비게이터와 같은 패턴).
   */
  const [rowFocusId, setRowFocusId] = useState<string | null>(null)
  const rowIds = useMemo(
    () => groups.flatMap((group) => group.points.map((point) => point.id)),
    [groups],
  )
  const rowIdSet = useMemo(() => new Set(rowIds), [rowIds])
  const rovingRowId =
    rowFocusId !== null && rowIdSet.has(rowFocusId)
      ? rowFocusId
      : selectedEventId !== null && rowIdSet.has(selectedEventId)
        ? selectedEventId
        : (rowIds[0] ?? null)

  const listRef = useRef<HTMLDivElement | null>(null)
  const handleListKeyDown = useCallback(
    (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        keyEvent.key !== 'ArrowDown' &&
        keyEvent.key !== 'ArrowUp' &&
        keyEvent.key !== 'Home' &&
        keyEvent.key !== 'End'
      ) {
        return
      }
      if (rowIds.length === 0) return
      keyEvent.preventDefault()
      const currentIndex = rovingRowId ? rowIds.indexOf(rovingRowId) : 0
      const nextIndex =
        keyEvent.key === 'Home'
          ? 0
          : keyEvent.key === 'End'
            ? rowIds.length - 1
            : Math.max(
                0,
                Math.min(
                  rowIds.length - 1,
                  currentIndex + (keyEvent.key === 'ArrowDown' ? 1 : -1),
                ),
              )
      setRowFocusId(rowIds[nextIndex])
      const rows =
        listRef.current?.querySelectorAll<HTMLButtonElement>('[data-tl-row]')
      rows?.[nextIndex]?.focus()
    },
    [rowIds, rovingRowId],
  )
  const handleFocusRow = useCallback((id: string) => setRowFocusId(id), [])

  return (
    <ListWrap ref={listRef} onKeyDown={handleListKeyDown}>
      {groups.map((group) => {
        const continuing = continuingCounts?.get(group.key) ?? 0
        /**
         * leading 열 접기(검토 R25) — 10년 창에서 연 정밀도뿐인 그룹은 leading이
         * '—'만 반복돼 52px 낭비 + SR '대시' 노이즈였다. 월·일 보유 행이 하나도
         * 없으면 그룹 단위로 열을 접는다(연도는 그룹 헤더가 이미 말했다).
         */
        const hideLeading =
          currentWindow?.level === 'span10' &&
          !group.points.some((groupPoint) => monthDayLabel(groupPoint) !== null)
        return (
          <GroupSection
            key={group.key}
            id={`tl-group-${group.key}`}
            aria-label={`${group.label} · ${group.points.length}건`}
            $flash={flashGroupKey === group.key}
          >
            <GroupHeader>
              <GroupLabel>{group.label}</GroupLabel>
              <GroupCount>{group.points.length}건</GroupCount>
              {continuing > 0 && (
                <GroupContinuing>
                  이전 세기부터 계속 {continuing}건
                </GroupContinuing>
              )}
            </GroupHeader>
            <GroupRows>
              {(() => {
                const groupIdSet = new Set(
                  group.points.map((groupPoint) => groupPoint.id),
                )
                return group.points.map((point) => (
                  <TimelineListRow
                    key={point.id}
                    point={point}
                    window={currentWindow}
                    isActive={point.id === selectedEventId}
                    isHovered={point.id === hoveredEventId}
                    parentInGroup={
                      point.parentId !== null && groupIdSet.has(point.parentId)
                    }
                    hideLeading={hideLeading}
                    tabIndex={point.id === rovingRowId ? 0 : -1}
                    onSelectEvent={onSelectEvent}
                    onHoverEvent={onHoverEvent}
                    onFocusRow={handleFocusRow}
                  />
                ))
              })()}
            </GroupRows>
          </GroupSection>
        )
      })}
    </ListWrap>
  )
}

/* ───────────────────────────── styles ───────────────────────────── */

const ListWrap = styled.div`
  display: flex;
  flex-direction: column;
  padding: 4px 0 12px;
`

const flashPulse = keyframes`
  0% { background: ${BRAND.primaryFill}; }
  100% { background: transparent; }
`

const GroupSection = styled.section<{ $flash: boolean }>`
  /* sticky 헤더가 없는 스크롤 컨테이너 — 96px는 v3 잔재로, 연도 점프가 96px
     아래에서 멈춰 보였다(검토 R29). 시각 여백만큼만 남긴다. */
  scroll-margin-top: 8px;

  ${({ $flash }) =>
    $flash &&
    css`
      animation: ${flashPulse} 1.1s ease-out 1;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}
`

const GroupHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 14px 5px;
`

const GroupLabel = styled.h4`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const GroupCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

/** '이전 세기부터 계속 N건'(검토 R9) — 데이터 텍스트라 secondary(R12 규약) */
const GroupContinuing = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;

  &::before {
    content: '·';
    margin-right: 8px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const GroupRows = styled.div`
  display: flex;
  flex-direction: column;
`

const EventRow = styled.button<{
  $active: boolean
  $hovered: boolean
  $noLeading: boolean
}>`
  display: grid;
  grid-template-columns: ${({ $noLeading }) =>
    $noLeading ? '8px minmax(0, 1fr) auto' : '52px 8px minmax(0, 1fr) auto'};
  align-items: center;
  column-gap: 10px;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  padding: 6px 14px;
  cursor: pointer;
  transition: background ${MOTION.fast};

  & + & {
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(20,19,34,0.05)'};
  }

  /* 자기 hover는 CSS로 — React 상태를 거치지 않는다(검토 R7) */
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(20,19,34,0.04)'};
  }

  /* $hovered = 밴드 막대 hover의 교차 강조 전용 */
  ${({ $hovered, theme }) =>
    $hovered &&
    css`
      background: ${theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(20,19,34,0.04)'};
    `}

  ${({ $active }) =>
    $active &&
    css`
      background: ${BRAND.primarySoft};
      box-shadow: inset 2px 0 0 ${BRAND.primary};
    `}

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: -2px;
  }
`

const RowLeading = styled.span`
  font-size: 11px;
  font-weight: 600;
  /* 데이터 텍스트는 secondary — tertiary는 4.5:1 미달(검토 R12) */
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const RowDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
`

const RowTitle = styled.span<{ $critical: boolean }>`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: ${({ $critical }) => ($critical ? 700 : 500)};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/**
 * 제목 텍스트 전용 셀 — RowTitle(inline-flex) 안에서 스스로 줄어들며 말줄임한다.
 * 칩·프리픽스(flex: none)는 그대로 두고 제목만 남은 폭을 차지한다.
 */
const TitleText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ChildMark = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  flex: none;
`

/**
 * 부모 문맥 프리픽스(W2) — 부모 행이 같은 그룹에 없을 때만 표시.
 * 제목이 밀리지 않게 축소 가능(flex-shrink) + 자체 말줄임.
 */
const ParentContext = styled.span`
  flex: 0 1 auto;
  min-width: 32px;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 부모 문맥 ↔ 제목 경계 글리프 — 별도 span이라 문맥 말줄임에 잘리지 않는다. */
const ContextDivider = styled.span`
  flex: none;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 시각적으로 숨기되 보조기술엔 노출 — 표준 sr-only 패턴(select-modal과 동일). */
const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const ImportanceChip = styled.span<{ $critical: boolean }>`
  flex: none;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 999px;
  border: 1px solid
    ${({ $critical, theme }) =>
      $critical
        ? theme.mode === 'dark'
          ? 'rgba(248,113,113,0.5)'
          : 'rgba(185,28,28,0.4)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(20,19,34,0.2)'};
  color: ${({ $critical, theme }) =>
    $critical
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : theme.colors.text.secondary};
`

const RowDuration = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`
