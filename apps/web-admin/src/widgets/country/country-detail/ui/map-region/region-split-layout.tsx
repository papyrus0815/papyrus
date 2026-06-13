import { useEffect, useState, type ReactNode } from 'react'

import * as Styled from '../map-region-section.styles'

/** 뷰포트가 좁은지(모바일/태블릿) — 2컬럼을 세로 스택으로 전환하는 기준 */
function useIsNarrow(breakpoint = 900): boolean {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = () => setNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])
  return narrow
}

interface RegionSplitLayoutProps {
  /** 섹션 ARIA 라벨 (예: '행정구역', '자연지리', '인프라') */
  ariaLabel: string
  /** 섹션 라벨 텍스트 — 페이지 제목과 중복되면 생략 */
  sectionLabel?: string
  /** 섹션 라벨 아래 KPI 스트립 (옵션) */
  kpiStrip?: ReactNode
  left: ReactNode
  right: ReactNode
  /** 좌측 컬럼 너비 — 기본 360px */
  leftWidth?: number
  /** 그리드 maxHeight — 행정구역 뷰처럼 vh 기반 제약을 줄 때 */
  maxHeight?: string
  /** 그리드 minHeight */
  minHeight?: number
}

/**
 * 좌측 목록 + 우측 상세의 2-컬럼 레이아웃.
 * 행정구역/자연지리/인프라 뷰가 공유하는 골격.
 *
 * maxHeight는 그리드가 아니라 *각 컬럼 래퍼*에 건다 — 그리드에만 걸면
 * alignItems:start인 항목이 캡을 무시하고 섹션 하단 여백 너머(페이지 바닥)까지
 * 흘러내린다. 래퍼는 flex라 내용이 캡을 넘으면 자식 패널이 줄어들며
 * 내부 스크롤(overflow:auto)이 걸린다.
 */
export function RegionSplitLayout({
  ariaLabel,
  sectionLabel,
  kpiStrip,
  left,
  right,
  leftWidth = 360,
  maxHeight,
  minHeight = 320,
}: RegionSplitLayoutProps) {
  // 좁은 화면에선 세로 스택 — 목록 위, 상세 아래. 높이 캡 없이 페이지 흐름에 맡겨
  // 터치 환경에서 중첩 스크롤박스를 피한다.
  const isNarrow = useIsNarrow()
  const columnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    ...(!isNarrow && maxHeight ? { maxHeight } : {}),
  }
  return (
    <section aria-label={ariaLabel}>
      {sectionLabel && (
        <Styled.MapRegionSectionLabel>
          {sectionLabel}
        </Styled.MapRegionSectionLabel>
      )}
      {kpiStrip}
      <div
        style={{
          display: 'grid',
          // minmax(0, 1fr) — 1fr만 쓰면 트랙이 내용물의 min-content 아래로 줄지 않아
          // 패널 안의 nowrap 한 줄이 페이지 전체 가로폭을 밀어낸다(모바일 가로 스크롤).
          gridTemplateColumns: isNarrow
            ? 'minmax(0, 1fr)'
            : `${leftWidth}px minmax(0, 1fr)`,
          gap: isNarrow ? 16 : 24,
          alignItems: 'start',
          minHeight: isNarrow ? undefined : minHeight,
        }}
      >
        <div style={columnStyle}>{left}</div>
        <div style={columnStyle}>{right}</div>
      </div>
    </section>
  )
}
