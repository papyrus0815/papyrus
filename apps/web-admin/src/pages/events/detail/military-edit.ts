/**
 * 상세 작전 정보 편집 헬퍼.
 *
 * 군사 정보는 이제 **작전 정보(militaryDetails)만** 이 경로로 저장한다. 진영은 EventSide
 * (`syncEventSides`), 병력·사상자는 측정값(`createObservation`)이 정본이다.
 * 서버 saveMilitaryData는 작전 정보를 upsert하고(삭제-재생성 아님), null이면 지운다.
 */
import { type NormalizedMilitaryEventResponse } from '@/features/event-create/lib'
import { type UpdateEventDto } from '@/shared/api/events'

import { type EventDetail } from './use-event-detail'

export type MilitaryEventShape = NormalizedMilitaryEventResponse
export type MilitaryDetailsShape = NonNullable<MilitaryEventShape['militaryDetails']>

/** 현재 militaryEvent를 빈 가드와 함께 반환 */
export function getMilitary(event: EventDetail): MilitaryEventShape {
  return event.militaryEvent ?? {}
}

/**
 * 작전 정보 patch — mutate가 현재 작전 정보(없으면 null)를 받아 새 값(null=삭제)을 돌려준다.
 */
export function buildMilitaryPatch(
  event: EventDetail,
  mutate: (current: MilitaryDetailsShape | null) => MilitaryDetailsShape | null,
): UpdateEventDto {
  const next = mutate(getMilitary(event).militaryDetails ?? null)
  // SDK MilitaryEventDto는 enum 유니온이 더 좁지만 런타임 값은 동일 — 캐스팅으로 통과.
  return { militaryEvent: { militaryDetails: next } } as unknown as UpdateEventDto
}
