/**
 * 사건 계층 루트 판정 단일출처.
 *
 * 정의: 루트 사건 = 주 상위 FK 없음(parentEventId IS NULL).
 *
 * ⚠️ INV-2("추가 상위는 주 상위 필수") 의존 — 다중 상위 엣지(EventParentLink)는
 * 루트에 존재할 수 없으므로(docs/event-multi-parent-review.md §4.2), 주 상위 FK
 * 하나만 보고 루트를 판정해도 엣지 테이블을 조회할 필요가 없다. 다중 상위 정책이
 * '주 상위 없는 추가 상위 허용'으로 바뀌면 이 정의부터 갱신할 것 — 소비 지점
 * (목록·카운트·방문 카드·댓글 게이트)이 전부 여기에 걸려 있다.
 *
 * raw SQL(`parent_event_id IS NULL` — on-this-day)은 이 상수를 스프레드할 수 없어
 * 치환 불가 — 해당 지점의 경고 주석이 이 파일을 정본으로 가리킨다.
 */
export const ROOT_EVENT_WHERE = { parentEventId: null } as const

/** 로드된 사건 한 건의 루트 여부 — ROOT_EVENT_WHERE와 동일 정의(단일출처). */
export function isRootEvent(candidate: {
  parentEventId: string | null
}): boolean {
  return candidate.parentEventId === null
}
