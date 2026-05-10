import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'

/** URL의 view 파라미터(없거나 잘못됐을 수 있음) → 디바이스에 적합한 디폴트로 해석.
 *  events.page와 use-catalog-url-sync가 같은 함수를 써야 디폴트 충돌이 없음. */
const VALID_VIEW_MODES = Object.values(VIEW_MODES) as string[]

export function resolveDefaultViewMode(viewParam: string | null): ViewMode {
  if (viewParam && VALID_VIEW_MODES.includes(viewParam)) {
    return viewParam as ViewMode
  }
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 640px)').matches
  ) {
    return VIEW_MODES.LIST
  }
  return VIEW_MODES.TIMELINE
}
