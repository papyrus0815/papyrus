/**
 * 조약 목록 사이드바 — `/treaties` 좌측.
 *
 * 그룹 축은 **서명 세기**다. 조약은 국가 하나에 매이지 않고(다자 조약·서명국 N개)
 * 유형은 셀렉트로 거르는 편이 자연스러워, 기업 사이드바의 국가 그룹핑을 그대로
 * 베끼지 않았다. 행 클릭 시 조약 상세로 이동한다.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiFileText } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import {
  TREATY_TYPE_LABELS,
  treatyApi,
  type TreatyDto,
  type TreatyType,
} from '@/shared/api/treaty'
import {
  formatCenturyLabel,
  getCenturyFromIso,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  filterSidebarItems,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

/** 서명일이 없거나 파싱 불가한 조약이 떨어지지 않도록 받는 그룹 */
const NO_CENTURY = '__no-century__'

const PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#ec4899',
]

/** 서명국 요약 — 앞 2개까지만 이름을 쓰고 나머지는 '외 N' */
export function summarizeSignatories(treaty: TreatyDto): string | null {
  const names = treaty.signatories
    .map(
      (signatory) =>
        signatory.country?.name ?? signatory.historicalCountry?.name ?? null,
    )
    .filter((name): name is string => !!name)
  if (names.length === 0) return null
  if (names.length <= 2) return names.join(' · ')
  return `${names.slice(0, 2).join(' · ')} 외 ${names.length - 2}`
}

/** 서명 연도 라벨 — BC 음수 연도 안전(문자열 slice는 '-0044'를 깨뜨린다) */
export function signYearLabel(signDate: string | null): string | null {
  const parts = parseIsoDateParts(signDate)
  if (!parts) return null
  return parts.year < 0 ? `기원전 ${-parts.year}년` : `${parts.year}년`
}

interface TreatyListSidebarProps {
  selectedId: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  onAdd?: () => void
}

export function TreatyListSidebar({
  selectedId,
  collapsed = false,
  onToggleCollapse,
  onAdd,
}: TreatyListSidebarProps) {
  const navigate = useNavigate()
  /* 카탈로그 본문과 같은 키 — 같은 응답을 두 번 받지 않는다 */
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['treaties', 'all'],
    queryFn: () => treatyApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('treaty-sidebar-pins')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { items, groups, typeOptions } = useMemo(() => {
    const list = data?.items ?? []
    const centuries = new Set<number>()
    let hasUndated = false
    const types = new Set<TreatyType>()
    for (const treaty of list) types.add(treaty.type)

    const rows = list
      .filter((treaty) => !typeFilter || treaty.type === typeFilter)
      .map<EntitySidebarItem>((treaty) => {
        const century = getCenturyFromIso(treaty.signDate)
        if (century === null) hasUndated = true
        else centuries.add(century)
        const parties = summarizeSignatories(treaty)
        return {
          id: treaty.id,
          name: treaty.name,
          meta: [
            signYearLabel(treaty.signDate),
            TREATY_TYPE_LABELS[treaty.type] ?? treaty.type,
            parties,
          ],
          thumbnailUrl:
            treaty.images.find((image) => image.isPrimary)?.imageUrl ??
            treaty.images[0]?.imageUrl ??
            null,
          badgeIcon: <FiFileText size={14} />,
          searchText: [treaty.name, treaty.alias, parties, treaty.location]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          groupId: century === null ? NO_CENTURY : String(century),
        }
      })

    /* 세기 그룹 안에서는 최신 서명일부터 — 목록·연표와 같은 시간 방향 */
    const sortKey = new Map(
      list.map((treaty) => [
        treaty.id,
        parseIsoDateParts(treaty.signDate)?.year ?? Number.NEGATIVE_INFINITY,
      ]),
    )
    rows.sort((left, right) => {
      const diff = (sortKey.get(right.id) ?? 0) - (sortKey.get(left.id) ?? 0)
      return diff !== 0 ? diff : left.name.localeCompare(right.name, 'ko')
    })

    const ordered: EntitySidebarGroup[] = [...centuries]
      .sort((left, right) => right - left)
      .map((century, index) => ({
        id: String(century),
        name: formatCenturyLabel(century),
        accent: PALETTE[index % PALETTE.length],
      }))
    if (hasUndated) {
      ordered.push({ id: NO_CENTURY, name: '서명일 미상', accent: '#a1a1aa' })
    }

    return {
      items: filterSidebarItems(rows, query),
      groups: ordered,
      typeOptions: [...types].sort((left, right) =>
        (TREATY_TYPE_LABELS[left] ?? left).localeCompare(
          TREATY_TYPE_LABELS[right] ?? right,
          'ko',
        ),
      ),
    }
  }, [data, query, typeFilter])

  return (
    <EntityListSidebar
      title="조약 목록"
      noun="조약"
      domainKey="treaty"
      items={items}
      totalCount={data?.total ?? data?.items.length ?? 0}
      groups={groups}
      selectedId={selectedId}
      onSelect={(id) => navigate(pathKeys.treaties.detail(id))}
      query={query}
      onQueryChange={setQuery}
      selects={[
        {
          id: 'type',
          label: '조약 유형',
          value: typeFilter,
          onChange: setTypeFilter,
          options: [
            { value: '', label: '유형 전체' },
            ...typeOptions.map((type) => ({
              value: type,
              label: TREATY_TYPE_LABELS[type] ?? type,
            })),
          ],
        },
      ]}
      hasActiveFilter={!!query.trim() || !!typeFilter}
      onClearFilters={() => {
        setQuery('')
        setTypeFilter('')
      }}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      onAdd={onAdd}
      addLabel="조약 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiFileText size={16} />}
    />
  )
}
