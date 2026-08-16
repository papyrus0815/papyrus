/**
 * 기간 밴드 — 현재 창과 겹치는 기간 사건의 가로 막대.
 * FSD: widgets/event-timeline/ui
 *
 * v3 간트의 실패(라벨 스틸·클러스터·+N 오버플로)를 뒤집는 규약:
 *  - 창 폭 = 화면 폭. 가로 스크롤·줌 없음.
 *  - 라벨은 **항상** 노출 — 겹치면 아래 행으로 내려갈 뿐(first-fit, 모델 담당).
 *    행 상한(BAND_MAX_ROWS)을 넘는 초과분은 «외 N건» 집계 라인으로 접힌다(R6).
 *  - 세기·10년 창에서만 렌더. 전체 단계의 조망은 내비게이터가 담당한다.
 *  - 소속은 겹침 기준 — 이전 창에서 시작한 사건은 잘린 모서리 + 실제 연도 병기로 표시.
 */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import styled, { css } from 'styled-components'

import { formatYearLabel } from '@/shared/lib/iso-date'

import { resolveCategory } from '../../../pages/events/ledger/styles/ledger-tokens'
import { BRAND, MOTION } from '../../../pages/events/styles/theme'
import {
  packSpanRows,
  windowYearRange,
  type TimelinePoint,
  type TimelineWindow,
} from '../model/timeline-model'

const ROW_HEIGHT = 26
const BAR_HEIGHT = 16
/**
 * 행 상한 — 검토 R6. 밀집 세기(기간 사건 수십 건)에서 행 무제한이면 밴드 혼자
 * 스크롤 영역을 소진해 연표 리스트가 fold 아래로 사라졌다. 초과분은 모델이
 * overflow로 돌려주고 아래 «외 N건» 집계 라인이 접힘을 밝힌다.
 */
const BAND_MAX_ROWS = 8

interface SpanBandProps {
  points: readonly TimelinePoint[]
  window: TimelineWindow | null
  selectedEventId: string | null
  hoveredEventId: string | null
  onHoverEvent: (id: string | null) => void
  onSelectEvent: (id: string) => void
}

