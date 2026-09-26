/**
 * 인물 사이드바 '바로가기' 모드 — 목록 지면(`/persons-timeline`)용.
 *
 * 목록 지면의 본문은 이미 전체 인물을 세기별·왕조·매트릭스 등으로 보여주고 검색·필터·정렬을
 * 갖는다. 사이드바가 같은 전체 목록과 같은 조작 도구를 한 벌 더 들면 두 목록이 서로 다른
 * 축(시대 vs 세기)으로 묶여 대조가 어렵고 폭만 먹는다. 그래서 여기서는 본문에 없는 것만 싣는다:
 *
 *   ★ 고정        — 사용자가 고정한 인물
 *   ◷ 최근 본 인물 — 상세·모달로 연 인물(최대 8)
 *   ⧉ 인물 그룹    — 7월위기·전시각의 같은 묶음, 누르면 묶음 상세로
 *
 * 고정·최근이 모두 비었으면(처음 온 사용자) 영향력 상위 인물로 빈 칸을 채운다.
 * 전체 목록 모드(PersonList)는 상세 지면에서 '지금 어디인가 + 옆 인물로 이동'을 맡는다.
 */
import React, { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FaChessKing, FaStar } from 'react-icons/fa'
import { FiClock, FiLayers, FiStar, FiTrendingUp, FiUsers } from 'react-icons/fi'

