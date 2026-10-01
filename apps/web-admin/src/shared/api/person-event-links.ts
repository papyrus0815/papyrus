/**
 * 인물 쪽 사건 참여 연결 API — 사건 상세 '참여 인물'과 같은 표(person_event)를 인물에서 쓴다.
 *
 * - 후보: 검색어가 없으면 인물의 나라·생애로 고른 추천, 있으면 제목 검색. 연결된 사건은 늘 함께 온다.
 * - 연결: 멱등(없으면 만들고 있으면 역할만 바꿈). 해제: 멱등.
 */
import * as eventCandidatesApi from '@api/functional/persons/event_candidates'
import * as personEventsApi from '@api/functional/persons/events'
import * as recordSuggestionsApi from '@api/functional/persons/record_event_suggestions'

import { getApiConnection } from './client'

export type PersonEventCandidates = eventCandidatesApi.getEventCandidates.Output
export type PersonEventCandidate = PersonEventCandidates['items'][number]
export type PersonEventLink = personEventsApi.linkEvent.Output
export type RecordEventSuggestions =
  recordSuggestionsApi.getRecordEventSuggestions.Output
export type RecordEventSuggestion =
  RecordEventSuggestions['byRecordId'][string][number]

/** 재임·재위별 '이 기간의 사건' 제안 — 업적으로 한 번에 잇기 위한 후보 */
export function getRecordEventSuggestions(
  personId: string,
): Promise<RecordEventSuggestions> {
  return recordSuggestionsApi.getRecordEventSuggestions(getApiConnection(), personId)
}

export function getPersonEventCandidates(
  personId: string,
  query?: string,
): Promise<PersonEventCandidates> {
  const trimmed = query?.trim()
  return eventCandidatesApi.getEventCandidates(
    getApiConnection(),
    personId,
    trimmed ? trimmed : undefined,
  )
}

export function linkPersonEvent(
  personId: string,
  eventId: string,
  body: { role?: string | null; note?: string | null } = {},
): Promise<PersonEventLink> {
  return personEventsApi.linkEvent(getApiConnection(), personId, eventId, body)
}

export function unlinkPersonEvent(
  personId: string,
  eventId: string,
): Promise<{ success: true }> {
  return personEventsApi.unlinkEvent(getApiConnection(), personId, eventId)
}
