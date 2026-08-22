/**
 * 기업 목록 사이드바 — `/companies` 좌측.
 * 국가 그룹핑(기업의 자연 축) + 상태 필터. 행 클릭 시 기업 상세로 이동.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiBriefcase } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { companyApi, type CompanyStatus } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  filterSidebarItems,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

const NO_COUNTRY = '__no-country__'
const PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899']

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '운영 중',
  DISSOLVED: '해산',
  MERGED: '합병',
  ACQUIRED: '피인수',
  BANKRUPT: '파산',
}

interface CompanyListSidebarProps {
  selectedId: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  onAdd?: () => void
}

export function CompanyListSidebar({
  selectedId,
  collapsed = false,
  onToggleCollapse,
  onAdd,
}: CompanyListSidebarProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['companies', 'sidebar'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('company-sidebar-pins')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { items, groups, statusOptions } = useMemo(() => {
    const list = data ?? []
    const groupMeta = new Map<string, string>()
    const statuses = new Set<string>()

    const rows = list
      .filter((company) => !statusFilter || company.status === statusFilter)
      .map<EntitySidebarItem>((company) => {
        const countryName =
          company.country?.name ?? company.historicalCountry?.name ?? null
        const groupId = countryName ?? NO_COUNTRY
        if (!groupMeta.has(groupId)) {
          groupMeta.set(groupId, countryName ?? '국가 미지정')
        }
        return {
          id: company.id,
          name: company.name,
          meta: [
            company.shortName,
            countryName,
            company.status ? (STATUS_LABEL[company.status] ?? company.status) : null,
          ],
          thumbnailUrl: company.logoUrl
            ? getUploadImageUrl(company.logoUrl)
            : null,
          searchText: [company.name, company.shortName, company.localName, countryName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          groupId,
        }
      })
    for (const company of list) {
      if (company.status) statuses.add(company.status)
    }
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))

    const ordered: EntitySidebarGroup[] = [...groupMeta.entries()]
      .filter(([groupId]) => groupId !== NO_COUNTRY)
      .sort((left, right) => left[1].localeCompare(right[1], 'ko'))
      .map(([groupId, name], index) => ({
        id: groupId,
        name,
        accent: PALETTE[index % PALETTE.length],
      }))
    if (groupMeta.has(NO_COUNTRY)) {
      ordered.push({ id: NO_COUNTRY, name: '국가 미지정', accent: '#a1a1aa' })
    }

    return {
      items: filterSidebarItems(rows, query),
      groups: ordered,
      statusOptions: [...statuses].sort(),
    }
  }, [data, query, statusFilter])

  return (
    <EntityListSidebar
      title="기업 목록"
      noun="기업"
      domainKey="company"
      items={items}
      totalCount={data?.length ?? 0}
      groups={groups}
      selectedId={selectedId}
      onSelect={(id) => navigate(pathKeys.companies.detail(id))}
      query={query}
      onQueryChange={setQuery}
      selects={[
        {
          id: 'status',
          label: '상태',
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: '', label: '상태 전체' },
            ...statusOptions.map((status) => ({
              value: status,
              label: STATUS_LABEL[status] ?? status,
            })),
          ],
        },
      ]}
      hasActiveFilter={!!query.trim() || !!statusFilter}
      onClearFilters={() => {
        setQuery('')
        setStatusFilter('')
      }}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      onAdd={onAdd}
      addLabel="기업 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiBriefcase size={16} />}
    />
  )
}
