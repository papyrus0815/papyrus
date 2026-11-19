import { type ReactNode, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import {
  FiEdit2,
  FiMapPin,
  FiMoreHorizontal,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi'

import { Z_INDEX } from '@/shared/styles/z-index'

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
 * 좌측 목록 패널 컨테이너 — 헤더/툴바 + 스크롤 원장 영역.
 * 행정구역(검색)·자연(pill)·인프라(pill) 모두 동일한 Event-Ledger 카드 골격 사용.
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
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: 'none',
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

/** pill 형태 필터 버튼 — 행정구역 상태/자연지리/인프라 카테고리 토글 */
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
        height: 26,
        padding: '0 9px',
        borderRadius: 6,
        border: `1px solid ${active ? palette.primary : palette.border}`,
        background: active ? palette.bgSelected : 'transparent',
        color: active ? palette.primary : palette.textSecondary,
        fontSize: 11.5,
        fontWeight: active ? 700 : 600,
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
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
        padding: '8px 12px',
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
          gap: 5,
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

/** "+ 등록" 액션 버튼 */
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 30,
        padding: '0 11px',
        fontSize: 12,
        fontWeight: 700,
        color: palette.isDark ? '#0e0f12' : '#ffffff',
        background: palette.primary,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = palette.isDark
          ? '#c7d2fe'
          : '#4338ca'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = palette.primary
      }}
    >
      <FiPlus size={13} />
      <span>{label}</span>
    </button>
  )
}

interface RegionListItemProps {
  palette: RegionPalette
  selected: boolean
  onSelect: () => void
  title: string
  subtitle?: ReactNode
  /** 우측 보조(개수 등) */
  trailing?: ReactNode
  /** 호버 시 노출되는 수정 버튼 콜백 */
  onEdit?: () => void
  /** 호버 시 노출되는 삭제 버튼 콜백 */
  onDelete?: () => void
  /** 제목 앞에 표시되는 타입 배지 */
  typeBadge?: { label: string; color: string; bg: string } | null
  /** 좌표 보유 표시 */
  hasCoords?: boolean
  /** 폐지 여부 (시각적 감쇠) */
  abolished?: boolean
}

/**
 * 리스트 항목 원장 행 — Event-Ledger 플랫 1px 헤어라인 행 + 선택 시 좌측 3px 인디고 강조선.
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
  hasCoords,
  abolished,
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
        padding: '10px 12px 10px 11px',
        margin: 0,
        borderRadius: 0,
        borderLeft: `3px solid ${selected ? palette.primary : 'transparent'}`,
        borderBottom: `1px solid ${palette.border}`,
        background: selected ? palette.bgSelected : palette.bg,
        boxShadow: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.12s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = palette.bgHover
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = palette.bg
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          opacity: abolished ? 0.62 : 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: subtitle ? 3 : 0,
            minWidth: 0,
          }}
        >
          {typeBadge && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: typeBadge.color,
                background: typeBadge.bg,
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.01em',
                flexShrink: 0,
                lineHeight: 1.45,
              }}
            >
              {typeBadge.label}
            </span>
          )}
          <div
            style={{
              fontSize: 13.5,
              fontWeight: selected ? 700 : 600,
              color: palette.text,
              textDecoration: abolished ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {title}
          </div>
          {hasCoords && (
            <FiMapPin
              size={11}
              title="중심 좌표 등록됨"
              style={{
                color: palette.primary,
                opacity: 0.78,
                flexShrink: 0,
              }}
            />
          )}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 11.5,
              color: palette.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {trailing && hasActions ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {trailing}
          <ListItemActions
            palette={palette}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
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
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
    openUpward: boolean
  } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const calculatePosition = () => {
    const button = buttonRef.current
    if (!button) return null
    const rect = button.getBoundingClientRect()
    const menuWidth = 124
    const estimatedHeight = 84
    const openUpward =
      window.innerHeight - rect.bottom < estimatedHeight &&
      rect.top > estimatedHeight
    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    )
    const top = openUpward ? rect.top - 4 : rect.bottom + 4
    return { top, left, openUpward }
  }

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handleScrollOrResize = () => {
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  const menuPortal =
    open && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            role="menu"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              left: menuPosition.left,
              top: menuPosition.top,
              transform: menuPosition.openUpward
                ? 'translateY(-100%)'
                : undefined,
              minWidth: 124,
              padding: '4px',
              margin: 0,
              listStyle: 'none',
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              borderRadius: 6,
              boxShadow: palette.isDark
                ? '0 8px 24px rgba(0, 0, 0, 0.45)'
                : '0 8px 20px rgba(15, 23, 42, 0.12)',
              zIndex: Z_INDEX.ACTION_MENU,
            }}
          >
            {onEdit && (
              <li role="none">
                <button
                  role="menuitem"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpen(false)
                    onEdit()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 9px',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: 4,
                    background: 'transparent',
                    color: palette.text,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = palette.bgHover
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'transparent'
                  }}
                >
                  <FiEdit2 size={12} />
                  <span>모달 편집</span>
                </button>
              </li>
            )}
            {onDelete && (
              <li role="none">
                <button
                  role="menuitem"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpen(false)
                    onDelete()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 9px',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: 4,
                    background: 'transparent',
                    color: palette.textSecondary,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = palette.isDark
                      ? 'rgba(239, 68, 68, 0.14)'
                      : '#fef2f2'
                    event.currentTarget.style.color = palette.isDark
                      ? '#f87171'
                      : '#dc2626'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'transparent'
                    event.currentTarget.style.color = palette.textSecondary
                  }}
                >
                  <FiTrash2 size={12} />
                  <span>삭제</span>
                </button>
              </li>
            )}
          </ul>,
          document.fullscreenElement ?? document.body,
        )
      : null

  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          if (open) {
            setOpen(false)
          } else {
            const nextPosition = calculatePosition()
            if (nextPosition) {
              setMenuPosition(nextPosition)
              setOpen(true)
            }
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        title="더보기"
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          border: 'none',
          background: open ? palette.bgHover : 'transparent',
          color: palette.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = palette.bgHover
        }}
        onMouseLeave={(event) => {
          if (!open) event.currentTarget.style.background = 'transparent'
        }}
      >
        <FiMoreHorizontal size={14} />
      </button>
      {menuPortal}
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
        padding: '28px 20px',
        textAlign: 'center',
        color: palette.textSecondary,
        fontSize: 12.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div>{message}</div>
      {action}
    </div>
  )
}
