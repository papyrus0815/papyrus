/**
 * 지도 데이터 점검 — "왜 지도에 안 나오나"를 항목별로 모은다.
 *
 * 지도는 기록에서 파생되므로, 빈 곳의 원인은 늘 입력 쪽에 있다. 원인을 다섯 갈래로 나눠
 * 고치러 갈 곳(사건·국가·인물·조약)과 함께 돌려준다. 모든 판정은 지도와 **같은 함수**
 * (isFrontLineEvent·resolveModernToHistorical·isActiveAt)로 해서, 점검을 다 고치면
 * 지도에 실제로 나타나게 한다.
 */
import { isArmedConflictType } from '@/entities/event/model/event-type-registry'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import {
  type AtlasCountry,
  type AtlasCountryInput,
  type AtlasEventInput,
  type AtlasTreatyInput,
  type RulerWithPlace,
  buildEdges,
  isActiveAt,
  isFrontLineEvent,
  resolveModernToHistorical,
  signedYear,
} from './atlas-model'

export type AuditTarget =
  | { kind: 'event'; id: string }
  | { kind: 'country'; id: string }
  | { kind: 'person'; id: string }
  | { kind: 'treaty'; id: string }

export interface AuditIssue {
  key: string
  title: string
  detail: string
  /** 정렬·표시용 연도 (없으면 null) */
  year: number | null
  target: AuditTarget
}

export type AuditCategory =
  | 'warWithoutFront'
  | 'rulerOffMap'
  | 'countryWithoutCoords'
  | 'openAlliance'
  | 'duplicateEvent'

export const AUDIT_CATEGORY_META: Record<
  AuditCategory,
  { label: string; effect: string; fix: string }
> = {
  warWithoutFront: {
    label: '선을 못 긋는 전쟁',
    effect: '전쟁 사건인데 지도에 교전선이 그려지지 않습니다.',
    fix: '사건 상세 → 참여국에서 진영(A편/B편)을 나누거나, 주도국·대상국 역할을 지정하세요.',
  },
  rulerOffMap: {
    label: '지도에 안 올라가는 수장',
    effect: '재위·재임 기록이 있어도 핀을 세울 나라를 찾지 못합니다.',
    fix: '기록의 국가 연결, 또는 그 나라의 존속 기간·좌표를 확인하세요.',
  },
  countryWithoutCoords: {
    label: '좌표 없는 역사국가',
    effect: '지도에 핀을 놓을 자리가 없습니다.',
    fix: '국가 상세에서 위도·경도(수도·중심지)를 입력하세요.',
  },
  openAlliance: {
    label: '끝이 없는 동맹 조약',
    effect: '만료·파기일이 비어 있어 오늘까지 계속 동맹으로 그려집니다.',
    fix: '조약 상세에서 만료일이나 파기일을 입력하세요(실제로 유효하면 무시).',
  },
  duplicateEvent: {
    label: '중복 의심 사건',
    effect: '같은 사건이 두 번 등록돼 헤드라인·선이 겹칩니다.',
    fix: '두 사건을 비교해 하나로 합치거나 하나를 지우세요.',
  },
}

export const AUDIT_CATEGORY_ORDER: AuditCategory[] = [
  'warWithoutFront',
  'rulerOffMap',
  'countryWithoutCoords',
  'openAlliance',
  'duplicateEvent',
]

export interface CenturyCoverage {
  century: number
  /** 그 세기에 한 번이라도 재임한 수장 기록 수 */
  rulerCount: number
  /** 그 세기 100년 중 교전선이 하나라도 그려지는 해의 수 */
  frontYears: number
}

export interface AtlasAudit {
  issues: Record<AuditCategory, AuditIssue[]>
  total: number
}

function eventStartYear(event: AtlasEventInput): number | null {
  return parseIsoDateParts(event.startDate)?.year ?? null
}

function yearText(year: number | null): string {
  if (year == null) return '연도 미상'
  return year < 0 ? `BC ${Math.abs(year)}` : String(year)
}

/** 제목 비교용 — 공백·괄호 기호·하이픈 제거 */
function normalizeTitle(title: string): string {
  return title.replace(/[\s()（）\-–—·,.]/g, '').toLowerCase()
}

