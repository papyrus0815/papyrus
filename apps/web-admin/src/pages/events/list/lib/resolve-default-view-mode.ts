import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'

/** URL의 view 파라미터(없거나 잘못됐을 수 있음) → 디바이스에 적합한 디폴트로 해석.
 *  events.page와 use-catalog-url-sync가 같은 함수를 써야 디폴트 충돌이 없음. */
const VALID_VIEW_MODES = Object.values(VIEW_MODES) as string[]

/**
 * URL이 뷰를 **명시**했는가 — 디바이스 추론 기본값과 사용자 선택을 구분한다(검토 URL-12).
 * 명시가 아니면 상태→URL 동기화가 `view` 키를 싣지 않아, 공유 링크가 받는 쪽의
 * 디바이스 판단(모바일 LIST 폴백)을 덮어쓰지 않는다.
 */
export function isExplicitViewMode(viewParam: string | null): boolean {
  return Boolean(viewParam && VALID_VIEW_MODES.includes(viewParam))
}

export function resolveDefaultViewMode(viewParam: string | null): ViewMode {
  if (isExplicitViewMode(viewParam)) {
    return viewParam as ViewMode
  }
  /* 폐지된 타임라인 뷰의 배포된 링크 — 죽이지 않고 후신인 목록으로 받는다.
     (`isExplicitViewMode`는 여전히 false라 상태→URL이 `view=list`를 되쓰지 않는다.) */
  if (viewParam === 'timeline') return VIEW_MODES.LIST
  /* 뷰가 하나뿐이라 디바이스 추론이 남을 자리가 없다 — 예전에는 데스크톱 기본이
     타임라인, 모바일 폴백이 목록이었다. */
  return VIEW_MODES.LIST
}
