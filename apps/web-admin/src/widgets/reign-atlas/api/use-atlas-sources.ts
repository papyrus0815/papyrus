/**
 * 수장 지도 아틀라스의 원천 데이터 — 전부 기존 API, 한 번 받아 클라이언트에서 연도별로 자른다.
 *
 * 역사국가(좌표) · 군주 재위 · 국가원수/정부수반 재임 · 사건(하위 포함, 관계선) · 조약(동맹선).
 * 연도를 넘길 때마다 다시 받지 않는다 — 재위 213·재임 220·사건 수백 건이라 한 번이면 충분하다.
 *
 * 쿼리 키는 같은 응답을 쓰는 다른 지면과 공유한다(역사국가 엔티티 훅·사건 목록 즉위 표지).
 */
import { useQuery } from '@tanstack/react-query'

import { eventKeys } from '@/shared/api/event-query-keys'
import { getAllEventsExhaustive } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  getOfficeHoldingTimeline,
  officeHoldingTimelineKey,
  splitOfficeHoldingTimeline,
} from '@/shared/api/sovereign-reigns'
import { treatyApi } from '@/shared/api/treaty'

import type {
  AtlasCountryInput,
  AtlasEventInput,
  AtlasRulerInput,
  AtlasTreatyInput,
} from '../lib/atlas-model'

const STALE_MS = 5 * 60 * 1000
/** 서버 상한(take ≤ 200) — 넘기면 400이라 페이지로 소진한다 */
const TREATY_PAGE_SIZE = 200
const TREATY_MAX_PAGES = 20

async function getAllTreaties() {
  const collected: Awaited<ReturnType<typeof treatyApi.getAll>>['items'] = []
  for (let page = 0; page < TREATY_MAX_PAGES; page += 1) {
    const { items, total } = await treatyApi.getAll({
      skip: page * TREATY_PAGE_SIZE,
      take: TREATY_PAGE_SIZE,
    })
    collected.push(...items)
    if (items.length < TREATY_PAGE_SIZE || collected.length >= total) break
  }
  return collected
}

export function useAtlasSources() {
  const countries = useQuery({
    queryKey: ['historical-countries'],
    queryFn: getAllHistoricalCountries,
    staleTime: STALE_MS,
  })
  // 재위·재임 단일 피드 — 사건 목록 즉위 표지와 같은 캐시
  const officeHoldings = useQuery({
    queryKey: officeHoldingTimelineKey,
    queryFn: getOfficeHoldingTimeline,
    staleTime: STALE_MS,
  })
  const split = splitOfficeHoldingTimeline(officeHoldings.data)
  const events = useQuery({
    queryKey: eventKeys.reignAtlas(),
    queryFn: () => getAllEventsExhaustive({ includeSubEvents: true }),
    staleTime: STALE_MS,
  })
  const treaties = useQuery({
    queryKey: ['treaties', 'reign-atlas'],
    queryFn: getAllTreaties,
    staleTime: STALE_MS,
  })

  return {
    // 역사국가 SDK 타입엔 좌표가 build:nestia 전까지 없을 수 있어 구조 타입으로 읽는다
    countries: (countries.data ?? []) as unknown as AtlasCountryInput[],
    reigns: split.reigns as AtlasRulerInput[],
    heads: split.heads as AtlasRulerInput[],
    events: (events.data ?? []) as unknown as AtlasEventInput[],
    treaties: (treaties.data ?? []) as unknown as AtlasTreatyInput[],
    /** 지도 골격(나라·수장)이 준비됐나 — 관계선은 늦게 와도 된다 */
    isBaseLoading: countries.isLoading || officeHoldings.isLoading,
    isRelationsLoading: events.isLoading || treaties.isLoading,
    error: countries.error ?? officeHoldings.error ?? null,
  }
}
