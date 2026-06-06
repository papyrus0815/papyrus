import { queryOptions, type QueryClient } from '@tanstack/react-query'

import { nestiaApiService } from '@/shared/api/api.service'
import * as api from '@api'

export type PointSummary = NonNullable<api.functional.gamification.me.Output>
export type Badge = api.functional.gamification.badges.Output[number]
export type LeaderboardEntry = api.functional.gamification.leaderboard.Output[number]
export type ActivityEntry = api.functional.gamification.activity.Output[number]
export type PublicProfile = NonNullable<api.functional.gamification.profile.Output>
export type LeaderboardPeriod = 'all' | 'week' | 'month'
export type CenturyOption = api.functional.gamification.centuries.Output[number]
/** 세기 슬라이스: 정수(AD 양수/BC 음수) | 'unknown'(세기 미상) | null(전체) */
export type CenturyFilter = number | 'unknown' | null

const noRetryOn401 = (failureCount: number, error: Error) => {
  const status = (error as Error & { status?: number })?.status
  if (status === 401 || error?.message?.includes('401')) return false
  return failureCount < 1
}

/**
 * 내 점수/등급 요약 조회 쿼리.
 * 백엔드 GET /gamification/me — 누적 점수, 등급, 다음 등급까지 진행도, 기여 수.
 */
export const gamificationSummaryQueryOptions = queryOptions({
  queryKey: ['gamification', 'me'] as const,
  queryFn: async () => {
    const conn = nestiaApiService.getConnection()
    if (!conn.headers?.Authorization) throw new Error('No authorization token')
    return api.functional.gamification.me(conn)
  },
  staleTime: 1000 * 60 * 2,
  retry: noRetryOn401,
})

/** 내 뱃지 목록 (전체 카탈로그 + 획득 여부) */
export const gamificationBadgesQueryOptions = queryOptions({
  queryKey: ['gamification', 'badges'] as const,
  queryFn: async () => {
    const conn = nestiaApiService.getConnection()
    if (!conn.headers?.Authorization) throw new Error('No authorization token')
    return api.functional.gamification.badges(conn)
  },
  staleTime: 1000 * 60 * 2,
  retry: noRetryOn401,
})

/**
 * 콘텐츠 등록/삭제 후 게이미피케이션 쿼리를 무효화해 점수·등급·뱃지를 즉시 갱신.
 * (등급 상승/새 뱃지 토스트와 헤더 칩이 등록 직후 바로 반영되도록)
 */
export function invalidateGamification(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['gamification'] })
}

/**
 * 리더보드 (기간별 상위 + 선택적 세기 슬라이스).
 * @param century 정수(AD 양수/BC 음수) | 'unknown'(세기 미상) | null(전체)
 */
export const gamificationLeaderboardQueryOptions = (
  limit = 20,
  period: LeaderboardPeriod = 'all',
  century: CenturyFilter = null,
) =>
  queryOptions({
    queryKey: ['gamification', 'leaderboard', period, limit, century] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      const centuryArg = century == null ? undefined : String(century)
      return api.functional.gamification.leaderboard(conn, String(limit), period, centuryArg)
    },
    staleTime: 1000 * 60,
    retry: noRetryOn401,
  })

/** 세기별 리더보드 셀렉터용 — 적립이 달린 세기 목록(건수 포함, 동적) */
export const gamificationCenturiesQueryOptions = queryOptions({
  queryKey: ['gamification', 'centuries'] as const,
  queryFn: async () => {
    const conn = nestiaApiService.getConnection()
    return api.functional.gamification.centuries(conn)
  },
  staleTime: 1000 * 60 * 5,
  retry: noRetryOn401,
})

/** 내 활동 내역 (최근 점수 변동) */
export const gamificationActivityQueryOptions = (limit = 30) =>
  queryOptions({
    queryKey: ['gamification', 'activity', limit] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      if (!conn.headers?.Authorization) throw new Error('No authorization token')
      return api.functional.gamification.activity(conn, String(limit))
    },
    staleTime: 1000 * 30,
    retry: noRetryOn401,
  })

/** 공개 프로필 (타 사용자 등급·뱃지) */
export const gamificationProfileQueryOptions = (accountId: string) =>
  queryOptions({
    queryKey: ['gamification', 'profile', accountId] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      return api.functional.gamification.profile(conn, accountId)
    },
    staleTime: 1000 * 60,
    retry: noRetryOn401,
  })
