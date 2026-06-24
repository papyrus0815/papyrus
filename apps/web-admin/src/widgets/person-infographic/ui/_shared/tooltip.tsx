/**
 * 매트릭스/은하계 점/막대에 호버 시 표시되는 인물 툴팁.
 * 두 뷰가 동일 디자인을 공유.
 */
import styled, { css, useTheme } from 'styled-components'

import type { AdaptedPerson } from '../../model/types'
import { formatYear } from '../../model/century'

interface PersonHoverTooltipProps {
  person: AdaptedPerson
  /** 마우스 좌표 (clientX, clientY) — 우측 하단 14px 오프셋으로 표시 */
  x: number
  y: number
  /** 두 번째 줄에 보일 메타 — "국가 · 가문" / "국가 · 분야" 등 뷰별 컨텍스트 */
  metaSecondLine?: string
}

export function PersonHoverTooltip({
  person: p,
  x,
  y,
  metaSecondLine,
}: PersonHoverTooltipProps) {
  const theme = useTheme()
  const fallback = p.faction
    ? `${p.country} · ${p.faction}`
    : `${p.country} · ${p.field}`
  return (
    <Wrap style={{ top: y + 14, left: x + 14 }}>
      {p.profileImageUrl ? (
        <Img src={p.profileImageUrl} alt={p.name} />
      ) : (
        <ImgPh $color={p.era.color}>
          <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </ImgPh>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.colors.text.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {p.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: theme.colors.text.secondary,
            marginTop: 2,
          }}
        >
          {metaSecondLine ?? fallback}
        </div>
        <div
          style={{
            fontSize: 10,
            color: theme.colors.text.tertiary,
            marginTop: 3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {p.born == null ? '?' : formatYear(p.born)} –{' '}
          {p.died == null ? '?' : formatYear(p.died)} · 영향력 {p.influence}
        </div>
      </div>
    </Wrap>
  )
}

const Wrap = styled.div`
  position: fixed;
  z-index: 50;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  min-width: 180px;
  max-width: 280px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(20, 20, 25, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        `}
`

const Img = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  object-position: top center;
  flex-shrink: 0;
`

const ImgPh = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color}18;
  color: ${({ $color }) => $color};
  opacity: 0.7;
`
