import { useEffect, useState, type ReactNode } from 'react'

import styled from 'styled-components'

const SectionLabel = styled.div`
  margin-bottom: 12px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

/** 뷰포트가 좁은지(모바일/태블릿) — 2컬럼을 세로 스택으로 전환하는 기준 */
function useIsNarrow(breakpoint = 960): boolean {
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
  /** 상단 요약/체계 영역 (옵션) */
  kpiStrip?: ReactNode
  left: ReactNode
  right: ReactNode
  /** 좌측 컬럼 너비 — 기본 380px */
  leftWidth?: number
  /** 좌측 목록 컬럼 maxHeight — 우측(지도+상세)은 자연 흐름 또는 독립 스크롤 */
  maxHeight?: string
  /** 그리드 minHeight */
  minHeight?: number
}

/**
 * 좌측 목록 + 우측(지도 + 상세) 2-컬럼 아틀라스 데스크 레이아웃.
 * 행정구역/자연지리/인프라 뷰가 공유하는 골격.
 */
export function RegionSplitLayout({
  ariaLabel,
  sectionLabel,
  kpiStrip,
  left,
  right,
  leftWidth = 380,
  maxHeight,
  minHeight = 420,
}: RegionSplitLayoutProps) {
  const isNarrow = useIsNarrow()

  const leftColStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    ...(!isNarrow
      ? {
          position: 'sticky',
          top: 12,
          maxHeight: maxHeight ?? 'calc(100vh - 140px)',
        }
      : {}),
  }

  const rightColStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minHeight: 0,
    minWidth: 0,
  }

  return (
    <section
      aria-label={ariaLabel}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {sectionLabel && <SectionLabel>{sectionLabel}</SectionLabel>}
      {kpiStrip}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow
            ? 'minmax(0, 1fr)'
            : `${leftWidth}px minmax(0, 1fr)`,
          gap: isNarrow ? 14 : 16,
          alignItems: 'start',
          minHeight: isNarrow ? undefined : minHeight,
        }}
      >
        <div style={leftColStyle}>{left}</div>
        <div style={rightColStyle}>{right}</div>
      </div>
    </section>
  )
}
