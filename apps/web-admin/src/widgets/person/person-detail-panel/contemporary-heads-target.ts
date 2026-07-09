import { parseIsoDateParts } from './helpers'
import type { TenureLikeRecord } from './types'

/**
 * 「동시대 수장 비교」 딥링크 타깃.
 * 인물의 수장급 재임·재위에서 파생한 대표 연도·시간축 범위·핀 국가 목록 —
 * `pathKeys.headsOfState(year, { range, pins })` 입력과 1:1 대응.
 */
export interface ContemporaryHeadsTarget {
  /** 동시대 가이드라인을 꽂을 대표 연도 (병합 재위 스팬의 중앙값, 부호 있는 연도) */
  year: number
  /** 시간축 초기 범위 — 병합 스팬 + 패딩, endYear > startYear 보장 */
  range: { startYear: number; endYear: number }
  /** 핀할 국가들 (C=현대, H=역사) — 재위 시작순, kind+id dedup */
  pins: Array<{ kind: 'C' | 'H'; id: string }>
}

/** 수장 비교 타임라인과 동일 기준 — 국가원수·정부수반만 (normalize-tenures.ts 참조) */
const HEAD_POSITION_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])

const RANGE_PADDING_RATIO = 0.12
const MIN_RANGE_PADDING = 8

/** ISO 날짜 → 부호 있는 연도 (BC 음수). 파싱 불가/없음은 null. */
function toSignedYear(iso: string | null | undefined): number | null {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  return parts.era === 'BC' ? -parts.year : parts.year
}

/**
 * 수장급 재임·재위에서 딥링크 타깃을 파생한다. 수장급 레코드(시작일 파싱 가능)가
 * 하나도 없으면 null — 호출부는 null이면 CTA를 렌더하지 않는다.
 *
 * 종료일이 비어있는 레코드는 「재임 중」과 「미입력」을 구분할 수 없으므로
 * min(올해, 사망 연도)로 캡한다 — 사망 연도 캡이 없으면 종료일 미입력 과거 군주의
 * 스팬이 올해까지 늘어나 대표 연도가 엉뚱한 시대에 떨어진다.
 * 사망은 확실한데 연도조차 미상이면(deceasedWithUnknownDeathYear) 올해로 캡하는 것도
 * 오답이므로 시작 연도로 잘라 최소한 그 인물의 시대 안에 머문다.
 */
export function deriveContemporaryHeadsTarget(input: {
  tenures: TenureLikeRecord[]
  reigns: TenureLikeRecord[]
  /** 사망 연도(부호 있는 연도, BC 음수) — 종료일 미입력 레코드의 상한 캡 */
  deathSignedYear?: number | null
  /** 사망했으나 사망 연도 미상 — 열린 종료를 올해가 아닌 시작 연도로 잘라낸다 */
  deceasedWithUnknownDeathYear?: boolean
  /** 현재 연도 주입(테스트용) — 기본값은 실제 올해 */
  nowYear?: number
}): ContemporaryHeadsTarget | null {
  const nowYear = input.nowYear ?? new Date().getFullYear()
  const openEndCap =
    input.deathSignedYear != null
      ? Math.min(input.deathSignedYear, nowYear)
      : input.deceasedWithUnknownDeathYear
        ? null
        : nowYear

  // 수장급만: 재임은 positionType 필터, 재위(SovereignReign)는 전량 수장으로 간주
  const headRecords: TenureLikeRecord[] = [
    ...input.tenures.filter(
      (tenure) =>
        tenure.positionType != null &&
        HEAD_POSITION_TYPES.has(tenure.positionType),
    ),
    ...input.reigns,
  ]

  const spans: Array<{ start: number; end: number; record: TenureLikeRecord }> = []
  for (const record of headRecords) {
    const start = toSignedYear(record.startDate)
    if (start == null) continue
    const rawEnd = toSignedYear(record.endDate) ?? openEndCap ?? start
    // 데이터 오류(종료 < 시작)나 시작 전 사망 캡은 시작 연도로 클램프
    spans.push({ start, end: Math.max(start, rawEnd), record })
  }
  if (spans.length === 0) return null

  spans.sort((left, right) => left.start - right.start)

  const minStart = spans[0]!.start
  const maxEnd = spans.reduce(
    (acc, span) => Math.max(acc, span.end),
    spans[0]!.end,
  )

  // 대표 연도 = 병합 스팬 중앙값. 연도 0은 존재하지 않으므로(BC 1 다음이 AD 1) 1로 보정.
  let year = Math.round((minStart + maxEnd) / 2)
  if (year === 0) year = 1

  const span = maxEnd - minStart
  const padding = Math.max(Math.round(span * RANGE_PADDING_RATIO), MIN_RANGE_PADDING)
  const range = { startYear: minStart - padding, endYear: maxEnd + padding }

  // 핀 국가 — 재위 시작순, 역사국가(H) 우선, kind+id dedup
  const seen = new Set<string>()
  const pins: ContemporaryHeadsTarget['pins'] = []
  for (const { record } of spans) {
    const historicalId = record.historicalCountry?.id
    const modernId = record.country?.id
    const pin: ContemporaryHeadsTarget['pins'][number] | null = historicalId
      ? { kind: 'H', id: historicalId }
      : modernId
        ? { kind: 'C', id: modernId }
        : null
    if (!pin) continue
    const key = `${pin.kind}:${pin.id}`
    if (seen.has(key)) continue
    seen.add(key)
    pins.push(pin)
  }

  return { year, range, pins }
}
