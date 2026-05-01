import type { ReactNode } from 'react'

import * as Styled from '../map-region-section.styles'

interface RegionSplitLayoutProps {
  /** 섹션 ARIA 라벨 (예: '행정구역', '자연지리', '인프라') */
  ariaLabel: string
  /** 섹션 라벨 텍스트 */
  sectionLabel: string
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
  return (
    <section aria-label={ariaLabel}>
      <Styled.MapRegionSectionLabel>{sectionLabel}</Styled.MapRegionSectionLabel>
      {kpiStrip}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${leftWidth}px 1fr`,
          gap: 24,
          alignItems: 'start',
          minHeight,
          ...(maxHeight ? { maxHeight } : {}),
        }}
      >
        {left}
        {right}
      </div>
    </section>
  )
}
