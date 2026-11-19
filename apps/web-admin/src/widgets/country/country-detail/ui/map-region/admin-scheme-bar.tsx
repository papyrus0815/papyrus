/**
 * 시기별 행정구역 편제 체계 바 (전체 · 시대 체계 칩 · 체계 등록 · 단위 관리 · 체계 비교).
 */
import type { ReactNode } from 'react'

import { FiEdit2, FiPlus, FiRepeat, FiSettings } from 'react-icons/fi'

import type { AdminDivisionScheme } from '@/entities/country/api.administrative-divisions'

import { formatYearRange } from './tree-utils'
import type { RegionPalette } from './use-region-palette'

interface AdminSchemeBarProps {
  palette: RegionPalette
  schemes: AdminDivisionScheme[]
  activeSchemeId: string | null
  onSelectScheme: (schemeId: string | null) => void
  onCreateScheme: () => void
  onEditScheme: (scheme: AdminDivisionScheme) => void
  onOpenConfigModal: () => void
  onOpenCompare: () => void
}

export function AdminSchemeBar({
  palette,
  schemes,
  activeSchemeId,
  onSelectScheme,
  onCreateScheme,
  onEditScheme,
  onOpenConfigModal,
  onOpenCompare,
}: AdminSchemeBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        padding: '8px 12px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: palette.textSecondary,
          marginRight: 4,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        편제 체계
      </span>
      <SchemeChip
        palette={palette}
        active={!activeSchemeId}
        onClick={() => onSelectScheme(null)}
      >
        전체
      </SchemeChip>
      {schemes.map((scheme) => (
        <SchemeChip
          key={scheme.id}
          palette={palette}
          active={activeSchemeId === scheme.id}
          onClick={() => onSelectScheme(scheme.id)}
          onEdit={
            activeSchemeId === scheme.id
              ? () => onEditScheme(scheme)
              : undefined
          }
        >
          {scheme.name}
          <span
            style={{
              marginLeft: 5,
              fontWeight: 500,
              opacity: 0.78,
              fontSize: 11,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatYearRange(scheme.startDate, scheme.endDate)} ·{' '}
            {scheme.divisionCount}
          </span>
        </SchemeChip>
      ))}
      <button
        type="button"
        onClick={onCreateScheme}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 28,
          padding: '0 9px',
          fontSize: 11.5,
          fontWeight: 600,
          border: `1px dashed ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <FiPlus size={12} />
        <span>체계 등록</span>
      </button>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onOpenConfigModal}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 28,
          padding: '0 9px',
          fontSize: 11.5,
          fontWeight: 600,
          border: `1px solid ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <FiSettings size={12} />
        <span>단위 관리</span>
      </button>
      <button
        type="button"
        onClick={onOpenCompare}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 28,
          padding: '0 9px',
          fontSize: 11.5,
          fontWeight: 600,
          border: `1px solid ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <FiRepeat size={12} />
        <span>체계 비교</span>
      </button>
    </div>
  )
}

interface SchemeChipProps {
  palette: RegionPalette
  active: boolean
  onClick: () => void
  onEdit?: () => void
  children: ReactNode
}

function SchemeChip({
  palette,
  active,
  onClick,
  onEdit,
  children,
}: SchemeChipProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        style={{
          height: 28,
          padding: '0 10px',
          fontSize: 12,
          fontWeight: active ? 700 : 600,
          borderRadius: 6,
          border: `1px solid ${active ? palette.primary : palette.border}`,
          background: active ? palette.badgeBg : 'transparent',
          color: active ? palette.primary : palette.text,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="체계 편집"
          title="체계 편집"
          style={{
            width: 22,
            height: 22,
            padding: 0,
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            color: palette.textSecondary,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FiEdit2 size={11} />
        </button>
      )}
    </span>
  )
}
