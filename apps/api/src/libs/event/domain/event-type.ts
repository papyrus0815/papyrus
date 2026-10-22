/**
 * 세부 분야(EventType, 선택) — 어떤 **꼴의 일**인가(전투·조약·법령…). 화면에서는 '분야 › 세부'의 2단계로
 * 보이지만 저장은 분야(categoryId)와 독립된 축이다 — 어떤 분야와도 짝지을 수 있다(군사 › 법령, 경제 › 조약).
 *
 * 서버는 값만 보관·검증한다. 세부별로 무엇을 기록하는지(핵심/선택 기록·지표 프리셋)와 분야마다 앞에 보일
 * 세부는 프론트 레지스트리(apps/web-admin/src/entities/event/model/event-type-registry.ts)가 정본이고,
 * 기록을 세부로 막지 않는다 — 전쟁은 조약으로 끝나고 봉기에도 진영이 있다.
 */
import { EventType } from '@prisma/client'

export type EventTypeValue = EventType

export const EVENT_TYPE_VALUES = Object.values(EventType) as EventTypeValue[]

/** 'BATTLE,TREATY' 같은 쿼리 → 유효한 세부만. 비거나 전부 무효면 undefined(필터 없음) */
export function parseEventTypes(raw?: string): EventTypeValue[] | undefined {
  if (!raw) return undefined
  const values = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is EventTypeValue => (EVENT_TYPE_VALUES as string[]).includes(part))
  return values.length > 0 ? values : undefined
}
