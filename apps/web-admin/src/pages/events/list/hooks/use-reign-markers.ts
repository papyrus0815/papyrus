/**
 * 사건 목록의 군주 즉위 구분선 데이터.
 *
 * 선택·토글 없이 **항상** 연대 흐름에 녹아 있다. 대신 범위를 목록이 스스로 정한다 —
 * 지금 목록에 나온 사건들의 관련 국가(현대·역사)의 군주만 싣는다. 국가 필터가 걸려
 * 있으면 그 나라 하나로 좁힌다(조선으로 거르면 임진왜란의 관련국 일본 천황까지 끼지 않게).
 */
import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import type { FlattenedHierarchyItem } from '@/features/event-hierarchy/model'
import { FILTER_ALL } from '@/features/event-list/lib'
import { companyApi } from '@/shared/api/company'
import {
  getHeadTenureTimeline,
  getSovereignReignTimeline,
} from '@/shared/api/sovereign-reigns'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  type CompanyTimelineItem,
  type HeadTenureTimelineItem,
  type HistoricalCountryTimelineItem,
  type ReignMarker,
  type SovereignReignTimelineItem,
  mergeLeaderMarkers,
  toHeadTenureMarkers,
  toReignMarkers,
  toCompanyFoundingMarkers,
  toStatehoodMarkers,
} from '@/widgets/event-list-compact/lib/reign-markers'

import type { HistoricalEvent } from '../../create/events.types'

export const sovereignReignTimelineKey = ['sovereign-reign-timeline'] as const
export const headTenureTimelineKey = ['head-tenure-timeline'] as const

const NO_MARKERS: ReignMarker[] = []

/** 사건 제목이 그 나라의 건국·멸망을 말하는가 — 손으로 만든 건국 사건과 표지가 겹치지 않게 */
const FOUNDING_WORDS = /건국|성립|수립|창건|개국/
const DISSOLUTION_WORDS = /멸망|해체|소멸|붕괴|폐지|병합/
/** 사건 제목이 기업 설립을 말하는가 — '삼성전자 설립' 사건 옆에 같은 표지를 또 세우지 않게 */
const COMPANY_FOUNDING_WORDS = /설립|창립|창업|창사|출범/

/**
 * 연표 표지 — 군주 즉위·대통령/총리 취임·**역사 국가 건국/멸망**.
 *
 * 역사 국가 범위(사용자 결정 2026-09-27 수정 — "등록되어 있으면 나와야 한다"):
 * - 국가 필터가 걸려 있으면 → 그 나라 자체(역사 국가 필터) 또는 그 현대 국가에 연결된 역사 국가 전부
 *   ('독일'로 거르면 알레만니아·동프랑크 …의 건국·멸망이 연대 흐름에 선다).
 * - 국가 필터가 없으면 → **등록된 역사 국가 전부**. 사건이 하나도 연결되지 않은 나라도 건국·멸망이
 *   연표에 선다(사건을 만들어야만 보이는 것이 아니다). 처음엔 '목록 사건의 관련 국가만'으로
 *   좁혔으나 그러면 사건 없는 나라가 숨어 사용자 결정으로 뒤집었다. 너무 많으면 ⋯ 표시 설정의
 *   '국가 건국'·'국가 멸망' 스위치로 끈다. 연도 범위는 목록 사건의 범위를 따른다(planReignMarkers).
 */
