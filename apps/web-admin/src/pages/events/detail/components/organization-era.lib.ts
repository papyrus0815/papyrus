import { parseIsoDateParts } from '@/shared/lib/iso-date'

interface EraBounds {
  foundedDate?: string | null
  dissolvedDate?: string | null
}

interface EventSpan {
  startDate?: string | null
  endDate?: string | null
}

/**
 * 그 사건 때 있던 조직인가 — 조직 추천을 사건의 시대로 거른다.
 *
 * 예전 추천은 '참여국 소속'만 봐서, 미국이 참여한 1차세계대전(1914)에 나스닥(1971)·마이크로소프트(1975)·
 * 스페이스X(2002)를 권했다. 사건 기간과 조직의 존속 기간(설립~해산)이 겹칠 때만 남긴다.
 *
 * - 사건 날짜를 모르면 거르지 않는다(걸러서 숨기면 고를 길이 없어진다).
 * - 조직의 설립·해산을 모르는 쪽은 열린 구간으로 본다.
 * - 해 단위 비교 — 추천의 거름이라 달·일까지 따질 일이 아니다.
 */
export function organizationActiveDuring(organization: EraBounds, event: EventSpan): boolean {
  const eventStart = parseIsoDateParts(event.startDate)?.year ?? null
  const eventEnd = parseIsoDateParts(event.endDate)?.year ?? eventStart
  if (eventStart == null || eventEnd == null) return true

  const founded = parseIsoDateParts(organization.foundedDate)?.year ?? null
  const dissolved = parseIsoDateParts(organization.dissolvedDate)?.year ?? null
  if (founded != null && founded > eventEnd) return false
  if (dissolved != null && dissolved < eventStart) return false
  return true
}
