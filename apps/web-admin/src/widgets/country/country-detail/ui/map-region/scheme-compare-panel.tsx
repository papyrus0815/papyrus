/**
 * 체계 비교 패널 — 국가 불문 행정구역 체계 2개를 나란히 인포그래픽으로 비교.
 * 각 칼럼: 체계 선택 → 시행 기간 · 계층 분포(StackedSegmentBar) · 좌표/존속 비율 · 1차 구역 편제.
 */
import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiX } from 'react-icons/fi'

import {
  type AdminDivisionConfig,
  type AdminDivisionScheme,
  type AdministrativeDivision,
  type DivisionOwner,
  adminDivisionConfigKeys,
  administrativeDivisionKeys,
  useAllAdminDivisionSchemes,
} from '@/entities/country/api.administrative-divisions'
import {
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import { cityApi } from '@/shared/api/city'

import { countDescendants, formatYearRange, isAbolished } from './tree-utils'
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
        borderRadius: 8,
        padding: 20,
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 14,
          marginBottom: 16,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>
            행정구역 편제 체계 비교
          </div>
          <div
            style={{
              fontSize: 12,
              color: palette.textSecondary,
              marginTop: 2,
            }}
          >
            서로 다른 국가·시대의 행정구역 계층 구조와 광역 편제를 나란히 대조합니다
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="비교 닫기"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            height: 30,
            padding: '0 11px',
            fontSize: 12,
            fontWeight: 600,
            border: `1px solid ${palette.border}`,
            background: palette.bg,
            color: palette.text,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          <FiX size={13} /> 닫기
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: palette.textSecondary, fontSize: 13, padding: 20 }}>
          체계 목록을 불러오는 중…
        </div>
      ) : allSchemes.length === 0 ? (
        <div style={{ color: palette.textSecondary, fontSize: 13, padding: 20 }}>
          등록된 체계가 없습니다 — 먼저 각 국가의 행정구역 탭에서 체계를
          등록하세요.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
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
  const configs = useMemo(
    () =>
      (configsQuery.data ?? [])
        .slice()
        .sort((a, b) => a.divisionLevel - b.divisionLevel),
    [configsQuery.data],
  )

  const summary = useMemo(() => {
    const configMap = new Map<string, AdminDivisionConfig>()
    for (const c of configs) configMap.set(c.id, c)

    const tierCounts = new Map<string, { level: number; label: string; count: number }>()
    let total = 0
    let pinned = 0
    let abolished = 0

    const walk = (nodes: AdministrativeDivision[], depth: number) => {
      for (const n of nodes) {
        total += 1
        if (n.centerLat != null && n.centerLng != null) pinned += 1
        if (isAbolished(n)) abolished += 1
        const cfg = configMap.get(n.adminDivisionId)
        const level = cfg?.divisionLevel ?? depth
        const label = cfg?.divisionLabel || `${level}차`
        const key = `${level}:${label}`
        const cur = tierCounts.get(key)
        if (cur) cur.count += 1
        else tierCounts.set(key, { level, label, count: 1 })
        if (n.children?.length) walk(n.children, depth + 1)
      }
    }
    walk(roots, 1)

    const colors = palette.isDark
      ? ['#a5b4fc', '#38bdf8', '#34d399', '#fbbf24', '#c084fc']
      : ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed']

    const slices: SegmentSlice[] = [...tierCounts.values()]
      .sort((a, b) => a.level - b.level || b.count - a.count)
      .map((item, idx) => ({
        key: `${item.level}:${item.label}`,
        label: `${item.level}차 ${item.label}`,
        value: item.count,
        color: colors[idx % colors.length]!,
        meta: `${item.count}개`,
      }))

    return { total, pinned, abolished, slices }
  }, [roots, configs, palette.isDark])

  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        padding: 16,
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
          height: 34,
          padding: '0 10px',
          fontSize: 12.5,
          fontWeight: 600,
          border: `1px solid ${palette.border}`,
          borderRadius: 6,
          background: palette.bg,
          color: palette.text,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">비교할 체계 선택…</option>
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
            paddingTop: 36,
            textAlign: 'center',
            color: palette.textSecondary,
            fontSize: 12.5,
          }}
        >
          위 드롭다운에서 비교할 체계를 선택하세요
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: palette.text }}>
            {scheme.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: palette.textSecondary,
              marginTop: 2,
              marginBottom: 12,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {scheme.ownerName ? `${scheme.ownerName} · ` : ''}
            {formatYearRange(scheme.startDate, scheme.endDate)}
            {scheme.description ? ` — ${scheme.description}` : ''}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Stat
              palette={palette}
              label="1차 광역"
              value={`${roots.length.toLocaleString('ko-KR')}곳`}
            />
            <Stat
              palette={palette}
              label="전체 구역"
              value={`${summary.total.toLocaleString('ko-KR')}곳`}
            />
            <Stat
              palette={palette}
              label="좌표 등록"
              value={`${summary.pinned.toLocaleString('ko-KR')}곳`}
            />
          </div>

          {summary.slices.length > 0 && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: palette.bg,
                border: `1px solid ${palette.border}`,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: palette.textSecondary,
                  marginBottom: 6,
                }}
              >
                계층·단위 분포
              </div>
              <StackedSegmentBar slices={summary.slices} height={8} showPercent />
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px 10px',
                  marginTop: 8,
                  fontSize: 11.5,
                  color: palette.textSecondary,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {summary.slices.map((sl) => (
                  <span key={sl.key}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: sl.color,
                        marginRight: 4,
                      }}
                    />
                    {sl.label} <strong style={{ color: palette.text }}>{sl.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {divisionsQuery.isLoading ? (
            <div style={{ fontSize: 12, color: palette.textSecondary }}>
              구역 불러오는 중…
            </div>
          ) : roots.length === 0 ? (
            <div style={{ fontSize: 12, color: palette.textSecondary }}>
              이 체계에 등록된 구역이 없습니다
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: palette.textSecondary,
                  marginBottom: 6,
                }}
              >
                1차 광역 구역 ({roots.length}곳)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {roots.map((r) => {
                  const desc = countDescendants(r)
                  return (
                    <span
                      key={r.id}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: palette.text,
                        background: palette.bg,
                        border: `1px solid ${palette.border}`,
                        padding: '3px 9px',
                        borderRadius: 5,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      title={desc > 0 ? `하위 총 ${desc}곳` : undefined}
                    >
                      {r.name}
                      {desc > 0 && (
                        <span
                          style={{
                            marginLeft: 4,
                            color: palette.primary,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          +{desc}
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
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
    <div
      style={{
        padding: '8px 10px',
        borderRadius: 6,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: palette.textSecondary,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 800,
          color: palette.text,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}
