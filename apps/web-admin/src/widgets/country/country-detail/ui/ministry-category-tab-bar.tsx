/**
 * 중앙부처 — 카테고리 탭 (박스 없이 한 겹, 가로 스크롤)
 */
import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'

type MinistryCategoryTabBarProps = {
  categories: AdministrationDepartmentCategory[]
  /** categoryId → 부처 개수 */
  counts: Map<string, number>
  selectedCategoryId: string
  onSelectCategory: (categoryId: string) => void
  isDark: boolean
}

export function MinistryCategoryTabBar({
  categories,
  counts,
  selectedCategoryId,
  onSelectCategory,
  isDark,
}: MinistryCategoryTabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        paddingBottom: 14,
        marginBottom: 4,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#eceff3'}`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: isDark ? '#94a3b8' : '#64748b',
        }}
      >
        부처 카테고리
      </div>
      <div
        role="tablist"
        aria-label="부처 카테고리"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 8,
          alignItems: 'center',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 2,
          margin: '0 -2px',
          scrollbarWidth: 'thin',
        }}
      >
        {categories.map((cat) => {
          const n = counts.get(cat.id) ?? 0
          const active = selectedCategoryId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              id={`ministry-cat-tab-${cat.id}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelectCategory(cat.id)}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 13px',
                fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                letterSpacing: '-0.02em',
                borderRadius: 999,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: active
                  ? `1px solid ${isDark ? 'rgba(129, 140, 248, 0.45)' : '#c7d2fe'}`
                  : '1px solid transparent',
                background: active
                  ? isDark
                    ? 'rgba(99, 102, 241, 0.16)'
                    : '#eef2ff'
                  : 'transparent',
                color: active
                  ? isDark
                    ? '#e0e7ff'
                    : '#4338ca'
                  : isDark
                    ? '#94a3b8'
                    : '#64748b',
                transition:
                  'background 0.14s, border-color 0.14s, color 0.14s',
              }}
            >
              {cat.name}
              <span
                style={{
                  minWidth: 22,
                  height: 22,
                  padding: '0 7px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: active
                    ? isDark
                      ? 'rgba(0,0,0,0.28)'
                      : 'rgba(99, 102, 241, 0.12)'
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9',
                  color: active
                    ? isDark
                      ? '#e2e8f0'
                      : '#4338ca'
                    : isDark
                      ? '#64748b'
                      : '#94a3b8',
                }}
              >
                {n}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
