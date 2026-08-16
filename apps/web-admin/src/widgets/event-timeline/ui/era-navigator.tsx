/**
 * 시대 내비게이터 — 타임라인 v4의 유일한 시간 축 조작면.
 * FSD: widgets/event-timeline/ui
 *
 * 현재 창의 **하위 버킷**을 화면 폭 균등 분할 히스토그램으로 그린다.
 *  - 전체       → 사건이 있는 세기 (빈 세기 연속 구간은 슬림 공백 표지로 압축)
 *  - 세기 창    → 10년 구간 10개 고정 (0건 포함 — 공백이 곧 정보)
 *  - 10년 창    → 연도 10개 고정. 클릭은 드릴이 아니라 리스트의 그 연도로 스크롤
 *  - 미상 창    → 세기 개요를 그대로 두어 시간으로 복귀할 길을 유지
 *
 * 키보드: 버킷 행은 roving(←/→), Enter/Space 활성화, Backspace/Esc 상위 창.
 * 색은 카테고리 스택(범례와 동일 색) — 미니맵의 검증된 표현을 조작면으로 승격했다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import styled, { css } from 'styled-components'

import { getCentury, stepCentury } from '@/shared/lib/iso-date'

import { resolveCategory } from '../../../pages/events/ledger/styles/ledger-tokens'
import { BRAND, MOTION } from '../../../pages/events/styles/theme'
import {
  centuryGapCount,
  centuryOverview,
  describeWindow,
  formatSpan10Label,
  parentWindow,
  pointsStartingInWindow,
  shortBucketLabel,
  span10BucketsOf,
  stepSpan10Start,
  yearBucketsOf,
  type CategoryStack,
  type TimelinePoint,
  type TimelineWindow,
} from '../model/timeline-model'

interface EraNavigatorProps {
  points: readonly TimelinePoint[]
  window: TimelineWindow | null
  onWindowChange: (next: TimelineWindow | null) => void
  /** 10년 창에서 연도 버킷 클릭 — 리스트의 그 연도 그룹으로 스크롤 */
  onYearSelect: (year: number) => void
  /** 집중(넓게) 보기 — 히스토그램 높이를 압축 */
  condensed: boolean
}

/** 내비게이터에 그릴 셀 — 버킷 또는 공백 표지 */
type NavigatorCell =
  | {
      kind: 'bucket'
      key: string
      label: string
      fullLabel: string
      stack: CategoryStack
      /** 클릭 동작 없음(0건 연도 버킷 등)이면 disabled */
      onActivate: (() => void) | null
    }
  | { kind: 'gap'; key: string; fullLabel: string }

