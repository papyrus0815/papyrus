/**
 * 미디어 쿼리 매칭 훅 — CSS 미디어 쿼리의 매치 여부를 구독한다.
 *
 * SSR/비대응 환경 가드 포함(matchMedia 미존재 시 false). 뷰포트 레이아웃에
 * 따라 동작을 분기할 때 사용(예: 모바일에서만 스크롤 락/포커스 트랩 활성화).
 */
import { useEffect, useState } from 'react'

const getMatches = (query: string): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMatches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
