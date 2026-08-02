/**
 * "관직 재임" 등록 패널의 직책 정의 목록을 플로우에 맞게 거르는 순수 함수.
 *
 * 두 진입 플로우:
 * - 각료 추가(캐비닛에서 진입, isMinisterFlow=true): 각료·차관·부통령·기타만.
 * - 일반 관직 재임(인물 상세 개요에서 진입, isMinisterFlow=false): 군주·주권 칭호
 *   (국왕·황제·천황·술탄·번주 등, isMonarchical=true)는 "군주 재위"로 등록하므로 제외.
 *   대통령·국가주석 등 공화정 원수(isMonarchical=false)는 관직 재임으로 유지된다.
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
  // 군주·주권 칭호는 재위로 등록 → 관직 재임 피커에서 숨김
  return defs.filter((def) => def.isMonarchical !== true)
}
