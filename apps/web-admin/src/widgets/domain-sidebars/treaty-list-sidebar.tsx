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
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyType,
  treatyApi,
  treatyTypeTone,
} from '@/shared/api/treaty'
import {
  formatCenturyLabel,
  getCenturyFromIso,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import {
  type TreatyListReturnState,
  parseTreatyListState,
  readListSearch,
  treatyListSearchOf,
} from '@/shared/lib/treaty-list-state'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  type EntitySidebarGroup,
  type EntitySidebarItem,
  filterSidebarItems,
  useSidebarPins,
} from '@/widgets/entity-list-sidebar'

/** 서명일이 없거나 파싱 불가한 조약이 떨어지지 않도록 받는 그룹 */
const NO_CENTURY = '__no-century__'

/**
 * 세기 점 색 — 사건 사이드바와 같은 **단조 감쇠 ramp**(최신 인디고 → 먼 과거 바랜 슬레이트).
 * 예전엔 7색 순환(파랑·보라·청록·주황…)이라 색이 아무것도 말하지 않으면서, 행마다 붙은 유형 색
 * 배지(평·동·군…)와 한 줄에서 경쟁했다. 색은 이제 '얼마나 오래됐나' 하나만 말한다.
 */
const RAMP_NEW: [number, number, number] = [0x63, 0x66, 0xf1]
const RAMP_OLD: [number, number, number] = [0x94, 0xa3, 0xb8]

function centuryRampColor(index: number, total: number): string {
  const ratio = total <= 1 ? 0 : index / (total - 1)
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * ratio)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(RAMP_NEW[0], RAMP_OLD[0])}${channel(
    RAMP_NEW[1],
    RAMP_OLD[1],
  )}${channel(RAMP_NEW[2], RAMP_OLD[2])}`
}

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
  const location = useLocation()
  const themeMode = useTheme().mode
  /* 카탈로그 본문과 같은 키 — 같은 응답을 두 번 받지 않는다 */
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['treaties', 'all'],
    queryFn: () => treatyApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('treaty-sidebar-pins')
  /*
   * 처음 필터는 **들어온 목록**에서 — `?type=PEACE`로 7건을 보다 상세에 들어오면 사이드바도
   * 7건으로 시작한다(예전엔 늘 '유형 전체' 23건이라 방금 걸어 둔 필터가 왼쪽에서 풀렸다).
   * 사이드바는 목록(/treaties)엔 없고 상세에서만 마운트되므로 마운트 시점의 state가 곧 그 목록이다.
   */
  const [entryState] = useState(() =>
    parseTreatyListState(new URLSearchParams(readListSearch(location.state))),
  )
  const [query, setQuery] = useState(entryState.query)
  const [typeFilter, setTypeFilter] = useState<string>(entryState.type)

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
          /* 유형은 배지(평·동·불…)가 이미 말한다 — 같은 줄에 '평화 조약'을 또 쓰면 서명국이
             밀려 '오스트리아 ㄷ'처럼 글자 중간에서 잘렸다. 서명국은 shrink로 말줄임. */
          meta: [
            signYearLabel(treaty.signDate),
            parties ? { text: parties, shrink: true } : null,
          ],
          thumbnailUrl:
            treaty.images.find((image) => image.isPrimary)?.imageUrl ??
            treaty.images[0]?.imageUrl ??
            null,
          /* 사건 목록과 같은 행 문법 — 이미지가 없으면 **유형 첫 글자**(평·동·불·무…)를
             유형 색으로 칠한다. 예전엔 20행 전부 같은 문서 아이콘이라 배지가 아무것도 말하지 않았다. */
          badgeText: (TREATY_TYPE_LABELS[treaty.type] ?? '조').slice(0, 1),
          accentColor: treatyTypeTone(treaty.type, themeMode),
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
        accent: centuryRampColor(index, centuries.size),
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
  }, [data, query, typeFilter, themeMode])

  return (
    <EntityListSidebar
      title="조약 목록"
      noun="조약"
      domainKey="treaty"
      items={items}
      totalCount={data?.total ?? data?.items.length ?? 0}
      groups={groups}
      selectedId={selectedId}
      onSelect={(id) => {
        /* 지금 사이드바 필터를 들고 간다 — 상세의 '목록' 브레드크럼이 이 필터의 목록으로 돌아간다 */
        const returnState: TreatyListReturnState = {
          treatyListSearch: treatyListSearchOf({
            query: query.trim(),
            type:
              typeFilter in TREATY_TYPE_LABELS
                ? (typeFilter as TreatyType)
                : '',
            sort: entryState.sort,
          }),
        }
        navigate(pathKeys.treaties.detail(id), { state: returnState })
      }}
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
