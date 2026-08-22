/**
 * 인물 검색어 입력 — 로컬 즉시 반영 + 디바운스 커밋을 한 곳에서 소유한다.
 *
 * 검색창이 두 곳(좌측 인물 목록 사이드바 / 우측 인포그래픽 툴바)이고 둘 다 같은 store 값을
 * 편집한다. 각자 "디바운스→store 커밋"과 "store→로컬 동기화" 쌍을 따로 들고 있으면,
 * 한쪽이 커밋한 값을 받은 다른 쪽이 **아직 트레일링 중인 자기 디바운스 값(옛 값)**을 다시
 * 커밋해 되돌리면서 무한 업데이트가 난다(실제로 났다: Maximum update depth exceeded).
 *
 * 그래서 커밋 조건을 두 가지로 못박는다.
 * 1. 디바운스가 실제로 정착했을 때만 커밋한다 (`debounced === input`) — 트레일링 중인 옛 값이
 *    store를 덮어쓰지 못한다.
 * 2. 마지막으로 주고받은 값을 기억해(lastSynced) 같은 값을 되쏘지 않는다.
 *
 * 필터링은 이 훅의 디바운스 값이 아니라 **store.query**를 쓰는 게 원칙이다 — 그래야 두 지면이
 * 동시에 같은 집합으로 갱신된다. 디바운스는 'URL·store를 언제 갱신할지'만 담당한다.
 */
import { useEffect, useRef, useState } from 'react'

import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import { usePersonInfographicFilterStore } from './filter.store'

export interface PersonQueryInput {
  /** 입력칸에 바인딩할 값 (키 입력 즉시 반영) */
  input: string
  setInput: (value: string) => void
  /** store에 커밋된 검색어 — 필터·하이라이트는 이 값을 쓴다 */
  query: string
}

export function usePersonQueryInput(delayMs = 200): PersonQueryInput {
  const storeQuery = usePersonInfographicFilterStore((state) => state.query)
  const setStoreQuery = usePersonInfographicFilterStore(
    (state) => state.setQuery,
  )

  const [input, setInput] = useState(storeQuery)
  const debounced = useDebouncedValue(input, delayMs)
  const lastSyncedRef = useRef(storeQuery)

  // 외부(URL 진입·필터 초기화·다른 검색창)에서 store가 바뀌면 입력칸을 맞춘다.
  useEffect(() => {
    if (storeQuery === lastSyncedRef.current) return
    lastSyncedRef.current = storeQuery
    setInput(storeQuery)
  }, [storeQuery])

  // 디바운스가 정착한 뒤에만 커밋 — 트레일링 중인 옛 값이 store를 되돌리지 못하게.
  useEffect(() => {
    if (debounced !== input) return
    if (debounced === lastSyncedRef.current) return
    lastSyncedRef.current = debounced
    setStoreQuery(debounced)
  }, [debounced, input, setStoreQuery])

  return { input, setInput, query: storeQuery }
}