import { usePersonsInfographic } from '@/entities/person/api'
import {
  listPersonGroups,
  PERSON_GROUP_TYPE_META,
  type PersonGroup,
} from '@/shared/api/person-groups'
import {
  EntityListSidebar,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'
import {
  formatYear,
  useAdaptedPersons,
  usePersonInfographicFilterStore,
  type AdaptedPerson,
} from '@/widgets/person-infographic'

import { useRecentPersonsStore } from '../model/recent-persons.store'
import * as PersonStyles from './person-list.styles'

const PINNED_GROUP = '__pinned__'
const RECENT_GROUP = '__recent__'
const TOP_GROUP = '__top__'
const GROUPS_GROUP = '__person-groups__'
/** 인물 그룹 행 id 접두어 — 인물 id와 한 목록에 섞이므로 구분한다 */
export const PERSON_GROUP_ROW_PREFIX = 'group:'

const TOP_FALLBACK_COUNT = 8

function lifespanText(person: AdaptedPerson): string {
  const bornText = person.born == null ? '?' : formatYear(person.born)
  const diedText = person.isAlive
    ? '현재'
    : person.died == null
      ? '?'
      : formatYear(person.died)
  if (bornText === '?' && diedText === '?') return ''
  return `${bornText}–${diedText}`
}

function personRow(person: AdaptedPerson, groupId: string): EntitySidebarItem {
  return {
    id: person.id,
    name: person.name,
    meta: [
      person.country && person.country !== '미상' ? person.country : null,
      lifespanText(person),
    ],
    thumbnailUrl: person.profileImageUrl,
    metric: person.influence,
    mark:
      person.isMonarch || person.isHeadOfState ? (
        <PersonStyles.RoleMark
          aria-hidden
          title={person.isMonarch ? '군주' : '국가원수'}
          style={{ color: person.isMonarch ? '#b45309' : '#1d4ed8' }}
        >
          {person.isMonarch ? <FaChessKing size={9} /> : <FaStar size={9} />}
        </PersonStyles.RoleMark>
      ) : undefined,
    groupId,
  }
}

function personGroupRow(group: PersonGroup): EntitySidebarItem {
  return {
    id: `${PERSON_GROUP_ROW_PREFIX}${group.id}`,
    name: group.name,
    meta: [
      PERSON_GROUP_TYPE_META[group.type]?.label ?? null,
      `${group.memberCount}명`,
      group.countryName ? { text: group.countryName, shrink: true } : null,
    ],
    badgeIcon: <FiUsers size={14} />,
    noPin: true,
    ariaLabel: `인물 그룹 ${group.name}, ${group.memberCount}명`,
    groupId: GROUPS_GROUP,
  }
}

interface PersonQuickListProps {
  /** 인물 행 클릭 — 인물 id */
  onSelectPerson: (id: string) => void
  /** 인물 그룹 행 클릭 — 묶음 id */
  onSelectGroup: (groupId: string) => void
  onAdd: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function PersonQuickListInner({
  onSelectPerson,
  onSelectGroup,
  onAdd,
  collapsed = false,
  onToggleCollapse,
}: PersonQuickListProps) {
  const { isLoading, isError, refetch } = usePersonsInfographic()
  const allPersons = useAdaptedPersons()
  const pinnedList = usePersonInfographicFilterStore((state) => state.pinned)
  const togglePin = usePersonInfographicFilterStore((state) => state.togglePin)
  const recentIds = useRecentPersonsStore((state) => state.recentIds)

  // 인물 그룹 목록 페이지와 같은 쿼리 키 — 캐시를 공유한다(멤버 미포함 경량 목록)
  const { data: personGroups = [] } = useQuery({
    queryKey: ['person-groups-all', undefined],
    queryFn: () => listPersonGroups(),
    staleTime: 30_000,
  })

  const personsById = useMemo(
    () => new Map(allPersons.map((person) => [person.id, person])),
    [allPersons],
  )

  const { items, groups } = useMemo(() => {
    const rows: EntitySidebarItem[] = []
    const sections: EntitySidebarGroup[] = []
    const pinnedSet = new Set(pinnedList)

    const pinnedPeople = pinnedList
      .map((id) => personsById.get(id))
      .filter((person): person is AdaptedPerson => !!person)
    if (pinnedPeople.length > 0) {
      sections.push({
        id: PINNED_GROUP,
        name: '고정',
        accent: '#eab308',
        leadIcon: <FiStar size={10} />,
        isQuickAccess: true,
      })
      for (const person of pinnedPeople) rows.push(personRow(person, PINNED_GROUP))
    }

    const recentPeople = recentIds
      .filter((id) => !pinnedSet.has(id))
      .map((id) => personsById.get(id))
      .filter((person): person is AdaptedPerson => !!person)
    if (recentPeople.length > 0) {
      sections.push({
        id: RECENT_GROUP,
        name: '최근 본 인물',
        accent: '#06b6d4',
        leadIcon: <FiClock size={10} />,
        isQuickAccess: true,
      })
      for (const person of recentPeople) rows.push(personRow(person, RECENT_GROUP))
    }

    // 처음 온 사용자 — 고정·최근이 없으면 빈 칸 대신 영향력 상위로 출발점을 준다
    if (pinnedPeople.length === 0 && recentPeople.length === 0) {
      const top = [...allPersons]
        .sort((left, right) => right.influence - left.influence)
        .slice(0, TOP_FALLBACK_COUNT)
      if (top.length > 0) {
        sections.push({
          id: TOP_GROUP,
          name: '영향력 상위',
          accent: '#2563eb',
          leadIcon: <FiTrendingUp size={10} />,
          isQuickAccess: true,
        })
        for (const person of top) rows.push(personRow(person, TOP_GROUP))
      }
    }

    if (personGroups.length > 0) {
      sections.push({
        id: GROUPS_GROUP,
        name: '인물 그룹',
        accent: '#8b5cf6',
        leadIcon: <FiLayers size={10} />,
        isQuickAccess: true,
      })
      const orderedGroups = [...personGroups].sort(
        (left, right) =>
          (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name, 'ko'),
      )
      for (const group of orderedGroups) rows.push(personGroupRow(group))
    }

    return { items: rows, groups: sections }
  }, [pinnedList, recentIds, personsById, allPersons, personGroups])

  return (
    <EntityListSidebar
      title="인물"
      subtitle="바로가기"
      noun="인물"
      domainKey="person-quick"
      items={items}
      totalCount={allPersons.length}
      groups={groups}
      selectedId={null}
      onSelect={(id) => {
        if (id.startsWith(PERSON_GROUP_ROW_PREFIX))
          onSelectGroup(id.slice(PERSON_GROUP_ROW_PREFIX.length))
        else onSelectPerson(id)
      }}
      query=""
      onQueryChange={() => {}}
      hideFilters
      hasActiveFilter={false}
      pinnedIds={pinnedList}
      onTogglePin={togglePin}
      onAdd={onAdd}
      addLabel="인물 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiUsers size={16} />}
    />
  )
}

export const PersonQuickList = React.memo(PersonQuickListInner)
