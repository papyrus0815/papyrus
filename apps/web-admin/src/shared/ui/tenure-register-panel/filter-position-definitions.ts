/**
 * 재임·재위 통합 등록 패널의 직책 정의 목록을 플로우에 맞게 거르는 순수 함수.
 *
 * 두 진입 플로우:
 * - 각료 추가(캐비닛에서 진입, isMinisterFlow=true): 각료·차관·부통령·기타만.
 * - 일반 수반·관직 등록(isMinisterFlow=false): 국가원수(대통령·국왕·황제·천황·술탄·국가주석 등),
 *   정부수반(총리·내각총리대신·영의정 등), 각료·관직, 작위를 나누지 않고 모두 포함한다.
 *   군주 여부(isMonarchical)는 직책 선택 후 폼 필드(왕호·서수 등)를 자동 전환하는 데만 쓰인다.
 */

/** 각료 추가 플로우에서 선택 가능한 직위 타입 (수반·군주·의원·군인 등 제외) */
export const MINISTER_POSITION_TYPES = new Set([
  'DEPUTY_HEAD_OF_STATE',
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'OTHER',
])

export interface FilterablePositionDef {
  positionType?: string | null
  isMonarchical?: boolean | null
}

export function filterPositionDefinitions<Def extends FilterablePositionDef>(
  defs: Def[],
  opts: { isMinisterFlow: boolean },
): Def[] {
  if (opts.isMinisterFlow) {
    return defs.filter(
      (def) => def.positionType != null && MINISTER_POSITION_TYPES.has(def.positionType),
    )
  }
  return [...defs]
}
