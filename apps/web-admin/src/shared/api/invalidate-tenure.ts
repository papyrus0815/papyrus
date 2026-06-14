// apps/web-admin/src/shared/api/invalidate-tenure.ts
import type { QueryClient } from '@tanstack/react-query'

/**
 * 재임/재위·업적·행정부(내각) 변경 후, 같은 데이터를 보여 주는 세 화면의
 * react-query 캐시를 한 번에 무효화하기 위한 범위 지정.
 *
 * - 국가 상세(행정부·역대 수반)
 * - 수장 비교 타임라인(`/heads-of-state`)
 * - 인물 상세 패널
 *
 * 같은 tenure/achievement가 surface마다 다른 쿼리키로 캐시되어 있어, 한 곳에서
 * 수정하면 다른 곳이 stale로 남는 문제가 있었다. 모든 mutation의 onSuccess가
 * 이 헬퍼를 거치게 해 일관성을 보장한다.
 */
export interface InvalidateTenureScope {
  /** 편집 대상 인물 — 주면 해당 인물 상세만, 없으면 열린 모든 인물 상세를 무효화 */
  personId?: string | null
  /** 소속 행정부(내각) — 현재는 prefix 무효화로 충분해 별도 분기는 없음(시그니처 호환용) */
  cabinetId?: string | null
  /** 현대 국가 — 시그니처 호환용(현재는 prefix 무효화) */
  countryId?: string | null
  /** 역사 국가 — 시그니처 호환용(현재는 prefix 무효화) */
  historicalCountryId?: string | null
}

/**
 * 재임/재위·업적·행정부 mutation 후 관련 캐시를 일괄 무효화한다.
 *
 * 안전성 근거:
 * - 이 도메인엔 낙관적 업데이트(onMutate/setQueryData)가 없어 race가 없다.
 * - 모든 쿼리키가 prefix-first 구조라 `['cabinet-tenures']`만으로
 *   `['cabinet-tenures', id]` 들을 모두 무효화할 수 있다.
 */
export function invalidateTenureQueries(
  queryClient: QueryClient,
  scope: InvalidateTenureScope = {},
): void {
  const invalidate = (queryKey: readonly unknown[]) => {
    void queryClient.invalidateQueries({ queryKey })
  }

  // ── 행정부(내각) 계열 ──
  invalidate(['cabinets-by-country'])
  invalidate(['cabinet-tenures'])
  invalidate(['cabinet-overview'])
  invalidate(['cabinet-linked-cabinets'])

  // ── 국가/글로벌 재임·재위 목록 (국가 상세) ──
  invalidate(['tenures-by-country'])
  invalidate(['tenures-by-country-for-cabinet'])
  invalidate(['global-tenures'])

  // ── 하위(각료) 재임 — 모달/비모달 두 키가 별도라 둘 다 ──
  invalidate(['subordinate-tenures'])
  invalidate(['subordinate-tenures-modal'])

  // ── 수장 비교 타임라인 — tenure 데이터만 좁혀서(국가 핀 목록은 건드리지 않음) ──
  invalidate(['heads-of-state', 'tenures'])

  // ── 업적(사건 페이지 연동) ──
  invalidate(['tenure-achievements-by-event'])

  // ── 인물 상세 — 같은 재임/업적이 인물 패널에도 박혀 있어 함께 무효화 ──
  if (scope.personId) {
    invalidate(['person-detail', scope.personId])
    invalidate(['person-tenures', scope.personId])
  } else {
    // 어느 인물인지 모르면(국가/행정부 맥락 등) 열린 모든 인물 상세를 무효화한다.
    invalidate(['person-detail'])
    invalidate(['person-tenures'])
  }
}
