import type { ReactNode } from 'react'

import { type RegionPalette } from './use-region-palette'

interface RegionListPanelProps {
  palette: RegionPalette
  /** 상단 툴바 (검색 input, 필터 pill 등) */
  toolbar: ReactNode
  /** 리스트 영역 — 항목들 또는 빈 상태 */
  children: ReactNode
  /** 컴팩트(filter pill 사용 뷰)는 maxHeight 제한이 필요 */
  maxHeight?: number
  minHeight?: number
}

/**
 * 좌측 목록 패널 컨테이너 — 헤더/툴바 + 스크롤 영역.
 * 행정구역(검색)·자연(pill)·인프라(pill) 모두 동일한 카드 골격 사용.
 */
export function RegionListPanel({
  palette,
  toolbar,
  children,
  maxHeight,
  minHeight,
}: RegionListPanelProps) {
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: palette.shadowNone,
        display: 'flex',
        flexDirection: 'column',
        maxHeight,
        minHeight,
      }}
    >
      {toolbar}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface FilterPillProps {
  palette: RegionPalette
  active: boolean
  onClick: () => void
  children: ReactNode
}

/** pill 형태 필터 버튼 — 자연지리/인프라 뷰의 카테고리 토글 */
export function FilterPill({
  palette,
  active,
  onClick,
  children,
}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 14,
        border: 'none',
        background: active
          ? palette.isDark
            ? 'rgba(255,255,255,0.15)'
            : '#ffffff'
          : 'transparent',
        color: active ? palette.primaryLight : palette.textSecondary,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        boxShadow: active ? palette.shadowSelected : 'none',
      }}
    >
      {children}
    </button>
  )
}

interface PillToolbarProps {
  palette: RegionPalette
  children: ReactNode
}

/** pill 필터들을 담는 툴바 컨테이너 */
export function PillToolbar({ palette, children }: PillToolbarProps) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${palette.border}`,
        background: palette.bgSecondary,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  )
}

interface RegionListItemProps {
  palette: RegionPalette
  selected: boolean
  onSelect: () => void
  title: string
  subtitle?: ReactNode
  /** 우측 보조(개수 등) — pill 뷰에서는 안 씀, 행정구역 뷰에서 사용 */
  trailing?: ReactNode
}

/**
 * 리스트 항목 카드 — 선택 시 좌측 강조선·선택 배경.
 * 행정구역/자연/인프라 모두 동일한 시각.
 */
export function RegionListItem({
  palette,
  selected,
  onSelect,
  title,
  subtitle,
  trailing,
}: RegionListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      style={{
        padding: '12px 14px',
        margin: '6px 12px',
        borderRadius: 12,
        borderLeft: `3px solid ${selected ? palette.primary : 'transparent'}`,
        background: selected ? palette.bgSelected : palette.bg,
        border: `1px solid ${selected ? palette.primary : palette.border}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: palette.text,
            marginBottom: subtitle ? 4 : 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 12,
              color: palette.textSecondary,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {trailing}
    </div>
  )
}

interface ListEmptyStateProps {
  palette: RegionPalette
  message?: string
}

/** 리스트가 비었을 때 표시 */
export function ListEmptyState({
  palette,
  message = '항목이 없습니다',
}: ListEmptyStateProps) {
  return (
    <div
      style={{
        padding: 24,
        textAlign: 'center',
        color: palette.textSecondary,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  )
}