function checkWars(events: AtlasEventInput[]): AuditIssue[] {
  const byId = new Map(events.map((event) => [event.id, event]))
  const issues: AuditIssue[] = []
  for (const event of events) {
    // 무력 충돌 유형만 — 예전엔 '군사' 분류에 함대법·참모총장 취임·기동훈련이 섞여(84건 중 약 30건)
    // 제목 정규식으로 다시 걸렀다. 세부 분야(전쟁·전투·봉기)가 따로 있어 그 우회가 필요 없다.
    if (!isArmedConflictType(event.type)) continue
    if (isFrontLineEvent(event)) continue
    // 상위 전쟁이 이미 전선을 그리면 하위 전투(스당·세바스토폴…)는 지도에 더할 것이 없다
    const parent = event.parentEventId
      ? byId.get(event.parentEventId)
      : undefined
    if (parent && isFrontLineEvent(parent)) continue
    const participants = [
      ...(event.relatedHistoricalCountries ?? []),
      ...(event.relatedCountries ?? []),
    ]
    const detail =
      participants.length < 2
        ? `참여국 ${participants.length}곳 — 교전선은 두 나라 이상이 필요합니다`
        : `참여국 ${participants.length}곳, 진영·주도국/대상국 역할 미입력`
    issues.push({
      key: `war:${event.id}`,
      title: event.title,
      detail,
      year: eventStartYear(event),
      target: { kind: 'event', id: event.id },
    })
  }
  return issues
}

function checkRulers(
  rulers: RulerWithPlace[],
  countries: AtlasCountry[],
  countryInputs: AtlasCountryInput[],
): AuditIssue[] {
  const byId = new Map(countries.map((country) => [country.id, country]))
  const nameById = new Map(
    countryInputs.map((country) => [country.id, country.name]),
  )
  const issues: AuditIssue[] = []
  for (const { ruler, countryId, historicalCountryId } of rulers) {
    // 재위 기간 중 어느 해든 핀을 세울 수 있으면 통과 — 시작·끝·중간만 본다
    const end = ruler.endYear ?? ruler.startYear
    const probes = [
      ruler.startYear,
      Math.round((ruler.startYear + end) / 2),
      end,
    ]
    let reason: string | null = null
    if (historicalCountryId) {
      const country = byId.get(historicalCountryId)
      const name = nameById.get(historicalCountryId) ?? '연결 국가'
      if (!country) reason = `${name}에 좌표가 없습니다`
      else if (!probes.some((year) => isActiveAt(country, year)))
        reason = `${name}의 존속 기간(${yearText(country.startYear)}~${
          country.endYear != null ? yearText(country.endYear) : ''
        }) 밖의 재위입니다`
    } else if (countryId) {
      if (
        !probes.some((year) =>
          resolveModernToHistorical(countryId, year, countries),
        )
      )
        reason =
          '현대국가에만 연결돼 있고, 그 시기에 대응하는 역사국가가 없습니다'
    } else {
      reason = '국가가 연결되지 않았습니다'
    }
    if (!reason) continue
    issues.push({
      key: `ruler:${ruler.id}`,
      title: ruler.title ? `${ruler.name} (${ruler.title})` : ruler.name,
      detail: reason,
      year: ruler.startYear,
      target: { kind: 'person', id: ruler.personId },
    })
  }
  return issues
}

function checkCoords(
  countryInputs: AtlasCountryInput[],
  rulers: RulerWithPlace[],
): AuditIssue[] {
  const rulerCount = new Map<string, number>()
  for (const { historicalCountryId } of rulers) {
    if (historicalCountryId)
      rulerCount.set(
        historicalCountryId,
        (rulerCount.get(historicalCountryId) ?? 0) + 1,
      )
  }
  return (
    countryInputs
      .filter(
        (country) => country.latitude == null || country.longitude == null,
      )
      .map((country) => {
        const count = rulerCount.get(country.id) ?? 0
        return {
          key: `coords:${country.id}`,
          title: country.name,
          detail:
            count > 0
              ? `수장 기록 ${count}건이 지도에 못 올라갑니다`
              : '수장 기록 없음',
          year: signedYear(country.startEra, country.startYear),
          target: { kind: 'country' as const, id: country.id },
        }
      })
      // 수장 기록이 걸린 나라부터 — 고치면 바로 핀이 생긴다
      .sort(
        (left, right) =>
          (rulerCount.get(right.target.id) ?? 0) -
          (rulerCount.get(left.target.id) ?? 0),
      )
  )
}

function checkAlliances(treaties: AtlasTreatyInput[]): AuditIssue[] {
  return treaties
    .filter(
      (treaty) =>
        treaty.type === 'ALLIANCE' &&
        !treaty.expiryDate &&
        !treaty.violationDate,
    )
    .map((treaty) => ({
      key: `alliance:${treaty.id}`,
      title: treaty.name,
      detail: `${yearText(parseIsoDateParts(treaty.signDate)?.year ?? null)} 서명 이후 끝이 없음`,
      year: parseIsoDateParts(treaty.signDate)?.year ?? null,
      target: { kind: 'treaty' as const, id: treaty.id },
    }))
}

