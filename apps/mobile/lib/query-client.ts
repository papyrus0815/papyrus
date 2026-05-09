import { QueryClient } from '@tanstack/react-query'

/**
 * 앱 전역 React Query 클라이언트.
 *
 * 기본 정책:
 * - staleTime 5분: 같은 키 재요청 시 5분 안에는 캐시 사용 (배경 refetch 안 함)
 * - gcTime 30분: 마지막 사용 후 30분간 메모리 유지
 * - retry 1: 실패 시 한 번만 재시도 (네트워크 깜빡임 흡수)
 * - refetchOnWindowFocus: 모바일에선 의미 없음 — 기본 false
 *
 * 점진 마이그레이션: 새 fetch는 useQuery로, 기존 useState/useEffect 패턴은 그대로 유지.
 * 영역별 키 컨벤션: ['persons', 'list'], ['persons', 'detail', id] 등.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
