/**
 * 사건 분야(EventDomain) — **무엇에 관한 일인가**(정치·외교·군사·경제…). 사건의 분류이자 색·필터의 기준.
 * 2단계는 세부 분야(EventType, domain/event-type.ts) — 독립 축이라 어떤 분야와도 짝지을 수 있다.
 *
 * 서버는 값만 보관·검증한다. 라벨·색·아이콘은 프론트 분야 레지스트리
 * (apps/web-admin/src/entities/event/model/event-domain.ts)가 정본이다.
 */
import { EventDomain } from '@prisma/client'

export type EventDomainValue = EventDomain

export const EVENT_DOMAIN_VALUES = Object.values(EventDomain) as EventDomainValue[]

/** 쿼리 값 → 유효한 분야. 비거나 무효면 undefined(필터 없음) */
export function parseEventDomain(raw?: string): EventDomainValue | undefined {
  const value = raw?.trim()
  return value && (EVENT_DOMAIN_VALUES as string[]).includes(value) ? (value as EventDomainValue) : undefined
}