export function useReignMarkers(
  items: FlattenedHierarchyItem[],
  eventById: Map<string, HistoricalEvent>,
  selectedCountry: string,
  historicalCountries: readonly HistoricalCountryTimelineItem[] = [],
): ReignMarker[] {
  const { data: reigns } = useQuery({
    queryKey: sovereignReignTimelineKey,
    queryFn: getSovereignReignTimeline,
    staleTime: 5 * 60 * 1000,
  })
  /* 대통령·총리 — 군주 즉위 말풍선과 같은 자리에 '취임'으로 선다 */
  const { data: heads } = useQuery({
    queryKey: headTenureTimelineKey,
    queryFn: getHeadTenureTimeline,
    staleTime: 5 * 60 * 1000,
  })

  /* 기업 설립 — 기업 목록·사이드바와 같은 캐시(['companies','all'])를 쓴다 */
  const { data: companies } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  const countryIds = useMemo(() => {
    if (selectedCountry !== FILTER_ALL) return new Set([selectedCountry])
    const ids = new Set<string>()
    for (const item of items) {
      const event = eventById.get(item.node.id) ?? item.parentEvent
      event?.relatedCountries?.forEach((country) => ids.add(country.id))
      event?.relatedHistoricalCountries?.forEach((country) =>
        ids.add(country.id),
      )
    }
    return ids
  }, [items, eventById, selectedCountry])

  /**
   * 목록에 **이미 사건으로** 있는 건국·멸망 — 역할(FOUNDED/DISSOLVED)로 이어진 것,
   * 또는 같은 해 제목이 '<나라 이름> … 건국/멸망'인 것. 표지를 그 옆에 또 세우지 않는다.
   */
  const statehoodEvents = useMemo(() => {
    const byRole = new Set<string>()
    const titlesByYear = new Map<number, string[]>()
    /** 연도|나라 id → 그 해 그 나라에 연결된 사건 제목들(표기가 달라도 연결로 잡는다 —
     *  '알레마니 공국 건국' 사건이 '알레만니아 공국'에 연결돼 있으면 같은 건국이다) */
    const linkedTitles = new Map<string, string[]>()
    for (const item of items) {
      const event = eventById.get(item.node.id)
      if (!event) continue
      event.relatedHistoricalCountries?.forEach((country) => {
        if (country.role === 'FOUNDED') byRole.add(`${country.id}|founding`)
        if (country.role === 'DISSOLVED') byRole.add(`${country.id}|dissolution`)
      })
      const year = parseIsoDateParts(event.startDate)?.year
      if (year == null) continue
      const list = titlesByYear.get(year)
      if (list) list.push(event.title)
      else titlesByYear.set(year, [event.title])
      event.relatedHistoricalCountries?.forEach((country) => {
        const key = `${year}|${country.id}`
        const titles = linkedTitles.get(key)
        if (titles) titles.push(event.title)
        else linkedTitles.set(key, [event.title])
      })
    }
    return { byRole, titlesByYear, linkedTitles }
  }, [items, eventById])

  const statehoodMarkers = useMemo(() => {
    if (historicalCountries.length === 0) return NO_MARKERS
    const inScope = (country: HistoricalCountryTimelineItem) =>
      selectedCountry !== FILTER_ALL
        ? country.id === selectedCountry ||
          (country.parentModernCountryIds ?? []).includes(selectedCountry)
        : true
    return toStatehoodMarkers(
      historicalCountries as HistoricalCountryTimelineItem[],
      inScope,
      (country, kind, year) => {
        if (statehoodEvents.byRole.has(`${country.id}|${kind}`)) return true
        const words = kind === 'founding' ? FOUNDING_WORDS : DISSOLUTION_WORDS
        if (
          (statehoodEvents.linkedTitles.get(`${year}|${country.id}`) ?? []).some(
            (title) => words.test(title),
          )
        )
          return true
        return (statehoodEvents.titlesByYear.get(year) ?? []).some(
          (title) => title.includes(country.name) && words.test(title),
        )
      },
    )
  }, [historicalCountries, selectedCountry, statehoodEvents])

  /**
   * 기업 설립 표지 — 역사 국가 건국과 같은 범위 규약: 국가 필터가 있으면 그 나라(현대·역사)
   * 기업만, 없으면 **등록된 기업 전부**. 연도 범위는 목록 사건의 범위를 따른다.
   */
  const companyMarkers = useMemo(() => {
    if (!companies?.length) return NO_MARKERS
    const inScope = (company: CompanyTimelineItem) =>
      selectedCountry === FILTER_ALL ||
      company.countryId === selectedCountry ||
      company.historicalCountryId === selectedCountry
    return toCompanyFoundingMarkers(companies, inScope, (company, year) =>
      (statehoodEvents.titlesByYear.get(year) ?? []).some(
        (title) =>
          title.includes(company.name) && COMPANY_FOUNDING_WORDS.test(title),
      ),
    )
  }, [companies, selectedCountry, statehoodEvents])

  const leaderMarkers = useMemo(() => {
    if (!reigns?.length && !heads?.length) return NO_MARKERS
    const personName = (
      person: NonNullable<SovereignReignTimelineItem['person']>,
    ) => getPersonDisplayName(person, true)
    return mergeLeaderMarkers(
      toReignMarkers(
        (reigns ?? []) as SovereignReignTimelineItem[],
        countryIds,
        personName,
      ),
      toHeadTenureMarkers(
        (heads ?? []) as HeadTenureTimelineItem[],
        countryIds,
        personName,
      ),
    )
  }, [reigns, heads, countryIds])

  return useMemo(() => {
    const groups = [leaderMarkers, statehoodMarkers, companyMarkers].filter(
      (group) => group.length > 0,
    )
    if (groups.length === 0) return NO_MARKERS
    if (groups.length === 1) return groups[0]
    return groups
      .flat()
      .sort((left, right) => left.startKey - right.startKey)
  }, [leaderMarkers, statehoodMarkers, companyMarkers])
}