const EraNavigatorComponent: React.FC<EraNavigatorProps> = ({
  points,
  window: currentWindow,
  onWindowChange,
  onYearSelect,
  condensed,
}) => {
  const overview = useMemo(() => centuryOverview(points), [points])

  /**
   * ── 창 전환 후 포커스 복원(검토 R2) ────────────────────────────────────
   * 드릴·브레드크럼·스텝·Backspace는 방금 포커스했던 버튼을 언마운트/disabled로
   * 만들어 포커스가 body로 유실됐다(WCAG 2.4.3) — Tab이 문서 처음부터 재시작.
   * **내비게이터 내부에서 발화한** 창 전환만 플래그로 표시하고, 새 셀 렌더 후
   * 첫 활성 버킷(빈 창이면 브레드크럼)으로 프로그램 포커스를 되돌린다.
   * 페이지 주도 변경(창밖 배너·뒤로가기)은 플래그가 없어 포커스를 훔치지 않는다.
   */
  const wrapRef = useRef<HTMLElement | null>(null)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const pendingRefocusRef = useRef(false)
  const changeWindowFocused = useCallback(
    (next: TimelineWindow | null) => {
      pendingRefocusRef.current = true
      onWindowChange(next)
    },
    [onWindowChange],
  )
  useEffect(() => {
    if (!pendingRefocusRef.current) return
    pendingRefocusRef.current = false
    /**
     * 실제로 유실됐을 때만 복원 — ‹› 스텝(중간 구간)·미상 칩처럼 트리거 버튼이
     * 계속 마운트·활성인 경우 포커스는 살아 있고, 그때 첫 버킷으로 옮기면
     * 연타 중인 버튼을 뺏는 역효과가 난다.
     */
    const active = document.activeElement
    if (
      active &&
      active !== document.body &&
      wrapRef.current?.contains(active)
    ) {
      return
    }
    const bucket = rowRef.current?.querySelector<HTMLButtonElement>(
      '[data-nav-bucket]',
    )
    const crumb = wrapRef.current?.querySelector<HTMLButtonElement>(
      '[data-nav-crumb]:enabled',
    )
    ;(bucket ?? crumb)?.focus({ preventScroll: true })
  }, [currentWindow])

  /** 현재 창의 하위 버킷 셀 목록 */
  const cells = useMemo<NavigatorCell[]>(() => {
    // 전체·미상 → 세기 개요 (미상 창에서도 시간 복귀 경로를 유지)
    if (!currentWindow || currentWindow.level === 'unknown') {
      const out: NavigatorCell[] = []
      overview.buckets.forEach((bucket, index) => {
        const prev = overview.buckets[index - 1]
        if (prev) {
          const gap = centuryGapCount(prev.century, bucket.century)
          if (gap > 0) {
            out.push({
              kind: 'gap',
              key: `gap-${prev.century}`,
              fullLabel: `기록 없는 ${gap}개 세기`,
            })
          }
        }
        out.push({
          kind: 'bucket',
          key: `c${bucket.century}`,
          label: shortBucketLabel(null, bucket.century),
          // 동작 문구 병기(검토 R22) — 같은 모양 버킷이 단계별로 다른 동작(드릴
          // vs 리스트 스크롤)인데 단서가 컨테이너 aria-label뿐이었다.
          fullLabel: `${describeWindow({ level: 'century', century: bucket.century })} · ${bucket.count}건 · 들어가기`,
          stack: bucket,
          onActivate: () =>
            changeWindowFocused({ level: 'century', century: bucket.century }),
        })
      })
      return out
    }

    if (currentWindow.level === 'century') {
      return span10BucketsOf(points, currentWindow.century).map((bucket) => ({
        kind: 'bucket',
        key: `d${bucket.startYear}`,
        label: shortBucketLabel(currentWindow, bucket.startYear),
        fullLabel: `${formatSpan10Label(bucket.startYear)} · ${bucket.count}건${bucket.count > 0 ? ' · 들어가기' : ''}`,
        stack: bucket,
        onActivate:
          bucket.count > 0
            ? () =>
                changeWindowFocused({
                  level: 'span10',
                  startYear: bucket.startYear,
                })
            : null,
      }))
    }

    // 10년 창 — 연도 버킷. 클릭은 드릴이 아니라 리스트 스크롤(동작 문구로 구분, R22).
    return yearBucketsOf(points, currentWindow.startYear).map((bucket) => ({
      kind: 'bucket',
      key: `y${bucket.year}`,
      label: shortBucketLabel(currentWindow, bucket.year),
      fullLabel: `${bucket.year > 0 ? `${bucket.year}년` : `기원전 ${-bucket.year}년`} · ${bucket.count}건${bucket.count > 0 ? ' · 목록으로 이동' : ''}`,
      stack: bucket,
      onActivate: bucket.count > 0 ? () => onYearSelect(bucket.year) : null,
    }))
  }, [currentWindow, overview.buckets, points, changeWindowFocused, onYearSelect])

  const maxCount = useMemo(
    () =>
      Math.max(
        1,
        ...cells.map((cell) => (cell.kind === 'bucket' ? cell.stack.count : 0)),
      ),
    [cells],
  )

  /** 데이터가 있는 세기 범위 — ‹ › 스텝의 클램프 경계 */
  const centuryBounds = useMemo(() => {
    if (overview.buckets.length === 0) return null
    return {
      min: overview.buckets[0].century,
      max: overview.buckets[overview.buckets.length - 1].century,
    }
  }, [overview.buckets])

  const stepWindow = useCallback(
    (delta: 1 | -1) => {
      if (!currentWindow || !centuryBounds) return
      if (currentWindow.level === 'century') {
        const next = stepCentury(currentWindow.century, delta)
        if (next < centuryBounds.min || next > centuryBounds.max) return
        changeWindowFocused({ level: 'century', century: next })
        return
      }
      if (currentWindow.level === 'span10') {
        const next = stepSpan10Start(currentWindow.startYear, delta)
        changeWindowFocused({ level: 'span10', startYear: next })
      }
    },
    [currentWindow, centuryBounds, changeWindowFocused],
  )

  /** 데이터가 있는 세기 집합 — span10 ‹›는 이 밖의 빈 세기로 나가지 않는다 */
  const memberCenturies = useMemo(
    () => new Set(overview.buckets.map((bucket) => bucket.century)),
    [overview.buckets],
  )

  const canStep = useMemo(() => {
    if (!currentWindow || currentWindow.level === 'unknown' || !centuryBounds) {
      return { prev: false, next: false }
    }
    if (currentWindow.level === 'century') {
      return {
        prev: stepCentury(currentWindow.century, -1) >= centuryBounds.min,
        next: stepCentury(currentWindow.century, 1) <= centuryBounds.max,
      }
    }
    /**
     * span10 ‹› — 이웃 구간이 **데이터 있는 세기** 안일 때만(검토 R19).
     * 이전엔 next 경계가 `max*100+100`이라 마지막 데이터 세기를 지나 빈 세기
     * 구간을 최대 10스텝 걸어갔다(prev는 타이트 — 비대칭). 세기 멤버십으로
     * 양방향을 같은 기준에 클램프한다. 빈 세기 너머는 상위 창(세기 개요)이 담당.
     */
    const prevStart = stepSpan10Start(currentWindow.startYear, -1)
    const nextStart = stepSpan10Start(currentWindow.startYear, 1)
    return {
      prev: memberCenturies.has(getCentury(prevStart)),
      next: memberCenturies.has(getCentury(nextStart)),
    }
  }, [currentWindow, centuryBounds, memberCenturies])

  /* ── roving tabindex — 버킷 행 ←/→, Backspace/Esc 상위 창 ─────────────── */
  /** 마지막으로 포커스한 버킷 key — 행 전체에서 Tab 정지점은 하나(roving) */
  const [focusKey, setFocusKey] = useState<string | null>(null)
  useEffect(() => {
    // 창이 바뀌면 시작점 리셋(첫 활성 버킷)
    setFocusKey(null)
  }, [currentWindow])

  /**
   * roving 대상은 **모든** 버킷(0건 포함, 검토 R37) — 0건 버킷을 `disabled`로 두면
   * 빈 10년 구간 창에서 toolbar의 탭 정지점이 0이 되고(행 Backspace 탈출 경로도 사망),
   * SR이 '0건'이라는 정보 자체를 듣지 못한다. 동작 없는 버킷은 `aria-disabled`로
   * 표시만 하고 포커스·화살표 순회는 유지한다.
   */
  const bucketKeys = useMemo(
    () =>
      cells
        .filter((cell) => cell.kind === 'bucket')
        .map((cell) => cell.key),
    [cells],
  )
  const rovingKey =
    focusKey !== null && bucketKeys.includes(focusKey)
      ? focusKey
      : (bucketKeys[0] ?? null)

  /**
   * 라벨 간헐 표시(검토 R39) — 버킷이 20개를 넘으면(BC 시드 확장·모바일) 10.5px
   * 라벨이 전부 말줄임돼 축 눈금 구실을 못 한다. v3 labelStep 규약을 승계해
   * k번째만 라벨을 남긴다(전체 정보는 각 버킷의 title/aria-label에 이미 있다).
   */
  const labelStep = bucketKeys.length > 20 ? 3 : bucketKeys.length > 12 ? 2 : 1
  const bucketIndexByKey = useMemo(() => {
    const indexMap = new Map<string, number>()
    bucketKeys.forEach((key, index) => indexMap.set(key, index))
    return indexMap
  }, [bucketKeys])

  const handleRowKeyDown = useCallback(
    (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (keyEvent.key === 'Backspace' || keyEvent.key === 'Escape') {
        if (currentWindow) {
          keyEvent.preventDefault()
          /**
           * 전파 차단(검토 R3) — 페이지 전역 Esc 핸들러(use-catalog-keyboard)는
           * 버튼 타깃을 가드에서 제외하고 defaultPrevented도 보지 않아, 여기서
           * 막지 않으면 '상위 창 이동 + 사건 선택 해제'가 한 키에 동시 발생한다.
           * 전체 창(처리할 상위가 없음)에서는 그대로 흘려 페이지 계약(선택 해제)에 양보.
           */
          keyEvent.stopPropagation()
          changeWindowFocused(parentWindow(currentWindow))
        }
        return
      }
      if (
        keyEvent.key !== 'ArrowLeft' &&
        keyEvent.key !== 'ArrowRight' &&
        keyEvent.key !== 'Home' &&
        keyEvent.key !== 'End'
      ) {
        return
      }
      if (bucketKeys.length === 0) return
      keyEvent.preventDefault()
      const currentPos = rovingKey ? bucketKeys.indexOf(rovingKey) : 0
      const nextPos =
        keyEvent.key === 'Home'
          ? 0
          : keyEvent.key === 'End'
            ? bucketKeys.length - 1
            : Math.max(
                0,
                Math.min(
                  bucketKeys.length - 1,
                  currentPos + (keyEvent.key === 'ArrowRight' ? 1 : -1),
                ),
              )
      setFocusKey(bucketKeys[nextPos])
      const buttons = rowRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-nav-bucket]',
      )
      buttons?.[nextPos]?.focus()
    },
    [bucketKeys, rovingKey, currentWindow, changeWindowFocused],
  )

  /* ── 브레드크럼 ──────────────────────────────────────────────────────── */
  const crumbs = useMemo(() => {
    const trail: Array<{ key: string; label: string; target: TimelineWindow | null }> = [
      { key: 'root', label: '전체', target: null },
    ]
    if (!currentWindow) return trail
    if (currentWindow.level === 'unknown') {
      trail.push({ key: 'u', label: '연도 미상', target: currentWindow })
      return trail
    }
    if (currentWindow.level === 'century') {
      trail.push({
        key: 'c',
        label: describeWindow(currentWindow),
        target: currentWindow,
      })
      return trail
    }
    const century = parentWindow(currentWindow)
    if (century) {
      trail.push({ key: 'c', label: describeWindow(century), target: century })
    }
    trail.push({
      key: 'd',
      label: describeWindow(currentWindow),
      target: currentWindow,
    })
    return trail
  }, [currentWindow])

  const chartHeight = condensed ? 34 : 58

  /**
   * 현재 창 건수 — 브레드크럼 현재 항목에 병기(검토 R21). 헤더 총계는 전체
   * 모수라 "지금 창에 몇 건인가"를 어디서도 요약하지 않았다. 리스트 모수와
   * 같은 정의(시작 시점 기준)를 쓴다.
   */
  const windowCount = useMemo(
    () => pointsStartingInWindow(points, currentWindow).length,
    [points, currentWindow],
  )

  return (
    <Wrap ref={wrapRef} aria-label="시대 탐색">
      <TopRow>
        <Breadcrumb role="group" aria-label="시간 창 경로">
          {crumbs.map((crumb, index) => {
            const isCurrent = index === crumbs.length - 1
            return (
              <React.Fragment key={crumb.key}>
                {index > 0 && <CrumbDivider aria-hidden="true">›</CrumbDivider>}
                <CrumbButton
                  type="button"
                  data-nav-crumb
                  $current={isCurrent}
                  aria-current={isCurrent ? 'true' : undefined}
                  disabled={isCurrent}
                  onClick={() => changeWindowFocused(crumb.target)}
                >
                  {isCurrent ? `${crumb.label} · ${windowCount}건` : crumb.label}
                </CrumbButton>
              </React.Fragment>
            )
          })}
        </Breadcrumb>

        <TopActions>
          {currentWindow &&
            currentWindow.level !== 'unknown' && (
              <StepGroup aria-label="이웃 구간 이동">
                <StepButton
                  type="button"
                  aria-label={
                    currentWindow.level === 'century'
                      ? '이전 세기'
                      : '이전 10년'
                  }
                  disabled={!canStep.prev}
                  onClick={() => stepWindow(-1)}
                >
                  ‹
                </StepButton>
                <StepButton
                  type="button"
                  aria-label={
                    currentWindow.level === 'century'
                      ? '다음 세기'
                      : '다음 10년'
                  }
                  disabled={!canStep.next}
                  onClick={() => stepWindow(1)}
                >
                  ›
                </StepButton>
              </StepGroup>
            )}
          {overview.unknownCount > 0 && (
            <UnknownChip
              type="button"
              $active={currentWindow?.level === 'unknown'}
              aria-pressed={currentWindow?.level === 'unknown'}
              onClick={() =>
                changeWindowFocused(
                  currentWindow?.level === 'unknown'
                    ? null
                    : { level: 'unknown' },
                )
              }
            >
              연도 미상 {overview.unknownCount}
            </UnknownChip>
          )}
        </TopActions>
      </TopRow>

      {cells.length > 0 && (
        <BucketRow
          ref={rowRef}
          role="toolbar"
          aria-label={
            !currentWindow || currentWindow.level === 'unknown'
              ? '세기별 사건 분포 — 클릭하면 그 세기로 들어갑니다'
              : currentWindow.level === 'century'
                ? '10년 구간별 사건 분포 — 클릭하면 그 구간으로 들어갑니다'
                : '연도별 사건 분포 — 클릭하면 목록의 그 연도로 이동합니다'
          }
          aria-keyshortcuts="ArrowLeft ArrowRight Home End Backspace"
          onKeyDown={handleRowKeyDown}
        >
          {cells.map((cell) => {
            if (cell.kind === 'gap') {
              // aria-hidden이면 '기록 없는 N개 세기' 정보가 SR에 완전 소실된다(검토 R23)
              return (
                <GapCell
                  key={cell.key}
                  title={cell.fullLabel}
                  role="img"
                  aria-label={cell.fullLabel}
                >
                  ⋯
                </GapCell>
              )
            }
            const inactive = cell.onActivate === null
            const segments = Array.from(cell.stack.byCategory.entries()).sort(
              (left, right) => right[1] - left[1],
            )
            /**
             * 높이는 √비율 — 실데이터가 극단 편중(세기 최대 118건 vs 1건 다수)이라
             * 선형 스케일에선 대부분 버킷이 3px 실오라기로 뭉개져 분포 모양 자체가
             * 안 읽혔다(실화면 검증). 순서 관계는 보존되고, 정확한 값은 각 버킷
             * 아래 숫자 라벨이 정본이므로 높이는 가독 우선으로 압축한다.
             */
            const heightRatio = cell.stack.count / maxCount
            const columnHeight =
              cell.stack.count === 0
                ? 0
                : Math.max(3, Math.round(Math.sqrt(heightRatio) * chartHeight))
            /**
             * 낮은 컬럼(h<4)은 스택을 접고 지배 카테고리 단색으로 — 검토 R11.
             * 세그먼트별 min-height를 강제하면 20px 컬럼에 6카테고리(15:1:1:1:1:1)
             * 같은 분포에서 지배 카테고리가 실제보다 35% 작게 그려진다(비율 거짓말).
             * v3 미니맵의 검증된 폴백 규약을 이식했다.
             */
            const solidColumn = columnHeight > 0 && columnHeight < 4
            return (
              <BucketButton
                key={cell.key}
                type="button"
                data-nav-bucket
                aria-disabled={inactive || undefined}
                $inactive={inactive}
                tabIndex={cell.key === rovingKey ? 0 : -1}
                aria-label={cell.fullLabel}
                title={cell.fullLabel}
                onClick={cell.onActivate ?? undefined}
                onFocus={() => setFocusKey(cell.key)}
              >
                <ColumnArea style={{ height: `${chartHeight}px` }}>
                  {columnHeight > 0 && (
                    <Column
                      style={
                        solidColumn
                          ? {
                              height: `${columnHeight}px`,
                              background: resolveCategory(segments[0][0]).color,
                            }
                          : { height: `${columnHeight}px` }
                      }
                    >
                      {!solidColumn &&
                        segments.map(([categoryName, count]) => (
                          <ColumnSegment
                            key={categoryName}
                            style={{
                              flexGrow: count,
                              background: resolveCategory(categoryName).color,
                            }}
                          />
                        ))}
                    </Column>
                  )}
                </ColumnArea>
                <BucketCount aria-hidden="true">
                  {cell.stack.count > 0 ? cell.stack.count : ''}
                </BucketCount>
                <BucketLabel aria-hidden="true">
                  {(bucketIndexByKey.get(cell.key) ?? 0) % labelStep === 0
                    ? cell.label
                    : ''}
                </BucketLabel>
              </BucketButton>
            )
          })}
        </BucketRow>
      )}
    </Wrap>
  )
}

