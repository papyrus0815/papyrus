import type { ReactNode } from 'react'

import { type RegionPalette } from './use-region-palette'

interface RegionDetailPanelProps {
  palette: RegionPalette
  /** 선택된 항목이 없을 때 보일 빈 상태 — null이면 emptyTitle/Description 사용 */
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
        borderRadius: 16,
        overflow: 'auto',
        boxShadow: palette.shadowNone,
        padding: 24,
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
              height: '100%',
              minHeight: 320,
              color: palette.textSecondary,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {emptyIcon && (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: palette.bgSecondary,
                  border: `1px solid ${palette.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  fontSize: 28,
                }}
              >
                {emptyIcon}
              </div>
            )}
            <div
              style={{
                fontWeight: 600,
                color: palette.text,
                marginBottom: 4,
              }}
            >
              {emptyTitle}
            </div>
            <div>{emptyDescription}</div>
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
                  'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 12,
              }}
            >
              {children}
            </div>
          )}
          {/* 스크롤 힌트 — 내용이 더 있으면 하단이 살짝 사라지듯 페이드.
              내용이 짧으면 빈 배경 위 그라데이션이라 보이지 않는다. */}
          <div
            aria-hidden
            style={{
              position: 'sticky',
              bottom: -24,
              height: 32,
              margin: '0 -24px -24px',
              background: `linear-gradient(to bottom, transparent, ${palette.bg})`,
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}

interface RegionDetailHeaderProps {
  palette: RegionPalette
  title: string
  subtitle?: string
}

/** 상세 패널 헤더 — 제목 + 부제목 (메타 그리드 위에 배치) */
export function RegionDetailHeader({
  palette,
  title,
  subtitle,
}: RegionDetailHeaderProps) {
  return (
    <>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: palette.text,
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <div
          style={{
            fontSize: 13,
            color: palette.textSecondary,
            marginBottom: 20,
          }}
        >
          {subtitle}
        </div>
      )}
    </>
  )
}
