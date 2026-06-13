/**
 * 체계 비교 패널 — 국가 불문 행정구역 체계 2개를 나란히 비교.
 * 각 칼럼: 체계 선택(전체 국가의 체계 목록) → 시행 기간·단위 구성·구역 수·1차 구역 목록.
 */
import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiX } from 'react-icons/fi'

import {
  type AdminDivisionScheme,
  type DivisionOwner,
  adminDivisionConfigKeys,
  administrativeDivisionKeys,
  useAllAdminDivisionSchemes,
} from '@/entities/country/api.administrative-divisions'
import { cityApi } from '@/shared/api/city'

import { formatYearRange } from './tree-utils'
import type { RegionPalette } from './use-region-palette'

function schemeOwner(s: AdminDivisionScheme): DivisionOwner {
  return s.countryId
    ? { countryId: s.countryId }
    : { historicalCountryId: s.historicalCountryId! }
}

interface SchemeComparePanelProps {
  palette: RegionPalette
  /** 진입 시 좌측 칼럼에 미리 선택할 체계 */
  initialLeftSchemeId?: string | null
  onClose: () => void
}

export function SchemeComparePanel({
  palette,
  initialLeftSchemeId,
  onClose,
}: SchemeComparePanelProps) {
  const { data: allSchemes = [], isLoading } = useAllAdminDivisionSchemes()
  const [leftId, setLeftId] = useState<string>(initialLeftSchemeId ?? '')
  const [rightId, setRightId] = useState<string>('')

  const left = allSchemes.find((s) => s.id === leftId) ?? null
  const right = allSchemes.find((s) => s.id === rightId) ?? null

  return (
    <section
      aria-label="체계 비교"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: palette.text }}>
            체계 비교
          </div>
          <div
            style={{ fontSize: 12.5, color: palette.textSecondary, marginTop: 2 }}
          >
            서로 다른 국가·시기의 행정구역 편제를 나란히 비교합니다
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="비교 닫기"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 600,
            border: `1px solid ${palette.border}`,
            background: palette.bg,
            color: palette.text,
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          <FiX size={13} /> 닫기
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: palette.textSecondary, fontSize: 13, padding: 24 }}>
          체계 목록을 불러오는 중…
        </div>
      ) : allSchemes.length === 0 ? (
        <div style={{ color: palette.textSecondary, fontSize: 13, padding: 24 }}>
          등록된 체계가 없습니다 — 먼저 각 국가의 행정구역 탭에서 체계를
          등록하세요.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            // 좁은 화면에선 자동으로 세로 스택 (칼럼 최소 280px)
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <CompareColumn
            palette={palette}
            allSchemes={allSchemes}
            scheme={left}
            onSelect={setLeftId}
          />
          <CompareColumn
            palette={palette}
            allSchemes={allSchemes}
            scheme={right}
            onSelect={setRightId}
          />
        </div>
      )}
    </section>
  )
}

interface CompareColumnProps {
  palette: RegionPalette
  allSchemes: AdminDivisionScheme[]
  scheme: AdminDivisionScheme | null
  onSelect: (id: string) => void
}

function CompareColumn({
  palette,
  allSchemes,
  scheme,
  onSelect,
}: CompareColumnProps) {
  const owner = scheme ? schemeOwner(scheme) : null

  // 키를 기존 prefix(administrative-divisions / admin-division-configs) 아래에 두어
  // useInvalidateForOwner의 broad invalidation에 함께 걸리게 한다 —
  // 별도 ad-hoc 키면 편집 후에도 staleTime(3분) 동안 비교 화면이 옛 데이터를 보여준다.
  const divisionsQuery = useQuery({
    queryKey: [...administrativeDivisionKeys.all, 'compare', scheme?.id ?? ''],
    queryFn: () => cityApi.getAdministrativeDivisions(owner!, scheme!.id),
    enabled: !!scheme,
  })
  const configsQuery = useQuery({
    queryKey: [...adminDivisionConfigKeys.all, 'compare', scheme?.id ?? ''],
    queryFn: () => cityApi.getAdminDivisionConfigs(owner!, scheme!.id),
    enabled: !!scheme,
  })

  const roots = divisionsQuery.data ?? []
  const totalCount = countTree(roots)
  const configs = (configsQuery.data ?? [])
    .slice()
    .sort((a, b) => a.divisionLevel - b.divisionLevel)

  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        padding: 18,
        background: palette.bgSecondary,
        minHeight: 220,
      }}
    >
      <select
        aria-label="비교할 체계 선택"
        value={scheme?.id ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 12px',
          fontSize: 13,
          fontWeight: 600,
          border: `1px solid ${palette.border}`,
          borderRadius: 10,
          background: palette.bg,
          color: palette.text,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">체계 선택…</option>
        {allSchemes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.ownerName ? `${s.ownerName} · ` : ''}
            {s.name} ({formatYearRange(s.startDate, s.endDate)})
          </option>
        ))}
      </select>

      {!scheme ? (
        <div
          style={{
            paddingTop: 40,
            textAlign: 'center',
            color: palette.textSecondary,
            fontSize: 13,
          }}
        >
          위에서 체계를 선택하세요
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>
            {scheme.name}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: palette.textSecondary,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            {scheme.ownerName ?? ''} ·{' '}
            {formatYearRange(scheme.startDate, scheme.endDate)}
            {scheme.description ? ` — ${scheme.description}` : ''}
          </div>

          <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
            <Stat palette={palette} label="1차 구역" value={`${roots.length}개`} />
            <Stat palette={palette} label="전체 구역" value={`${totalCount}개`} />
            <Stat
              palette={palette}
              label="단위 구성"
              value={
                configs.length > 0
                  ? configs
                      .map((c) => `${c.divisionLevel}차 ${c.divisionLabel}`)
                      .join(' · ')
                  : '—'
              }
            />
          </div>

          {divisionsQuery.isLoading ? (
            <div style={{ fontSize: 12.5, color: palette.textSecondary }}>
              구역 불러오는 중…
            </div>
          ) : roots.length === 0 ? (
            <div style={{ fontSize: 12.5, color: palette.textSecondary }}>
              이 체계에 등록된 구역이 없습니다
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {roots.map((r) => (
                <span
                  key={r.id}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: palette.text,
                    background: palette.bg,
                    border: `1px solid ${palette.border}`,
                    padding: '4px 10px',
                    borderRadius: 8,
                  }}
                  title={
                    (r.children?.length ?? 0) > 0
                      ? `하위 ${r.children!.length}개`
                      : undefined
                  }
                >
                  {r.name}
                  {(r.children?.length ?? 0) > 0 && (
                    <span
                      style={{
                        marginLeft: 4,
                        color: palette.textSecondary,
                        fontWeight: 500,
                      }}
                    >
                      {r.children!.length}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({
  palette,
  label,
  value,
}: {
  palette: RegionPalette
  label: string
  value: string
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: palette.textSecondary,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: palette.text }}>
        {value}
      </div>
    </div>
  )
}

function countTree(
  nodes: Array<{ children?: unknown[] }>,
): number {
  let n = 0
  for (const node of nodes) {
    n += 1
    if (Array.isArray(node.children) && node.children.length) {
      n += countTree(node.children as Array<{ children?: unknown[] }>)
    }
  }
  return n
}