/**
 * React.memo — 부모(EventTimeline)가 hover 등으로 재렌더돼도 내비게이터 props
 * (points·window·안정 콜백·condensed)가 그대로면 히스토그램을 다시 그리지 않는다(검토 R7).
 */
export const EraNavigator = React.memo(EraNavigatorComponent)

/* ───────────────────────────── styles ───────────────────────────── */

const Wrap = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 8px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,34,0.08)'};
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const Breadcrumb = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
`

const CrumbButton = styled.button<{ $current: boolean }>`
  border: none;
  background: none;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 12.5px;
  cursor: pointer;
  transition: background ${MOTION.fast};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;

  ${({ $current, theme }) =>
    $current &&
    css`
      color: ${theme.colors.text.primary};
      font-weight: 700;
      cursor: default;
    `}

  &:not(:disabled):hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,34,0.05)'};
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`

const CrumbDivider = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  user-select: none;
`

const TopActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const StepGroup = styled.div`
  display: inline-flex;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,34,0.12)'};
  border-radius: 7px;
  overflow: hidden;
`

const StepButton = styled.button`
  border: none;
  background: none;
  width: 26px;
  height: 24px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background ${MOTION.fast};

  & + & {
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,34,0.12)'};
  }

  &:not(:disabled):hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,34,0.05)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: -2px;
  }
`

