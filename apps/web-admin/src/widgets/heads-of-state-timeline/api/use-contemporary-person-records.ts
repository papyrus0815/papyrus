import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import {
  comparePersonRecords,
  personRecordsKeys,
  type PersonRecordItem,
  type PersonRecordKind,
} from '@/shared/api/person-records'

/** 재임/재위는 이미 막대·카드로 표시되므로 제외 — 연보·업적·사건참여·수상만 */
export const CONTEMPORARY_RECORD_SOURCES: PersonRecordKind[] = [
  'LIFE_EVENT',
  'ACHIEVEMENT',
  'EVENT',
  'AWARD',
]

/** compare API의 personIds 상한 */
export const PERSON_RECORDS_MAX_IDS = 12

/**
 * 동시대 패널의 "그 해 한 일" — 패널에 표시된 수장 personId를 모아 배치 1회로
 * 통합 기록을 받아온다. 수장이 12명을 초과하면 앞 12명만 요청하고 나머지 수는
 * `omittedCount`로 돌려줘 UI가 생략을 표기하게 한다(무성 절단 금지).
 */
export function useContemporaryPersonRecords(
  personIds: string[],
  year: number | null,
) {
  const requestedIds = useMemo(
    () => personIds.slice(0, PERSON_RECORDS_MAX_IDS),
    [personIds],
  )
  const omittedCount = Math.max(0, personIds.length - requestedIds.length)
  const enabled = year != null && requestedIds.length > 0

  const params = {
    personIds: requestedIds,
    fromYear: year,
    // toYear는 배타 — 그 해 하나만 보려면 +1
    toYear: year != null ? year + 1 : null,
    sources: CONTEMPORARY_RECORD_SOURCES,
  }

  const { data, isLoading } = useQuery({
    queryKey: personRecordsKeys.compare(params),
    queryFn: () => comparePersonRecords(params),
    enabled,
    staleTime: 60_000,
  })

  const recordsByPerson = useMemo(() => {
    const map = new Map<string, PersonRecordItem[]>()
    for (const entry of data?.persons ?? []) {
      map.set(entry.person.id, entry.records)
    }
    return map
  }, [data])

  return {
    recordsByPerson,
    /** 실제 요청에 포함된 personId — 초과분(생략된 수장)은 기록 미조회 상태 */
    requestedIds,
    omittedCount,
    isLoading: isLoading && enabled,
  }
}
