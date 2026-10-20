/**
 * 사건 유형(EventType) — 어떤 **형식**의 사건인가(전투·조약 체결·즉위…). 분야(categoryId)와 별개.
 *
 * 서버는 값만 보관·검증한다. 유형별로 무엇을 기록하는지(핵심/선택 기록·지표 프리셋)는 프론트 유형
 * 레지스트리(apps/web-admin/src/features/event-type/model/registry.ts)가 정본이고, 기록을 유형으로 막지
 * 않는다 — 전쟁은 조약으로 끝나고 봉기에도 진영이 있다.
 */
import { EventType } from '@prisma/client'

export type EventTypeValue = EventType

export const EVENT_TYPE_VALUES = Object.values(EventType) as EventTypeValue[]

/** 'WAR,BATTLE' 같은 쿼리 → 유효한 유형만. 비거나 전부 무효면 undefined(필터 없음) */
export function parseEventTypes(raw?: string): EventTypeValue[] | undefined {
  if (!raw) return undefined
  const values = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is EventTypeValue => (EVENT_TYPE_VALUES as string[]).includes(part))
  return values.length > 0 ? values : undefined
}
