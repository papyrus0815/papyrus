/**
 * 대륙 목록 사이드바 — `/continents` 좌측.
 * 대륙은 개수가 적어 그룹 축이 필요 없다 — 단일 '대륙' 그룹으로 평면 나열한다.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiGlobe } from 'react-icons/fi'

import { useCountries } from '@/features/country/api'
import { getAllContinents } from '@/shared/api/continents'
import { formatAreaKo, formatPopulationKo } from '@/shared/lib/number-format'
import { getContinentColor } from '@/widgets/country/country-list/model/continent-colors'
import {
  EntityListSidebar,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

const ALL_GROUP = '__continents__'

interface ContinentListSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onAdd?: () => void
}

export function ContinentListSidebar({
  collapsed = false,
  onToggleCollapse,
  onAdd,
}: ContinentListSidebarProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['continents', 'sidebar'],
    queryFn: () => getAllContinents(),
    staleTime: 300_000,
  })
  /* 대륙 자체 레코드의 countryCount·population·areaSqKm는 실DB에서 전부 null이다(실측 7/7).
     지면 표가 그러듯 **국가 목록에서 집계**한다.
     ⚠️ 훅은 반드시 features 쪽을 쓸 것 — entities/features 두 레이어가 쿼리 키가 달라
     캐시가 갈린다. 지면(use-continent-page)이 쓰는 것과 같아야 추가 요청이 안 생긴다. */
  const { data: countries } = useCountries()
  const { pinnedIds, togglePin } = useSidebarPins('continent-sidebar-pins')
  const { selectedId, select } = useAnchorSelection('continentId')
  const [query, setQuery] = useState('')

  /** 대륙 id → 소속 국가의 수·인구·면적 합 (지면 표와 같은 계산) */
  const rollup = useMemo(() => {
    const byContinent = new Map<
      string,
      { count: number; population: number; area: number }
    >()
    for (const country of countries ?? []) {
      const key = country.continentId
      if (!key) continue
      const acc = byContinent.get(key) ?? { count: 0, population: 0, area: 0 }
      acc.count += 1
      acc.population += Number(country.population ?? 0) || 0
      acc.area += Number(country.areaSqKm ?? 0) || 0
      byContinent.set(key, acc)
    }
    return byContinent
  }, [countries])

  const items = useMemo<EntitySidebarItem[]>(() => {
    const rows = (data ?? []).map<EntitySidebarItem>((continent) => {
      const stats = rollup.get(continent.id)
      return {
        id: continent.id,
        name: continent.name,
        /* 둘째 줄은 국가 목록 행과 **같은 문법** — 인구 · 면적 두 토막.
           예전엔 '영문명 · ISO'였는데, 왼쪽 배지가 이미 그 두 글자를 말하고 있어서 한 행에
           같은 값이 두 번 섰다('AN' 배지 + 'Antarctica · AN').
           영문명도 뺐다: 230px 남짓한 줄에 세 토막을 넣으면 먼저 줄어드는 게 영문명이라
           'South...'로 잘려 아무 값도 못 했다. 대신 아래 searchText에 남겨 **검색으로는
           계속 걸린다**(영문명·ISO 모두). 수치가 없는 대륙은 둘째 줄이 빈다 — 골격은
           그대로 두고 빈 자리를 지어내지 않는다. */
        meta: [
          stats?.population ? formatPopulationKo(stats.population) : null,
          stats?.area ? formatAreaKo(stats.area) : null,
        ],
        /* 화면에서 뺀 영문명·ISO를 검색 색인에는 남긴다 — 계약상 소문자여야 한다. */
        searchText: [continent.name, continent.enName, continent.isoCode]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        badgeText: (continent.isoCode ?? continent.name).slice(0, 2),
        /* 우측 배지 = 국가 수. 인물 목록이 영향력을 세우는 자리이고, 대륙에서 '몇 나라인지'가
           그만큼 자주 찾는 수다. 0은 계약상 그려지지 않는다(남극·오세아니아). */
        metric: stats?.count ?? null,
        groupId: ALL_GROUP,
      }
    })
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    return filterSidebarItems(rows, query)
  }, [data, rollup, query])

  // 그룹 accent는 첫 대륙 색을 쓰지 않고 중립으로 — 행마다 색이 다른 게 아니라 그룹이 하나뿐이다.
  const groups = useMemo<EntitySidebarGroup[]>(
    () => [
      {
        id: ALL_GROUP,
        name: '대륙',
        accent: getContinentColor({ continentName: null }),
        alwaysExpanded: true,
      },
    ],
    [],
  )

  return (
    <EntityListSidebar
      title="대륙 목록"
      noun="대륙"
      domainKey="continent"
      items={items}
      totalCount={data?.length ?? 0}
      groups={groups}
      selectedId={selectedId}
      onSelect={select}
      query={query}
      onQueryChange={setQuery}
      hasActiveFilter={!!query.trim()}
      onClearFilters={() => setQuery('')}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      onAdd={onAdd}
      addLabel="대륙 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiGlobe size={16} />}
    />
  )
}
