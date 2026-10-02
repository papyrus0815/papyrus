/**
 * 생애 타임라인 배치 — 출생부터 사망(또는 현재)까지의 축 위에 재임·재위 구간을 레인으로 쌓는다.
 *
 * 왜. 재임이 많은 인물(조제프 조프르 15건)은 개요가 재임 카드 15장(약 6,500px)을 차례로
 * 읽어야만 '언제 무엇을 했나'가 보였다. 생애 축 하나에 구간을 겹쳐 그리면 경력의 모양
 * (공백·겹침·말년 집중)이 첫 화면에서 읽힌다. 카드 목록은 그대로 두고, 막대를 누르면 그 카드로 간다.
 *
 * 모든 연도는 부호 있는 연도(BC 음수)의 소수 표현 — 월·일은 비율로만 반영한다(축 위치용).
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'

export type LifeRecordFamily = 'office' | 'noble' | 'reign'

export interface LifeRecordInput {
  /** 카드 앵커와 같은 키 — `${kind}-${id}` */
  key: string
  family: LifeRecordFamily
  title: string
  startDate?: string | null
  endDate?: string | null
}

export interface LifeBar {
  key: string
  family: LifeRecordFamily
  title: string
  lane: number
  /** 축 위 시작·끝 위치(0~1) */
  x0: number
  x1: number
  /** 시작·끝 연도(정수, 표시용) */
  startYear: number
  endYear: number | null
  /** 끝이 열려 있는가(종료일 없음 → 사망/현재까지로 그림) */
  open: boolean
}

export interface LifeTimelineLayout {
  from: number
  to: number
  bars: LifeBar[]
  laneCount: number
  ticks: Array<{ year: number; x: number }>
}

/** 레인 상한 — 넘치는 구간은 마지막 레인에 겹쳐 그린다(축 높이가 끝없이 늘지 않게) */
export const MAX_LANES = 4

const yearFraction = (iso?: string | null): number | null => {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  return parts.year + (parts.month - 1) / 12 + (parts.day - 1) / 365
}

/** 눈금 간격 — 축 길이에 맞춰 대략 4~8개가 서도록 */
function tickStep(span: number): number {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]
  return steps.find((step) => span / step <= 8) ?? 1000
}

export function computeLifeTimeline(input: {
  records: LifeRecordInput[]
  /** 부호 있는 출생·사망 연도 — 모르면 null */
  birthYear: number | null
  deathYear: number | null
  isDeceased: boolean
  nowYear: number
}): LifeTimelineLayout | null {
  const { records, birthYear, deathYear, isDeceased, nowYear } = input

  const dated = records
    .map((record) => ({ record, start: yearFraction(record.startDate) }))
    .filter(
      (entry): entry is { record: LifeRecordInput; start: number } =>
        entry.start != null,
    )
  if (dated.length === 0) return null

  const firstStart = Math.min(...dated.map((entry) => entry.start))
  const from = birthYear ?? Math.floor(firstStart)
  /* 열린 끝의 기본값 — 고인은 사망 연도(모르면 그 구간 시작 직후), 생존자는 현재 */
  const openEnd = (start: number) =>
    deathYear != null ? deathYear + 0.5 : isDeceased ? start + 0.5 : nowYear
  const withEnds = dated.map(({ record, start }) => {
    const end = yearFraction(record.endDate)
    return {
      record,
      start,
      end: end != null ? Math.max(end, start) : Math.max(openEnd(start), start),
      open: end == null,
    }
  })
  const lastEnd = Math.max(...withEnds.map((entry) => entry.end))
  const to = Math.max(
    deathYear != null ? deathYear + 1 : isDeceased ? lastEnd : nowYear,
    lastEnd,
    from + 1,
  )
  const span = to - from
  const position = (year: number) =>
    Math.min(1, Math.max(0, (year - from) / span))

  /* 레인 배치 — 시작순 그리디. 바로 붙는 구간(1888 끝 → 1888 시작)도 같은 레인에 둔다 */
  const laneEnds: number[] = []
  const bars = withEnds
    .slice()
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .map(({ record, start, end, open }) => {
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start + 0.01)
      if (lane === -1) {
        lane = laneEnds.length < MAX_LANES ? laneEnds.length : MAX_LANES - 1
      }
      laneEnds[lane] = Math.max(laneEnds[lane] ?? -Infinity, end)
      return {
        key: record.key,
        family: record.family,
        title: record.title,
        lane,
        x0: position(start),
        x1: position(end),
        startYear: Math.floor(start),
        endYear: open ? null : Math.floor(end),
        open,
      }
    })

  const step = tickStep(span)
  const ticks: Array<{ year: number; x: number }> = []
  for (
    let year = Math.ceil(from / step) * step;
    year <= to;
    year += step
  ) {
    ticks.push({ year, x: position(year) })
  }

  return { from, to, bars, laneCount: laneEnds.length, ticks }
}
