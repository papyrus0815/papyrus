import { useEffect, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { type EventLinkCandidate, getEventLinkCandidates } from '@/shared/api/events'

import { useDebouncedValue } from './use-debounced-value'

/** 표시 상한 — 서버에는 1건 더 요청해 '더 있음' 신호로만 쓴다. */
const SHOWN_LIMIT = 50

/**
 * 사건 고르기 피커용 서버 검색 — GET /events/link-candidates.
 *
 * 피커들이 목록 API(`getAllEvents({ limit: 200 })` 등)를 재사용했는데, 그 API는 숫자 limit을
 * **100으로 자르고 최상위 사건만** 준다. 그래서 피커는 사건의 일부만, 하위 사건(개별 전투 등)은
 * 하나도 고를 수 없었다. 연결 후보 API는 하위 사건까지 본인 소유 전체를 제목으로 검색한다.
 *
 * @param enabled 모달이 열렸을 때만 조회
 */
export function useEventSearch(enabled: boolean) {
  const [query, setQuery] = useState('')
  // 열림/닫힘에 스냅 — 닫기 직전 검색어가 다음 열림 첫 화면에 비치지 않게
  const debouncedQuery = useDebouncedValue(query, 250, enabled)
  // 다시 열면 빈 검색어로 시작
  useEffect(() => {
    if (!enabled) setQuery('')
  }, [enabled])

  const { data = [], isFetching, isError } = useQuery({
    // ['events'] 아래 — 사건 mutation의 목록 무효화에 함께 걸린다
    queryKey: ['events', 'link-candidates', debouncedQuery],
    queryFn: () =>
      getEventLinkCandidates({ query: debouncedQuery, limit: SHOWN_LIMIT + 1 }),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const results: EventLinkCandidate[] = data.slice(0, SHOWN_LIMIT)
  return {
    query,
    setQuery,
    results,
    /** 디바운스 대기 중도 '검색 중' — 확정형 '결과 없음' 오탐 방지 */
    isSearching: isFetching || query !== debouncedQuery,
    isError,
    /** 상한보다 많다 — '검색어를 좁혀 주세요' 안내용 */
    hasMore: data.length > SHOWN_LIMIT,
  }
}
