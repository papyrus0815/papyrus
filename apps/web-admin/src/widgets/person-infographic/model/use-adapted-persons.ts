import { useMemo } from 'react'

import { usePersons, type Person } from '@/entities/person/api'

import { adapt } from './adapt'
import type { AdaptedPerson } from './types'

/**
 * rawPersons 배열 참조 기준 1-entry 캐시.
 *
 * react-query가 같은 쿼리(personKeys.all)의 모든 옵저버에 **동일 배열 참조**를 전달하므로,
 * 두 형제 컴포넌트(infographic-content, person-filter-panel)가 각각 이 함수를 호출해도
 * 두 번째 호출은 참조 일치로 캐시 히트 → 전량 adapt 매핑은 1회만 실행된다.
 */
let cacheKey: Person[] | undefined
let cacheValue: AdaptedPerson[] = []

export function selectAdaptedPersons(
  raw: Person[] | undefined,
): AdaptedPerson[] {
  if (!raw) return []
  if (raw === cacheKey) return cacheValue
  cacheKey = raw
  cacheValue = raw
    .map(adapt)
    .filter((p): p is AdaptedPerson => p !== null)
  return cacheValue
}

/** 공유 adapted 인물 목록 — usePersons + 참조 캐시로 adapt 중복 매핑 제거. */
export function useAdaptedPersons(): AdaptedPerson[] {
  const { data } = usePersons()
  return useMemo(() => selectAdaptedPersons(data), [data])
}
