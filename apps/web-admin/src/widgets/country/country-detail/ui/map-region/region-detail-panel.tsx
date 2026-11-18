import type { ReactNode } from 'react'

import { type RegionPalette } from './use-region-palette'

interface RegionDetailPanelProps {
  palette: RegionPalette
  /** 선택된 항목이 없을 때 보일 커스텀 총람/빈 상태 */
  empty?: ReactNode
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  /** 선택된 항목 헤더 (제목·부제목 등) */
  header?: ReactNode
  /** 메타 그리드/추가 콘텐츠 */
  children?: ReactNode
  /** 컴팩트(상세) 뷰가 표시될지 여부 — false면 empty 노출 */
  isSelected: boolean
}

export function RegionDetailPanel({
  palette,
  empty,
  emptyIcon,
  emptyTitle = '항목을 선택해주세요',
  emptyDescription = '좌측 목록에서 항목을 선택하면 상세 정보를 볼 수 있습니다',
  header,
  children,
  isSelected,
}: RegionDetailPanelProps) {
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: 'none',
        padding: isSelected || !empty ? '20px 22px' : '16px 18px',
        minHeight: 0,
      }}
    >
      {!isSelected ? (
        empty ?? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
              color: palette.textSecondary,
              fontSize: 13,
              textAlign: 'center',
              padding: '24px 16px',
            }}
          >
            {emptyIcon && (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: palette.bgSecondary,
                  border: `1px solid ${palette.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                  color: palette.textSecondary,
                  fontSize: 18,
                }}
              >
                {emptyIcon}
              </div>
            )}
            <div
              style={{
                fontWeight: 700,
                color: palette.text,
                marginBottom: 4,
              }}
            >
              {emptyTitle}
            </div>
            <div style={{ fontSize: 12.5 }}>{emptyDescription}</div>
          </div>
        )
      ) : (
        <div>
          {header}
          {children && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fill, minmax(156px, 1fr))',
                gap: 10,
              }}
            >
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface RegionDetailHeaderProps {
  palette: RegionPalette
  title: string
  subtitle?: string
  rightSlot?: ReactNode
}

/** 상세 패널 헤더 — 제목 + 부제목 + 우측 액션 */
export function RegionDetailHeader({
  palette,
  title,
  subtitle,
  rightSlot,
}: RegionDetailHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 14,
        marginBottom: 14,
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: palette.text,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <div
            style={{
              fontSize: 12.5,
              color: palette.textSecondary,
              marginTop: 4,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {rightSlot && <div style={{ flexShrink: 0 }}>{rightSlot}</div>}
    </div>
  )
}
