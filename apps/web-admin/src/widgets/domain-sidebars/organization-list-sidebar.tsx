/**
 * 조직 목록 사이드바 — `/legislature`(저원) 좌측.
 *
 * 저원 지면은 오래 플레이스홀더였다. 실제 데이터는 organizations(입법·행정·정당 등)이므로
 * 좌측을 그 목록으로 연결한다 — 빈 상자 대신 실물을 붙이는 게 정직하고 입력 유도도 된다.
 * 유형(type) 그룹핑.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiColumns } from 'react-icons/fi'

import { getApiConnection } from '@/shared/api/client'
import { getOrganizations } from '@/shared/api/organizations'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  EntityListSidebar,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

const PALETTE = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899']

const TYPE_LABEL: Record<string, string> = {
  INTERGOVERNMENTAL_ORG: '국제기구',
  MULTILATERAL_FORUM: '다자 협의체·블록',
  MILITARY_ALLIANCE: '군사동맹',
  GOVERNMENT_AGENCY: '정부·행정기구',
  POLITICAL_PARTY: '정당',
  NGO: 'NGO',
  TRADE_UNION: '노동조합',
  RELIGIOUS_ORG: '종교단체',
  BUSINESS_ASSOCIATION: '상공·업계단체',
  EDUCATION: '교육·학술기관',
  MILITARY_ACADEMY: '군사교육기관',
  OTHER: '기타',
}

interface OrganizationListSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function OrganizationListSidebar({
  collapsed = false,
  onToggleCollapse,
}: OrganizationListSidebarProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['organizations', 'sidebar'],
    queryFn: () => getOrganizations(getApiConnection(), { excludeCompanies: true }),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('organization-sidebar-pins')
  const { selectedId, select } = useAnchorSelection('organizationId')
  const [query, setQuery] = useState('')

  const { items, groups } = useMemo(() => {
    const list = data ?? []
    const groupMeta = new Map<string, string>()
    const rows = list.map<EntitySidebarItem>((organization) => {
      const groupId = organization.type ?? 'OTHER'
      if (!groupMeta.has(groupId)) {
        groupMeta.set(groupId, TYPE_LABEL[groupId] ?? groupId)
      }
      return {
        id: organization.id,
        name: organization.name,
        meta: [organization.shortName, TYPE_LABEL[groupId] ?? groupId],
        thumbnailUrl: organization.logoUrl
          ? getUploadImageUrl(organization.logoUrl)
          : null,
        groupId,
      }
    })
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))

    const ordered: EntitySidebarGroup[] = [...groupMeta.entries()]
      .sort((left, right) => left[1].localeCompare(right[1], 'ko'))
      .map(([groupId, name], index) => ({
        id: groupId,
        name,
        accent: PALETTE[index % PALETTE.length],
      }))

    return { items: filterSidebarItems(rows, query), groups: ordered }
  }, [data, query])

  return (
    <EntityListSidebar
      title="조직 목록"
      noun="조직"
      domainKey="organization"
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
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiColumns size={16} />}
    />
  )
}