export const SpanBand: React.FC<SpanBandProps> = ({
  points,
  window: currentWindow,
  selectedEventId,
  hoveredEventId,
  onHoverEvent,
  onSelectEvent,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  const attachHost = useCallback((element: HTMLDivElement | null) => {
    hostRef.current = element
  }, [])

  useLayoutEffect(() => {
    const element = hostRef.current
    if (!element) return undefined
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setWidth(rect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { spans, overflow } = useMemo(
    () => packSpanRows(points, currentWindow, width, BAND_MAX_ROWS),
    [points, currentWindow, width],
  )
  const rowCount = useMemo(
    () => spans.reduce((max, span) => Math.max(max, span.row + 1), 0),
    [spans],
  )

  /**
   * 하위 버킷 경계 그리드라인 — 세기·10년 창 모두 창을 10등분하므로 내부 경계는
   * 균등 9선이다(`packSpanRows`의 선형 `xOf`와 동일 매핑). 이 축선이 없으면
   * 막대가 허공에 떠서 시작·끝이 위 내비게이터의 어느 구간인지 읽히지 않았다
   * (실화면 검증에서 확인). 라벨은 내비게이터 버킷이 이미 담당하므로 선만 긋는다.
   */
  const gridTickXs = useMemo(() => {
    if (width === 0) return []
    return Array.from({ length: 9 }, (_, tickIndex) =>
      Math.round((width * (tickIndex + 1)) / 10),
    )
  }, [width])

  /**
   * ── 탭 정지점 1개 + ←/→ roving(검토 R8) ─────────────────────────────
   * 막대마다 개별 tab stop이면 밀집 창에서 정지점이 수십 개 — LIST 뷰 3차가
   * 고친 결함의 재도입이었다. 밴드 전체가 정지점 하나, 이동은 화살표.
   */
  const [spanFocusId, setSpanFocusId] = useState<string | null>(null)
  const spanIds = useMemo(() => spans.map((span) => span.point.id), [spans])
  const rovingSpanId =
    spanFocusId !== null && spanIds.includes(spanFocusId)
      ? spanFocusId
      : (spanIds[0] ?? null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const handleBandKeyDown = useCallback(
    (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        keyEvent.key !== 'ArrowRight' &&
        keyEvent.key !== 'ArrowLeft' &&
        keyEvent.key !== 'Home' &&
        keyEvent.key !== 'End'
      ) {
        return
      }
      if (spanIds.length === 0) return
      keyEvent.preventDefault()
      const currentIndex = rovingSpanId ? spanIds.indexOf(rovingSpanId) : 0
      const nextIndex =
        keyEvent.key === 'Home'
          ? 0
          : keyEvent.key === 'End'
            ? spanIds.length - 1
            : Math.max(
                0,
                Math.min(
                  spanIds.length - 1,
                  currentIndex + (keyEvent.key === 'ArrowRight' ? 1 : -1),
                ),
              )
      setSpanFocusId(spanIds[nextIndex])
      const bars =
        canvasRef.current?.querySelectorAll<HTMLButtonElement>('[data-span-bar]')
      bars?.[nextIndex]?.focus()
    },
    [spanIds, rovingSpanId],
  )

  // 전체·미상 창에서는 렌더하지 않는다 (호출부에서도 걸지만 방어적으로)
  if (!windowYearRange(currentWindow)) return null

  return (
    <BandWrap
      ref={attachHost}
      role="group"
      aria-label="기간 사건 — 창 안에서 이어진 사건의 기간 막대"
    >
      {width === 0 ? null : rowCount === 0 ? (
        <BandEmpty>이 창에 기간으로 표시할 사건이 없습니다 — 아래 연표에서 확인하세요.</BandEmpty>
      ) : (
        <BandCanvas
          ref={canvasRef}
          style={{ height: `${rowCount * ROW_HEIGHT + 6}px` }}
          onKeyDown={handleBandKeyDown}
        >
          {gridTickXs.map((tickX) => (
            <GridTick
              key={tickX}
              style={{ left: `${tickX}px` }}
              aria-hidden="true"
            />
          ))}
          {spans.map((span) => {
            const color = resolveCategory(span.point.category).color
            const isActive = span.point.id === selectedEventId
            const isHovered = span.point.id === hoveredEventId
            const rowTop = span.row * ROW_HEIGHT + 4
            /**
             * 원시 ISO(-0044-03-15)는 SR이 '마이너스 영영…'로 읽고 표기 통일
             * 규약(IA-3)에도 어긋난다 — 연도 라벨로 조립한다(검토 R14).
             */
            const periodText =
              span.point.startYearInt !== null
                ? span.point.endYearInt !== null &&
                  span.point.endYearInt !== span.point.startYearInt
                  ? `${formatYearLabel(span.point.startYearInt)} ~ ${formatYearLabel(span.point.endYearInt)}`
                  : formatYearLabel(span.point.startYearInt)
                : null
            const titleAttr = [span.point.title, periodText, span.point.category]
              .filter(Boolean)
              .join(' · ')
            return (
              <React.Fragment key={span.point.id}>
                <SpanBar
                  type="button"
                  style={{
                    left: `${span.x}px`,
                    width: `${Math.max(6, span.width)}px`,
                    top: `${rowTop}px`,
                    background: `${color}E6`,
                  }}
                  $clippedStart={span.clippedStart}
                  $clippedEnd={span.clippedEnd}
                  $active={isActive}
                  $hovered={isHovered}
                  title={titleAttr}
                  aria-label={titleAttr}
                  aria-current={isActive ? 'true' : undefined}
                  data-span-bar
                  tabIndex={span.point.id === rovingSpanId ? 0 : -1}
                  onClick={() => onSelectEvent(span.point.id)}
                  onMouseEnter={() => onHoverEvent(span.point.id)}
                  onMouseLeave={() => onHoverEvent(null)}
                  onFocus={() => {
                    setSpanFocusId(span.point.id)
                    onHoverEvent(span.point.id)
                  }}
                  onBlur={() => onHoverEvent(null)}
                />
                <SpanLabel
                  style={{
                    left: `${span.labelX}px`,
                    top: `${rowTop + BAR_HEIGHT / 2}px`,
                    maxWidth: `${span.labelWidth + 4}px`,
                  }}
                  $inside={span.labelSide === 'inside'}
                  $emphasis={isActive || isHovered}
                  aria-hidden="true"
                  onClick={() => onSelectEvent(span.point.id)}
                  onMouseEnter={() => onHoverEvent(span.point.id)}
                  onMouseLeave={() => onHoverEvent(null)}
                >
                  {span.labelText}
                </SpanLabel>
              </React.Fragment>
            )
          })}
        </BandCanvas>
      )}
      {overflow.length > 0 && (
        <BandOverflowNote>
          외 {overflow.length}건은 행이 가득 차 접혔습니다 — 아래 연표에서
          확인하세요.
        </BandOverflowNote>
      )}
    </BandWrap>
  )
}

/* ───────────────────────────── styles ───────────────────────────── */

const BandWrap = styled.div`
  padding: 8px 14px 6px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,34,0.08)'};
`

const BandCanvas = styled.div`
  position: relative;
`

/** 하위 버킷 경계 세로선 — 막대·라벨 뒤(DOM 선행)에서 시간 기준면만 제공한다. */
const GridTick = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.055)' : 'rgba(20,19,34,0.055)'};
  pointer-events: none;
`

const BandEmpty = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 2px 0 4px;
`

/** 행 상한 접힘 집계 — 조용한 탈락 금지(P1), 접혔음을 명시한다. */
const BandOverflowNote = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 4px 0 2px;
`

const SpanBar = styled.button<{
  $clippedStart: boolean
  $clippedEnd: boolean
  $active: boolean
  $hovered: boolean
}>`
  position: absolute;
  height: ${BAR_HEIGHT}px;
  border: none;
  padding: 0;
  /* 완전 필(radius 8 = 반원 끝)은 양끝 ±8px가 장식으로 읽혀 시간 정밀도를 흐린다
     — 그리드라인 도입과 함께 막대에 가깝게 낮춘다. 잘린 모서리 직각 규약은 유지. */
  border-radius: 5px;
  cursor: pointer;
  transition:
    filter ${MOTION.fast},
    box-shadow ${MOTION.fast};

  /* 시각 두께는 16px을 유지하되 히트박스만 행 높이(26px)로 확장 — 터치 타깃
     24px 미달(WCAG 2.5.8, 검토 R10). 행 간격이 이미 이 여유를 갖고 있다. */
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: ${-(ROW_HEIGHT - BAR_HEIGHT) / 2}px;
    bottom: ${-(ROW_HEIGHT - BAR_HEIGHT) / 2}px;
  }

  /* 창 경계에서 잘린 쪽은 직각 — '여기서 끝이 아니다' 표식 */
  ${({ $clippedStart }) =>
    $clippedStart &&
    css`
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    `}
  ${({ $clippedEnd }) =>
    $clippedEnd &&
    css`
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    `}

  ${({ $hovered }) =>
    $hovered &&
    css`
      filter: brightness(1.12);
    `}

  /* 링 갭색은 다크 카드 합성색(≈#141414)과 맞춘다 — #0a0a0a는 어긋나 헤일로가
     생겼다(검토 R38). */
  ${({ $active, theme }) =>
    $active &&
    css`
      box-shadow:
        0 0 0 2px ${theme.mode === 'dark' ? '#141414' : '#ffffff'},
        0 0 0 4px ${BRAND.primary};
    `}

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#ffffff')},
      0 0 0 4px ${BRAND.primary};
  }
`

const SpanLabel = styled.span<{ $inside: boolean; $emphasis: boolean }>`
  position: absolute;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};

  /* inside = 이 창의 최대 사건 위 — 흰 글씨 + 그림자는 밝은 카테고리색(외교
     #0ea5e9 ≈2.6:1)에서 대비 미달(검토 R15). 카테고리색과 무관하게 대비를
     보장하는 반투명 암막 칩 위 흰 글씨로 조립한다. */
  ${({ $inside }) =>
    $inside &&
    css`
      color: #ffffff;
      background: rgba(10, 10, 14, 0.62);
      padding: 1px 6px;
      border-radius: 5px;
    `}

  ${({ $emphasis }) =>
    $emphasis &&
    css`
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 2px;
    `}
`
