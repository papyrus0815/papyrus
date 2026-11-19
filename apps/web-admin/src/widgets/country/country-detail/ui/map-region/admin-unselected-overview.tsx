/**
 * 행정구역 미선택 시 우측 상세 패널에 노출되는 총람 카드 그리드.
 */
import { FiMapPin } from 'react-icons/fi'

import { formatYearRange } from './tree-utils'
import type { RegionPalette } from './use-region-palette'

export interface AdminOverviewRow {
  id: string
  name: string
  localName: string | null
  divisionLabel: string
  descendantCount: number
  abolished: boolean
  establishedDate: string | null
  abolishedDate: string | null
  centerLat?: number | null
  centerLng?: number | null
}

interface AdminUnselectedOverviewProps<Row extends AdminOverviewRow> {
  palette: RegionPalette
  title: string
  rows: Row[]
  onSelectRow: (row: Row) => void
}

export function AdminUnselectedOverview<Row extends AdminOverviewRow>({
  palette,
  title,
  rows,
  onSelectRow,
}: AdminUnselectedOverviewProps<Row>) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingBottom: 10,
          marginBottom: 12,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: palette.text,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: palette.textSecondary,
              marginTop: 2,
            }}
          >
            카드를 클릭하면 상세 변천사·인라인 편집 및 지도 포커스로 전환됩니다
            (키보드 ↑↓ 지원)
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: palette.primary,
            background: palette.badgeBg,
            padding: '2px 7px',
            borderRadius: 4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rows.length.toLocaleString('ko-KR')}곳
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
          gap: 8,
        }}
      >
        {rows.slice(0, 24).map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelectRow(row)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 5,
              padding: '10px 12px',
              borderRadius: 6,
              border: `1px solid ${palette.border}`,
              background: palette.bgSecondary,
              textAlign: 'left',
              cursor: 'pointer',
              opacity: row.abolished ? 0.68 : 1,
              fontVariantNumeric: 'tabular-nums',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = palette.primary
              event.currentTarget.style.background = palette.bgHover
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = palette.border
              event.currentTarget.style.background = palette.bgSecondary
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: palette.text,
                  textDecoration: row.abolished ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.name}
              </span>
              {row.divisionLabel && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: palette.primary,
                    background: palette.badgeBg,
                    padding: '1px 6px',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {row.divisionLabel}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
                fontSize: 11,
                color: palette.textSecondary,
              }}
            >
              {row.localName && <span>{row.localName}</span>}
              {(row.establishedDate || row.abolishedDate) && (
                <span>
                  {formatYearRange(row.establishedDate, row.abolishedDate)}
                </span>
              )}
              {row.descendantCount > 0 && (
                <span style={{ color: palette.primary, fontWeight: 700 }}>
                  하위 {row.descendantCount}곳
                </span>
              )}
              {row.centerLat != null && row.centerLng != null && (
                <FiMapPin size={10} style={{ color: palette.primary }} />
              )}
            </div>
          </button>
        ))}
      </div>
      {rows.length > 24 && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11.5,
            color: palette.textSecondary,
            textAlign: 'right',
          }}
        >
          좌측 원장 목록에서 전체 {rows.length.toLocaleString('ko-KR')}곳을
          탐색할 수 있습니다
        </div>
      )}
    </div>
  )
}
