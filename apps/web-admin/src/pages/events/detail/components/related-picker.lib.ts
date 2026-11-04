/**
 * 관련 사건 연결 모달 — 후보의 **때**(이 사건과 얼마나 떨어졌나)와 저장 방향의 **날짜 정합**.
 *
 * 예전 모달은 검색어가 비면 '최근 수정순' 50건을 냈다 — 사라예보(1914)에서 열면 1789~91년 프랑스 혁명 사건만
 * 보였다. 방향은 '날짜로 추정'한다는 주석과 달리 늘 '상대 → 이 사건'이라, 사라예보에서 25일 뒤의 7월 23일
 * 최후통첩을 고르면 '최후통첩이 사라예보의 직접 계기'가 기본값으로 섰다.
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { type EventRelationDirection, type EventRelationType } from '@/shared/api/event-relations'

import { type DatedNode, gapText } from './development-gap.lib'
import { astronomicalYear, dayNumber, isDayPrecise } from './event-facts.lib'

export interface PickerEvent extends DatedNode {
  startEra?: string | null
  startYear?: number | null
}

/** 부호 연도(BC 음수) — ISO가 없으면 구조화 연도 */
export function signedStartYear(node: PickerEvent): number | null {
  const parts = parseIsoDateParts(node.startDate)
  if (parts) return parts.year
  if (node.startYear != null) return node.startEra === 'BC' ? -node.startYear : node.startYear
  return null
}

/**
 * 견줄 수 있는 날 번호 — 연도만 아는 사건은 그해 한가운데(7월 1일)로 둔다.
 * 1월 1일로 두면 같은 해의 날짜 아는 사건이 모두 '뒤'가 된다.
 */
export function startSerial(node: PickerEvent): number | null {
  const parts = parseIsoDateParts(node.startDate)
  if (parts) {
    const year = astronomicalYear(parts.year)
    if (node.startDatePrecision === 'month') return dayNumber(year, parts.month, 15)
    if (node.startDatePrecision === 'year' || !isDayPrecise(node.startDate as string, node.startDatePrecision)) {
      return dayNumber(year, 7, 1)
    }
    return dayNumber(year, parts.month, parts.day)
  }
  const signed = signedStartYear(node)
  return signed == null ? null : dayNumber(astronomicalYear(signed), 7, 1)
}

/**
 * 상대가 이 사건 기준 언제인가 — '25일 뒤'·'같은 날'·'약 3개월 앞'·'약 120년 앞'.
 * 날짜를 둘 다 알면 전개의 간격과 같은 셈법, 아니면 연도 차.
 */
export function relativeStart(self: PickerEvent, other: PickerEvent): string | null {
  if (self.startDate && other.startDate) {
    const forward = gapText(self, other)
    if (forward) return forward.text
    const backward = gapText(other, self)
    if (backward) return backward.text.replace(/ 뒤$/, ' 앞')
  }
  const selfYear = signedStartYear(self)
  const otherYear = signedStartYear(other)
  if (selfYear == null || otherYear == null) return null
  const diff = astronomicalYear(otherYear) - astronomicalYear(selfYear)
  if (diff === 0) return '같은 해'
  return diff > 0 ? `약 ${diff}년 뒤` : `약 ${-diff}년 앞`
}

/** 앞 사건이 원인 쪽 — 상대가 먼저면 '상대 → 이 사건', 나중이면 '이 사건 → 상대'. 같거나 모르면 null */
export function inferDirection(self: PickerEvent, other: PickerEvent): EventRelationDirection | null {
  const selfKey = startSerial(self)
  const otherKey = startSerial(other)
  if (selfKey == null || otherKey == null || selfKey === otherKey) return null
  return otherKey < selfKey ? 'incoming' : 'outgoing'
}

const DIRECTED: ReadonlySet<EventRelationType> = new Set(['LED_TO', 'INFLUENCED', 'RESPONSE_TO'])

/**
 * 고른 방향이 날짜와 어긋나는가 — 계기·배경·대응은 모두 '앞 사건 → 뒤 사건'으로 저장된다.
 * 원인 쪽이 결과 쪽보다 **늦게** 시작하면 true. 날짜를 모르면 판단하지 않는다.
 */
export function directionConflicts(
  type: EventRelationType,
  direction: EventRelationDirection,
  self: PickerEvent,
  other: PickerEvent,
): boolean {
  if (!DIRECTED.has(type)) return false
  const inferred = inferDirection(self, other)
  return inferred != null && inferred !== direction
}

type ParticlePair = '이/가' | '과/와' | '은/는'

/**
 * 받침에 맞는 조사 — 제목 끝의 괄호 덧말('(1914)')은 건너뛰고 본말 끝 글자로 정한다.
 * 한글로 끝나지 않으면 '이(가)'처럼 둘 다 적는다.
 */
export function particle(word: string, pair: ParticlePair): string {
  const [withFinal, withoutFinal] = pair.split('/')
  const core = word.replace(/\s*[([（][^)\]）]*[)\]）]\s*$/, '').trim()
  const code = core.charCodeAt(core.length - 1)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return `${withFinal}(${withoutFinal})`
  return (code - 0xac00) % 28 === 0 ? withoutFinal : withFinal
}

/** 저장될 관계를 한 문장으로 — 고르는 순간 방향이 맞는지 읽히게 */
export function relationSentence(
  type: EventRelationType,
  direction: EventRelationDirection,
  selfTitle: string,
  otherTitle: string,
): string {
  const [from, to] = direction === 'outgoing' ? [selfTitle, otherTitle] : [otherTitle, selfTitle]
  switch (type) {
    case 'LED_TO':
      return `‘${from}’${particle(from, '이/가')} ‘${to}’의 직접 계기가 되었다`
    case 'INFLUENCED':
      return `‘${from}’${particle(from, '이/가')} ‘${to}’의 배경이 되었다`
    case 'RESPONSE_TO':
      return `‘${to}’${particle(to, '은/는')} ‘${from}’에 대한 대응이다`
    case 'CONCURRENT':
      return `‘${selfTitle}’${particle(selfTitle, '과/와')} ‘${otherTitle}’${particle(otherTitle, '은/는')} 같은 국면에서 얽혀 진행되었다`
    default:
      return `‘${selfTitle}’${particle(selfTitle, '과/와')} ‘${otherTitle}’${particle(otherTitle, '은/는')} 관련이 있다`
  }
}

/** 시점이 가까운 순 — 날짜 모르는 후보는 뒤로, 그 안에서는 받은 차례 그대로 */
export function byProximity<T extends PickerEvent>(self: PickerEvent, items: ReadonlyArray<T>): T[] {
  const selfKey = startSerial(self)
  if (selfKey == null) return [...items]
  return items
    .map((item, index) => {
      const key = startSerial(item)
      return { item, index, distance: key == null ? Number.POSITIVE_INFINITY : Math.abs(key - selfKey) }
    })
    .sort((left, right) => left.distance - right.distance || left.index - right.index)
    .map((entry) => entry.item)
}
