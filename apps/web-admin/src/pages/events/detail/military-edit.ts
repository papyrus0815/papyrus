/**
 * 상세 군사 모듈 편집 헬퍼 — 정규화 `militaryEvent`의 단일 정본 위에서 동작한다.
 *
 * 서버 `saveMilitaryData`는 *전체 삭제 후 재생성*이므로, 어떤 부분(진영 1개의 이름 등)을
 * 바꾸더라도 항상 militaryEvent 전체(belligerentSides·relations·militaryDetails·casualties)를
 * 보내야 나머지가 보존된다. 이 모듈의 모든 빌더는 그 규칙을 강제한다.
 *
 * enum 값(level·conflictType·combatTypes·participationType)은 서버 getMilitaryData가
 * 돌려준 그대로(대문자 DTO enum)를 다시 돌려보내면 라운드트립이 성립한다 — 별도 변환 불필요.
 */
import { type NormalizedMilitaryEventResponse } from '@/features/event-create/lib'
import { type UpdateEventDto } from '@/shared/api/events'

import { type EventDetail } from './use-event-detail'

export type MilitaryEventShape = NormalizedMilitaryEventResponse
export type BelligerentSideShape = NonNullable<
  MilitaryEventShape['belligerentSides']
>[number]
export type CasualtyShape = NonNullable<MilitaryEventShape['casualties']>[number]
export type MilitaryDetailsShape = NonNullable<
  MilitaryEventShape['militaryDetails']
>

/** 현재 militaryEvent를 빈 가드와 함께 정규 형태로 반환. */
export function getMilitary(event: EventDetail): MilitaryEventShape {
  return event.militaryEvent ?? {}
}

/**
 * militaryEvent 전체를 재구성한 patch를 만든다. mutate 콜백은 *모든 배열이 채워진*
 * 복사본을 받아 원하는 부분만 바꾼 새 객체를 돌려준다(relations는 편집 UI가 없어 보존됨).
 */
export function buildMilitaryPatch(
  event: EventDetail,
  mutate: (draft: Required<Pick<MilitaryEventShape, 'belligerentSides' | 'relations' | 'casualties'>> & MilitaryEventShape) => MilitaryEventShape,
): UpdateEventDto {
  const current = getMilitary(event)
  const draft = {
    belligerentSides: current.belligerentSides ?? [],
    relations: current.relations ?? [],
    casualties: current.casualties ?? [],
    militaryDetails: current.militaryDetails,
  }
  const next = mutate(draft)
  // SDK MilitaryEventDto는 enum 유니온이 더 좁지만 런타임 값은 동일 — 캐스팅으로 통과.
  return { militaryEvent: next } as unknown as UpdateEventDto
}
