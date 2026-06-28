/**
 * Event Entity - Data Loading Hook
 * FSD: entities/event/model
 *
 * useInfiniteQuery 기반. 사건은 서버 페이징(parentEventId=null만 페이징 단위)으로
 * 가져오고, 클라이언트는 누적된 페이지를 평탄화해 화면에 보여준다.
 * 필터(렌즈)는 모두 서버 query 파라미터로 매핑된다 — 클라 후처리 없음.
 */
import { useMemo } from 'react'

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
    hasMore: query.hasNextPage ?? false,
    fetchMoreEvents: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        return query.fetchNextPage()
      }
      return undefined
    },
    refetch: query.refetch,
  }
}