/**
 * 같은 해(±1)에 시작하고, 정규화한 제목 한쪽이 다른 쪽을 포함하면 중복 의심.
 * ('보불전쟁' ⊂ '프로이센프랑스전쟁보불전쟁'). 상·하위로 이어진 쌍은 의도된 구조라 뺀다.
 */
function checkDuplicates(events: AtlasEventInput[]): AuditIssue[] {
  const MIN_CORE_LENGTH = 3
  const prepared = events
    .map((event) => ({
      event,
      year: eventStartYear(event),
      norm: normalizeTitle(event.title),
    }))
    .filter(
      (entry) => entry.year != null && entry.norm.length >= MIN_CORE_LENGTH,
    )
  const issues: AuditIssue[] = []
  for (let outer = 0; outer < prepared.length; outer += 1) {
    for (let inner = outer + 1; inner < prepared.length; inner += 1) {
      const first = prepared[outer]!
      const second = prepared[inner]!
      if (Math.abs(first.year! - second.year!) > 1) continue
      if (
        first.event.parentEventId === second.event.id ||
        second.event.parentEventId === first.event.id
      )
        continue
      const [shorter, longer] =
        first.norm.length <= second.norm.length
          ? [first, second]
          : [second, first]
      if (!longer.norm.includes(shorter.norm)) continue
      issues.push({
        key: `dup:${shorter.event.id}:${longer.event.id}`,
        title: `${shorter.event.title} ↔ ${longer.event.title}`,
        detail: `${yearText(shorter.year)}년 무렵 시작 · 제목이 겹칩니다`,
        year: shorter.year,
        target: { kind: 'event', id: longer.event.id },
      })
    }
  }
  return issues
}

export function auditAtlasData(input: {
  countryInputs: AtlasCountryInput[]
  countries: AtlasCountry[]
  rulers: RulerWithPlace[]
  events: AtlasEventInput[]
  treaties: AtlasTreatyInput[]
}): AtlasAudit {
  const byYear = (left: AuditIssue, right: AuditIssue) =>
    (left.year ?? Infinity) - (right.year ?? Infinity)
  const issues: Record<AuditCategory, AuditIssue[]> = {
    warWithoutFront: checkWars(input.events).sort(byYear),
    rulerOffMap: checkRulers(
      input.rulers,
      input.countries,
      input.countryInputs,
    ).sort(byYear),
    countryWithoutCoords: checkCoords(input.countryInputs, input.rulers),
    openAlliance: checkAlliances(input.treaties).sort(byYear),
    duplicateEvent: checkDuplicates(input.events).sort(byYear),
  }
  const total = AUDIT_CATEGORY_ORDER.reduce(
    (sum, category) => sum + issues[category].length,
    0,
  )
  return { issues, total }
}

/**
 * 세기별 커버리지 — 어느 시대를 먼저 채울지 고르는 근거.
 * 전선 연도는 지도와 같은 buildEdges로 해마다 센다(연 수천 회지만 사건 수백 건이라 가볍다).
 */
export function coverageByCentury(input: {
  rulers: RulerWithPlace[]
  events: AtlasEventInput[]
  treaties: AtlasTreatyInput[]
  countries: AtlasCountry[]
  minYear: number
  maxYear: number
}): CenturyCoverage[] {
  const { rulers, minYear, maxYear } = input
  const centuryOf = (year: number) =>
    year > 0 ? Math.ceil(year / 100) : -Math.ceil(-year / 100) || -1
  const frontYearCount = new Map<number, number>()
  for (let year = minYear; year <= maxYear; year += 1) {
    if (year === 0) continue
    const hasFront = buildEdges(
      input.events,
      input.treaties,
      input.countries,
      year,
    ).some((edge) => edge.kind === 'war')
    if (hasFront) {
      const century = centuryOf(year)
      frontYearCount.set(century, (frontYearCount.get(century) ?? 0) + 1)
    }
  }
  const rows: CenturyCoverage[] = []
  for (
    let century = centuryOf(minYear);
    century <= centuryOf(maxYear);
    century += 1
  ) {
    if (century === 0) continue
    const start = century > 0 ? (century - 1) * 100 + 1 : century * 100
    const end = century > 0 ? century * 100 : (century + 1) * 100 - 1
    const rulerCount = rulers.filter(
      // 재임 중(끝 미정)은 오늘까지로 본다
      ({ ruler }) =>
        ruler.startYear <= end && (ruler.endYear ?? maxYear) >= start,
    ).length
    rows.push({
      century,
      rulerCount,
      frontYears: frontYearCount.get(century) ?? 0,
    })
  }
  return rows
}
