import { type ReactNode, useEffect, useRef, useState } from 'react'

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
  /** 스크롤 컨테이너 ref — 가상화 등에서 활용 */
  scrollRef?: React.RefObject<HTMLDivElement | null>
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
  scrollRef,
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
        ref={scrollRef}
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
  /** 우측 액션 (예: + 등록 버튼) */
  rightSlot?: ReactNode
}

/** pill 필터들을 담는 툴바 컨테이너 */
export function PillToolbar({ palette, children, rightSlot }: PillToolbarProps) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${palette.border}`,
        background: palette.bgSecondary,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          flex: 1,
          minWidth: 0,
        }}
      >
        {children}
      </div>
      {rightSlot}
    </div>
  )
}

interface RegisterButtonProps {
  palette: RegionPalette
  onClick: () => void
  label?: string
}

/** "+ 등록" 액션 버튼 — PillToolbar의 rightSlot에 주로 사용 */
export function RegisterButton({
  palette,
  onClick,
  label = '등록',
}: RegisterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '7px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: '#ffffff',
        background: palette.primary,
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#4f46e5'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = palette.primary
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
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
  /** 호버 시 노출되는 수정 버튼 콜백 */
  onEdit?: () => void
  /** 호버 시 노출되는 삭제 버튼 콜백 */
  onDelete?: () => void
  /** 제목 앞에 표시되는 타입 배지 — 전체 보기에서 산/강 등 시각 구분 */
  typeBadge?: { label: string; color: string; bg: string } | null
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
  onEdit,
  onDelete,
  typeBadge,
}: RegionListItemProps) {
  const hasActions = !!(onEdit || onDelete)
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
      className="region-list-item"
      style={{
        padding: '12px 14px',
        margin: '6px 12px',
        borderRadius: 12,
        borderLeft: `3px solid ${selected ? palette.primary : 'transparent'}`,
        background: selected ? palette.bgSelected : palette.bg,
        border: `1px solid ${selected ? palette.primary : palette.border}`,
        boxShadow: selected
          ? '0 4px 12px rgba(99, 102, 241, 0.18)'
          : 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        position: 'relative',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: subtitle ? 4 : 0,
            minWidth: 0,
          }}
        >
          {typeBadge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: typeBadge.color,
                background: typeBadge.bg,
                padding: '2px 7px',
                borderRadius: 5,
                letterSpacing: '0.02em',
                flexShrink: 0,
                lineHeight: 1.4,
              }}
            >
              {typeBadge.label}
            </span>
          )}
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: palette.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {title}
          </div>
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
      {trailing && hasActions ? (
        <>
          {trailing}
          <ListItemActions
            palette={palette}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </>
      ) : hasActions ? (
        <ListItemActions
          palette={palette}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        trailing
      )}
    </div>
  )
}

interface ListItemActionsProps {
  palette: RegionPalette
  onEdit?: () => void
  onDelete?: () => void
}

function ListItemActions({ palette, onEdit, onDelete }: ListItemActionsProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        title="더보기"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: 'none',
          background: open ? palette.bgHover : 'transparent',
          color: palette.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = palette.bgHover
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent'
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            minWidth: 120,
            padding: '4px 0',
            margin: 0,
            listStyle: 'none',
            background: palette.bg,
            border: `1px solid ${palette.border}`,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            zIndex: 20,
          }}
        >
          {onEdit && (
            <li role="none">
              <button
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onEdit()
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  color: palette.text,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = palette.bgHover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                ✎ 수정
              </button>
            </li>
          )}
          {onDelete && (
            <li role="none">
              <button
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onDelete()
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                🗑 삭제
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

interface ListEmptyStateProps {
  palette: RegionPalette
  message?: string
  /** 빈 상태에서 표시할 액션 (예: + 등록 버튼) */
  action?: ReactNode
}

/** 리스트가 비었을 때 표시 */
export function ListEmptyState({
  palette,
  message = '항목이 없습니다',
  action,
}: ListEmptyStateProps) {
  return (
    <div
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        color: palette.textSecondary,
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div>{message}</div>
      {action}
    </div>
  )
}
