/**
 * 계승(Transition) 후임 집합의 diff 계산 (F11).
 *
 * 국가 폼의 update는 predecessor=자신인 transition을 전량 deleteMany 후 폼의 단일
 * 대표값으로 재생성했었다. 그러면 계승 탭에서 후임별로 개별 저작한 eventType·
 * transitionScope가 이름 하나 고쳐 저장하는 것만으로 대표값으로 평탄화되고 id도
 * 재발급됐다. 후임 집합의 추가/삭제분만 반영하고 남는 행은 그대로 보존하기 위한
 * 순수 계산 — prisma 접근과 분리해 회귀 테스트가 가능하도록 뽑아냈다.
 */
export interface ExistingTransition {
  id: string
  successorId: string
}

export interface TransitionDiff {
  /** 더 이상 후임이 아니라 삭제할 transition의 id 목록 */
  transitionIdsToDelete: string[]
  /** 새로 추가할 후임 국가 id 목록(중복 제거) */
  successorIdsToAdd: string[]
}

/**
 * 기존 transition 목록과 폼이 보낸 후임 집합을 비교해, 삭제할 행 id와 추가할 후임 id를 낸다.
 * - 남는(양쪽에 다 있는) 후임의 eventType/transitionScope는 건드리지 않는다(호출부에서 미수정).
 * - desired의 중복은 제거한다(브리지 unique 제약 부재 시 방어).
 * - 이미 존재하는 후임은 재생성하지 않는다(id·유형 보존).
 */
export function computeTransitionSuccessorDiff(
  existing: ReadonlyArray<ExistingTransition>,
  desiredSuccessorIds: ReadonlyArray<string>,
): TransitionDiff {
  const desiredSet = new Set(desiredSuccessorIds)
  const existingSet = new Set(existing.map((transition) => transition.successorId))

  const transitionIdsToDelete = existing
    .filter((transition) => !desiredSet.has(transition.successorId))
    .map((transition) => transition.id)

  const seen = new Set<string>()
  const successorIdsToAdd: string[] = []
  for (const successorId of desiredSuccessorIds) {
    if (existingSet.has(successorId) || seen.has(successorId)) continue
    seen.add(successorId)
    successorIdsToAdd.push(successorId)
  }

  return { transitionIdsToDelete, successorIdsToAdd }
}