const UnknownChip = styled.button<{ $active: boolean }>`
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(20,19,34,0.25)'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.09)'
        : 'rgba(20,19,34,0.07)'
      : 'none'};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,34,0.05)'};
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`

const BucketRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;

  /* 모바일 — 화면 균등 분할이면 버킷 폭이 ~10px(360px·세기 26개)까지 떨어져
     터치 타깃 24px(WCAG 2.5.8) 미달(검토 R10). 버킷 최소 폭을 보장하고
     넘치는 만큼 행을 가로 스크롤로 돌린다. */
  @media (max-width: 640px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
  }
`

const BucketButton = styled.button<{ $inactive: boolean }>`
  flex: 1 1 0;
  min-width: 0;

  @media (max-width: 640px) {
    flex: 1 0 34px;
    min-width: 34px;
  }
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  border: none;
  background: none;
  padding: 3px 2px 4px;
  border-radius: 8px;
  /* 0건 버킷은 동작 없음(aria-disabled) — 포커스는 받되 클릭 유도는 하지 않는다 */
  cursor: ${({ $inactive }) => ($inactive ? 'default' : 'pointer')};
  transition: background ${MOTION.fast};

  ${({ $inactive, theme }) =>
    !$inactive &&
    css`
      &:hover {
        background: ${theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(20,19,34,0.05)'};
      }
    `}

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`

/**
 * 축 베이스라인 — 이전엔 0건 버킷만 2px 마크가 있어 데이터 컬럼은 허공에 떴다
 * (비일관, 실화면 검증). 버킷마다 축선을 그어 히스토그램 전체를 한 기준면에
 * 앉힌다. 공백 표지(⋯) 셀에는 선이 없어 '기록 없는 구간'과 자연 구분된다.
 */
const ColumnArea = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,34,0.1)'};
`

const Column = styled.div`
  width: 100%;
  max-width: 46px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  border-radius: 3px 3px 1px 1px;
  overflow: hidden;
`

/**
 * 스택 세그먼트 — min-height 강제 없음(검토 R11). 세그먼트별 최소 높이는 비율을
 * 왜곡한다. 컬럼이 낮아 스택이 못 읽히는 경우(h<4)는 렌더 쪽 단색 폴백이 담당.
 */
const ColumnSegment = styled.div``

const BucketCount = styled.span`
  font-size: 9.5px;
  line-height: 1.1;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
  /* 데이터 텍스트는 secondary — tertiary는 4.5:1 미달(검토 R12) */
  color: ${({ theme }) => theme.colors.text.secondary};
  min-height: 11px;
`

const BucketLabel = styled.span`
  font-size: 10.5px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  /* 간헐 라벨(R39)로 비워도 줄 높이를 유지해 이웃 버킷과 베이스라인을 맞춘다 */
  min-height: 13px;
`

const GapCell = styled.div`
  flex: 0 0 22px;
  align-self: center;
  text-align: center;
  font-size: 12px;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.colors.text.secondary};
  user-select: none;
`
