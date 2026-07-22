/**
 * Event Entity - Data Loading Hook
 * FSD: entities/event/model
 *
 * useInfiniteQuery 기반. 사건은 서버 페이징(parentEventId=null만 페이징 단위)으로
 * 가져오고, 클라이언트는 누적된 페이지를 평탄화해 화면에 보여준다.
 * 필터(렌즈)는 모두 서버 query 파라미터로 매핑된다 — 클라 후처리 없음.
 */
import { useEffect, useMemo } from 'react'

import { queryOptions, useInfiniteQuery } from '@tanstack/react-query'

import {
  type GetAllEventsParams,
  getAllEvents,
  getEventsByAccount,
} from '@/shared/api/events'

import { transformEventsFromApi } from './eventTransformers'
import type { HistoricalEvent } from './types'

const DEFAULT_PAGE_SIZE = 50

/**
 * 방문(놀러가기): 타 계정이 등록한 사건 카드 목록 (읽기전용).
 * 방(공개 프로필)의 "등록 사건관" 섹션에서 사용.
 */
export const visitedEventsQueryOptions = (accountId: string) =>
  queryOptions({
    queryKey: ['events', 'by-account', accountId] as const,
    queryFn: () => getEventsByAccount(accountId),
    staleTime: 60_000,
    enabled: !!accountId,
  })

export interface UseEventsOptions
  extends Omit<GetAllEventsParams, 'offset' | 'limit'> {
  /** 페이지당 사건 수 (default 50) */
  pageSize?: number
  /** false 시 fetch 완전 보류 */
  enabled?: boolean
  /**
   * true면 모든 페이지를 순차적으로 자동 소진(첫 페이지부터 끝까지 background fetch).
   *
   * 카탈로그·원장은 정렬·세기 필터·계층 평탄화를 전부 *클라이언트 전역*으로 수행하는데,
   * 서버는 `start_date DESC` 고정 순서로 페이지 단위(기본 100)만 반환한다. 일부만 로드된
   * 상태로 오름/내림차순을 바꾸면 *로드된 창(window) 안에서만* 재정렬돼, 아직 안 받은
   * 페이지의 사건은 정렬을 아무리 바꿔도 표면화되지 않는다. 특히 서기 1000년 이전(고대·
   * 중세 초) 사건은 MySQL DATETIME 저장 한계로 start_date가 NULL이라 서버 정렬상 *맨 뒤*로
   * 밀려 마지막 페이지에 몰린다 → 첫 페이지만 보면 "최근~15세기"까지만 나오는 증상.
   * 모든 페이지를 미리 소진해 전역 정렬/필터가 완전한 데이터를 보게 한다.
   */
  autoLoadAll?: boolean
}

/** 안정 queryKey — 옵션 변경 시 새 쿼리로 캐시 분리. 배열은 정렬 후 join. */
const buildQueryKey = (opts: UseEventsOptions) =>
  [
    'events',
    {
      countryId: opts.countryId ?? null,
      countryIds: [...(opts.countryIds ?? [])].sort().join(','),
      historicalCountryIds: [...(opts.historicalCountryIds ?? [])]
        .sort()
        .join(','),
      categoryId: opts.categoryId ?? null,
      decade: opts.decade ?? null,
      century: opts.century ?? null,
      hasNoDescription: !!opts.hasNoDescription,
      hasNoCountries: !!opts.hasNoCountries,
      hasNoKeywords: !!opts.hasNoKeywords,
      createdSinceDays: opts.createdSinceDays ?? null,
      pageSize: opts.pageSize ?? DEFAULT_PAGE_SIZE,
    },
  ] as const

export const useEvents = (options: UseEventsOptions = {}) => {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const enabled = options.enabled ?? true

  const query = useInfiniteQuery({
    queryKey: buildQueryKey(options),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0
      return getAllEvents({
        offset,
        limit: pageSize,
        countryId: options.countryId ?? undefined,
        countryIds: options.countryIds,
        historicalCountryIds: options.historicalCountryIds,
        categoryId: options.categoryId,
        decade: options.decade,
        century: options.century,
        hasNoDescription: options.hasNoDescription,
        hasNoCountries: options.hasNoCountries,
        hasNoKeywords: options.hasNoKeywords,
        createdSinceDays: options.createdSinceDays,
      })
    },
    getNextPageParam: (lastPage, allPages) => {
      // 페이지가 가득 차지 않으면 더 없음.
      if (!lastPage || lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    staleTime: 30_000, // 30초 — 같은 렌즈로 재방문 시 즉시 표시
    // 전역 queryClient는 retry:false라 일시 오류 시 영구 실패 → 사건 목록은
    // 5xx/네트워크 오류만 2회 재시도하고 4xx(클라 오류)는 즉시 실패시킨다.
    retry: (failureCount, error) => {
      const status =
        (error as { status?: number; response?: { status?: number } })
          ?.status ??
        (error as { response?: { status?: number } })?.response?.status
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false
      }
      return failureCount < 2
    },
  })

  // autoLoadAll: 다음 페이지가 남아있고 fetch 중이 아니면 자동으로 이어서 받는다.
  // hasNextPage/isFetchingNextPage가 바뀔 때마다 재평가돼, 한 페이지가 도착하면 다음
  // 페이지를 트리거하는 방식으로 끝까지 연쇄 소진한다(hasNextPage=false에서 자연 종료).
  //
  // ⚠️ 무한 루프 가드: 페이지 fetch가 *실패*하면 마지막 성공 페이지가 가득 차 있어
  // hasNextPage는 true로 남고 isFetchingNextPage는 false로 떨어진다. 게이트가 없으면
  // 이 effect가 즉시 fetchNextPage를 다시 호출 → 재시도(retry) 소진 후 또 실패 → 서버를
  // 무한 폭격하며 영구 로딩에 갇힌다. isFetchNextPageError(v5)가 true인 동안 자동 재개를
  // 멈추고, 사용자가 명시적으로 재시도(fetchMoreEvents)해 성공하면 플래그가 풀려 이어받는다.
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = query
  useEffect(() => {
    if (
      options.autoLoadAll &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError
    ) {
      fetchNextPage()
    }
  }, [
    options.autoLoadAll,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  ])

  const events: HistoricalEvent[] = useMemo(() => {
    if (!query.data) return []
    const flat = query.data.pages.flat()
    return transformEventsFromApi(
      flat as Parameters<typeof transformEventsFromApi>[0],
    )
  }, [query.data])

  return {
    events,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    // 이미 일부 페이지를 받은 뒤(events.length>0) 다음 페이지 로드가 실패한 상태.
    // 전역 isError는 events.length===0에서만 true라 부분 실패는 조용히 묻히므로 별도 노출.
    loadMoreFailed: query.isFetchNextPageError,
    hasMore: query.hasNextPage ?? false,
    fetchMoreEvents: () => {
      // 실패 상태에서도 재시도 가능해야 한다(isFetchNextPageError는 성공 시 자동 해제).
      if (query.hasNextPage && !query.isFetchingNextPage) {
        return query.fetchNextPage()
      }
      return undefined
    },
    refetch: query.refetch,
  }
}
