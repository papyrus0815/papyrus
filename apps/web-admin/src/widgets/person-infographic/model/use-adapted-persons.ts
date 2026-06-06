import { useMemo } from 'react'

import {
  usePersonsInfographic,
  type PersonInfographicItem,
} from '@/entities/person/api'

import { adapt } from './adapt'
import type { AdaptedPerson } from './types'

/**
 * rawPersons 배열 참조 기준 캐시 (WeakMap).
 *
 * react-query가 같은 쿼리(personKeys.infographic)의 모든 옵저버에 **동일 배열 참조**를 전달하므로,
 * 두 형제 컴포넌트(infographic-content, person-filter-panel)가 각각 이 함수를 호출해도
 * 두 번째 호출은 참조 일치로 캐시 히트 → 전량 adapt 매핑은 1회만 실행된다.
 * WeakMap이라 배열이 교체되면 이전 항목은 GC 대상 — 단일 전역 슬롯의 교란 위험이 없다.
 */
const adaptedCache = new WeakMap<PersonInfographicItem[], AdaptedPerson[]>()

export function selectAdaptedPersons(
  raw: PersonInfographicItem[] | undefined,
): AdaptedPerson[] {
  if (!raw) return []
  const cached = adaptedCache.get(raw)
  if (cached) return cached
  const value = raw
    .map(adapt)
    .filter((p): p is AdaptedPerson => p !== null)
  adaptedCache.set(raw, value)
  return value
}

/** 공유 adapted 인물 목록 — 경량 인포그래픽 쿼리 + 참조 캐시로 adapt 중복 매핑 제거. */
export function useAdaptedPersons(): AdaptedPerson[] {
  const { data } = usePersonsInfographic()
  return useMemo(() => selectAdaptedPersons(data), [data])
}
