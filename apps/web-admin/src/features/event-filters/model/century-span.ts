/**
 * 사건이 **걸쳐 있는 세기 구간** — 세기 필터 술어와 세기 옵션 목록의 단일 출처.
 * FSD: features/event-filters/model
 *
 * ## 왜 별도 파일인가 (검토 DATA-1 / IA-4)
 * 예전엔 `matchesEvent`의 `centuryOk`와 `availableCenturies`가 각자
 * `getCenturyFromDate(start)`·`getCenturyFromDate(end)` **두 '점'만** 동등 비교했다.
 * 그래서 3세기에 시작해 7세기에 끝난 사건은
 *  ⑴ 5세기로 검색해도 나오지 않고
 *  ⑵ 세기 `<select>`에 5세기 옵션 자체가 생기지 않았다.
 * 같은 결함이 두 곳에 **복제**돼 있던 것이 근인이라, 판정을 이 파일 하나로 모으고
 * 두 소비처가 반드시 같은 함수를 거치게 한다.
 *
 * ## 세기 규약
 * BC는 음수 세기(-1 = 기원전 1세기)이고 **0세기는 존재하지 않는다**
 * (`shared/lib/iso-date`의 `getCentury`가 단일 출처). 음수 세기는 숫자 순서가
 * 곧 연대 순서라(-3 < -1 < 1) 구간 비교는 부호를 그대로 써도 성립하고,
 * 열거할 때만 0을 건너뛰면 된다.
 *
 * 날짜를 해석할 수 없으면(빈 문자열·미상) `null`을 돌려준다 — '어느 세기에도
 * 속하지 않음'이며, 이건 `CENTURY_UNKNOWN` 축이 따로 담당한다(검토 IA-5).
 */
import { getCenturyFromIso } from '@/shared/lib/iso-date'

/** 세기 구간 판정에 필요한 최소 표면 — 테스트·재사용을 위해 구조적 타입으로 좁힌다. */
export interface CenturySpannable {
  startDate?: string | null
  endDate?: string | null
}

export interface CenturySpan {
  /** 연대상 이른 쪽 세기(부호 포함) */
  from: number
  /** 연대상 늦은 쪽 세기(부호 포함) */
  to: number
}

/**
 * 열거로 만들 수 있는 세기 개수 상한.
 *
 * `availableCenturies`는 `<select>` 옵션이 되므로, 오타로 들어온 6자리 연도
 * (`parseIsoDateParts`는 최대 6자리를 받는다) 하나가 옵션 수천 개를 만들어 컨트롤을
 * 먹통으로 만들 수 있다. 실제 인류사 범위(기원전 40세기~21세기)의 3배 여유를 두고,
 * 넘으면 양 끝만 남긴다 — 데이터를 버리지 않으면서 UI 폭주만 막는다.
 */
const MAX_ENUMERATED_CENTURIES = 200

/**
 * 사건의 세기 구간. 시작·종료 중 하나만 해석되면 그 한 점이 곧 구간이고,
 * 둘 다 해석 불가면 `null`.
 */
export function getEventCenturySpan(event: CenturySpannable): CenturySpan | null {
  const startCentury = getCenturyFromIso(event.startDate)
  const endCentury = getCenturyFromIso(event.endDate)
  if (startCentury === null && endCentury === null) return null
  const first = startCentury ?? (endCentury as number)
  const second = endCentury ?? (startCentury as number)
  return {
    from: Math.min(first, second),
    to: Math.max(first, second),
  }
}

/** 이 사건이 해당 세기에 걸쳐 있는가(양 끝 포함). 날짜 미상이면 항상 false. */
export function eventSpansCentury(
  event: CenturySpannable,
  century: number,
): boolean {
  /**
   * 0세기는 존재하지 않는다 — `listEventCenturies`가 열거에서 빼는 것과 같은 규약을
   * 술어에도 건다. 구간 비교만 하면 `century=0`(손으로 고친 URL)이 기원전↔기원후를
   * 건너뛴 사건만 조용히 통과시키는데, 그 값은 `<select>`에 옵션조차 없어
   * 사용자가 왜 그 목록이 나왔는지 확인할 방법이 없다.
   * (URL 파라미터 자체의 검증은 파서 단일화와 함께 배치 4 몫이다.)
   */
  if (century === 0) return false
  const span = getEventCenturySpan(event)
  if (!span) return false
  return century >= span.from && century <= span.to
}

/** 날짜를 전혀 해석할 수 없는 사건인가 — 세기 축의 '연도 미상' 판정. */
export function isCenturyUnknown(event: CenturySpannable): boolean {
  return getEventCenturySpan(event) === null
}

/**
 * 이 사건이 걸친 세기 전부(오름차순). 0세기는 건너뛴다.
 * `eventSpansCentury`와 같은 구간에서 파생되므로 "옵션엔 없는데 술어는 통과"
 * (또는 그 반대)가 구조적으로 불가능하다.
 */
export function listEventCenturies(event: CenturySpannable): number[] {
  const span = getEventCenturySpan(event)
  if (!span) return []
  if (span.to - span.from >= MAX_ENUMERATED_CENTURIES) {
    return span.from === span.to ? [span.from] : [span.from, span.to]
  }
  const centuries: number[] = []
  for (let century = span.from; century <= span.to; century += 1) {
    if (century !== 0) centuries.push(century)
  }
  return centuries
}
