/**
 * 관련 사건(EventRelation) API — 상위/하위(계보 소속)와 별개인 '별개 사건끼리의 연결'.
 * 예: '아바르 칸국 건국' —계기가 됨→ '롬바르드 왕국 건국'.
 *
 * 방향은 항상 **지금 보고 있는 사건 기준**(outgoing = 이 사건이 출발점). 서버가 저장 행의
 * 어느 쪽에 서 있는지를 번역해 주므로, 화면은 direction과 아래 라벨 표만 보면 된다.
 */
import { functional } from '@papyrus/api-sdk'

import { nestiaApiService } from './api.service'

const api = functional
const getConnection = () => nestiaApiService.getConnection()

export type EventRelationItem = Awaited<
  ReturnType<typeof api.events.relations.getEventRelations>
>[number]
export type EventRelationType = EventRelationItem['relationType']
export type EventRelationDirection = EventRelationItem['direction']
export type EventRelationCounterpart = EventRelationItem['event']

/** 방향이 있는 유형 — 무방향(CONCURRENT·RELATED)은 방향 선택을 보여 주지 않는다 */
export const DIRECTED_RELATION_TYPES: ReadonlySet<EventRelationType> = new Set([
  'LED_TO',
  'INFLUENCED',
  'RESPONSE_TO',
])

/**
 * 유형 × 방향 → 이 사건 쪽에서 읽는 문구. 한 행을 양쪽 사건이 서로 반대 뜻으로 읽는다.
 * outgoing: 이 사건 → 상대 / incoming: 상대 → 이 사건
 */
export const EVENT_RELATION_LABELS: Record<
  EventRelationType,
  { outgoing: string; incoming: string; name: string; hint: string }
> = {
  LED_TO: {
    name: '직접 계기',
    outgoing: '이 사건으로 일어난 사건',
    incoming: '계기가 된 사건',
    hint: '한 사건이 다른 사건을 직접 일으켰다',
  },
  INFLUENCED: {
    name: '배경·영향',
    outgoing: '이 사건이 배경이 된 사건',
    incoming: '배경이 된 사건',
    hint: '직접 원인은 아니지만 바탕이 되었다',
  },
  RESPONSE_TO: {
    name: '대응',
    outgoing: '이 사건에 대한 대응',
    incoming: '이 사건이 대응한 사건',
    hint: '한 사건이 다른 사건에 대한 대응·반작용이다',
  },
  CONCURRENT: {
    name: '같은 국면',
    outgoing: '같은 국면의 사건',
    incoming: '같은 국면의 사건',
    hint: '같은 시기에 얽혀 함께 진행되었다',
  },
  RELATED: {
    name: '관련',
    outgoing: '관련 사건',
    incoming: '관련 사건',
    hint: '그 밖의 관련',
  },
}

/** 화면 묶음 순서 — 앞 사건(원인 쪽) → 뒤 사건(결과 쪽) → 무방향 */
export const EVENT_RELATION_GROUP_ORDER: ReadonlyArray<{
  type: EventRelationType
  direction: EventRelationDirection
}> = [
  { type: 'LED_TO', direction: 'incoming' },
  { type: 'INFLUENCED', direction: 'incoming' },
  { type: 'RESPONSE_TO', direction: 'incoming' },
  { type: 'LED_TO', direction: 'outgoing' },
  { type: 'INFLUENCED', direction: 'outgoing' },
  { type: 'RESPONSE_TO', direction: 'outgoing' },
  { type: 'CONCURRENT', direction: 'outgoing' },
  { type: 'RELATED', direction: 'outgoing' },
]

/** 한 행이 속하는 묶음 키 — 무방향 유형은 방향을 합친다 */
export function relationGroupKey(item: {
  relationType: EventRelationType
  direction: EventRelationDirection
}): string {
  const direction = DIRECTED_RELATION_TYPES.has(item.relationType)
    ? item.direction
    : 'outgoing'
  return `${item.relationType}:${direction}`
}

export function getEventRelations(eventId: string) {
  return api.events.relations.getEventRelations(getConnection(), eventId)
}

export function createEventRelation(
  eventId: string,
  body: {
    relatedEventId: string
    relationType: EventRelationType
    direction?: EventRelationDirection
    description?: string | null
  },
) {
  return api.events.relations.createEventRelation(getConnection(), eventId, body)
}

export function updateEventRelation(
  eventId: string,
  relationId: string,
  body: {
    relationType?: EventRelationType
    direction?: EventRelationDirection
    description?: string | null
  },
) {
  return api.events.relations.updateEventRelation(
    getConnection(),
    eventId,
    relationId,
    body,
  )
}

export function deleteEventRelation(eventId: string, relationId: string) {
  return api.events.relations.deleteEventRelation(getConnection(), eventId, relationId)
}
