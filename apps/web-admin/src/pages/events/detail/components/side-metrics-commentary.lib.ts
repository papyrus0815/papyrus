/**
 * 수치 해설 — 진영 비교표를 **문장 몇 줄로** 읽어 준다(순수 로직, side-metrics-commentary.spec.ts).
 *
 * 비교표는 숫자를 나란히 세울 뿐, '그래서 무슨 뜻인가'는 독자가 계산해야 했다(보오전쟁: 병력 63.7만 대
 * 60만, 손실 1.85만 대 10.8만 — 비슷한 병력에 손실은 여섯 배 가까이). 해설은 그 계산을 대신한다.
 *
 * 규칙(보수적 — 값이 말하는 것만):
 *  - 두 진영 모두 **대표값**이 있는 지표만 비교한다(값 하나, 또는 여럿 중 채택 추정치 하나 —
 *    시점·전선이 다른 값이 여럿이면 어느 둘을 견줄지 모른다)
 *  - '~이상' 값은 배수를 거짓으로 만들어 비교에서 뺀다
 *  - 병력 → 손실(우선순위 한 지표) → 손실률 순, 최대 세 줄
 */
import {
  comparableOf,
  formatRate,
  LOSS_METRIC_PRIORITY,
  lossRate,
  type MemberCellsMap,
  memberSum,
  type MetricObservationLike,
  SIZE_METRIC_PRIORITY,
  type SideMetricRow,
} from './side-metrics.lib'

export interface CommentarySide {
  id: string
  name: string
}

export interface CommentaryLine {
  /** 지표 이름(줄 머리) */
  label: string
  /** 한마디 — '비슷했다' · '오스트리아 측이 5.8배' */
  verdict: string
  /** 근거 수치 — '약 63.7만명 대 약 60만명' */
  evidence: string
}

/** 받침 있으면 '이', 없으면 '가' — 진영 이름 뒤 조사 */
export function subjectParticle(name: string): string {
  const last = name.trim().charCodeAt(name.trim().length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '이(가)'
  return (last - 0xac00) % 28 === 0 ? '가' : '이'
}

/** 배수 표현 — 1.15배 미만은 같다고 본다(추정치 오차 안쪽) */
export function ratioVerdict(
  larger: CommentarySide,
  ratio: number,
  kind: 'size' | 'loss',
): string {
  if (ratio < 1.15) return '비슷했다'
  const times = ratio < 2 ? `약 ${ratio.toFixed(1)}배` : `${ratio.toFixed(1)}배`
  const subject = `${larger.name}${subjectParticle(larger.name)}`
  return kind === 'size' ? `${subject} ${times} 많았다` : `${subject} ${times} 컸다`
}

type Formatter = (observation: MetricObservationLike) => string

interface ResolvedSideValue {
  metricName: string
  value: number
  formatted: string
}

function resolveForKey(
  key: string,
  sideId: string,
  rows: ReadonlyArray<SideMetricRow<MetricObservationLike>>,
  memberCells: MemberCellsMap<MetricObservationLike> | undefined,
  unitCells: MemberCellsMap<MetricObservationLike> | undefined,
  format: Formatter,
): ResolvedSideValue | null {
  const row = rows.find((candidate) => candidate.key === key)
  const direct = row ? comparableOf(row.cells.get(sideId) ?? []) : null
  if (direct) {
    return {
      metricName: row?.name ?? direct.observation.metric.name,
      value: direct.value,
      formatted: format(direct.observation),
    }
  }
  const members = memberCells?.get(key)?.get(sideId) ?? []
  const countryTotal = memberSum(members)
  if (countryTotal !== null && countryTotal > 0 && members[0]) {
    const synthetic: MetricObservationLike = {
      ...members[0].observation,
      value: String(Math.round(countryTotal)),
      low: null,
      high: null,
      atLeast: false,
    }
    return {
      metricName: row?.name ?? members[0].observation.metric.name,
      value: countryTotal,
      formatted: `${format(synthetic)} (나라 합)`,
    }
  }
  const units = unitCells?.get(key)?.get(sideId) ?? []
  const unitTotal = memberSum(units)
  if (unitTotal !== null && unitTotal > 0 && units[0]) {
    const synthetic: MetricObservationLike = {
      ...units[0].observation,
      value: String(Math.round(unitTotal)),
      low: null,
      high: null,
      atLeast: false,
    }
    return {
      metricName: row?.name ?? units[0].observation.metric.name,
      value: unitTotal,
      formatted: `${format(synthetic)} (부대 합)`,
    }
  }
  return null
}

function buildLineFromPair(
  label: string,
  first: ResolvedSideValue,
  second: ResolvedSideValue,
  sides: readonly [CommentarySide, CommentarySide],
  kind: 'size' | 'loss',
): CommentaryLine {
  const [larger, smaller] =
    first.value >= second.value
      ? [
          { side: sides[0], ...first },
          { side: sides[1], ...second },
        ]
      : [
          { side: sides[1], ...second },
          { side: sides[0], ...first },
        ]
  return {
    label,
    verdict: ratioVerdict(larger.side, larger.value / smaller.value, kind),
    evidence: `${sides[0].name} ${first.formatted} · ${sides[1].name} ${second.formatted}`,
  }
}

/**
 * 해설 줄 — 진영이 정확히 둘일 때만(셋 이상은 '누가 몇 배'가 한 문장으로 안 선다).
 * 진영 직접 값뿐 아니라 참여국 합(`memberCells`)·투입 부대 합(`unitCells`)도 같은 기준으로 읽는다.
 */
export function buildSideCommentary(
  rows: ReadonlyArray<SideMetricRow<MetricObservationLike>>,
  sides: ReadonlyArray<CommentarySide>,
  format: Formatter,
  memberCells?: MemberCellsMap<MetricObservationLike>,
  unitCells?: MemberCellsMap<MetricObservationLike>,
): CommentaryLine[] {
  if (sides.length !== 2) return []
  const pair = [sides[0], sides[1]] as const
  const lines: CommentaryLine[] = []

  let matchedSize = false
  for (const key of SIZE_METRIC_PRIORITY) {
    const first = resolveForKey(key, pair[0].id, rows, memberCells, unitCells, format)
    const second = resolveForKey(key, pair[1].id, rows, memberCells, unitCells, format)
    if (first && second) {
      lines.push(buildLineFromPair(first.metricName, first, second, pair, 'size'))
      matchedSize = true
      break
    }
  }
  /* 한쪽은 병력(정규군·경찰), 다른 쪽은 참여 인원(봉기·시위 등) — 그래프의 PAIRED_SIZE_KEY와 같은 규칙 */
  if (!matchedSize) {
    const resolveAnySize = (sideId: string) => {
      for (const sizeKey of SIZE_METRIC_PRIORITY) {
        const resolved = resolveForKey(sizeKey, sideId, rows, memberCells, unitCells, format)
        if (resolved) return resolved
      }
      return null
    }
    const firstSize = resolveAnySize(pair[0].id)
    const secondSize = resolveAnySize(pair[1].id)
    if (firstSize && secondSize) {
      const label =
        firstSize.metricName === secondSize.metricName
          ? firstSize.metricName
          : `${firstSize.metricName} · ${secondSize.metricName}`
      lines.push(buildLineFromPair(label, firstSize, secondSize, pair, 'size'))
    }
  }

  for (const key of LOSS_METRIC_PRIORITY) {
    const first = resolveForKey(key, pair[0].id, rows, memberCells, unitCells, format)
    const second = resolveForKey(key, pair[1].id, rows, memberCells, unitCells, format)
    if (first && second) {
      lines.push(buildLineFromPair(first.metricName, first, second, pair, 'loss'))
      break
    }
  }

  const rates = pair.map((side) => lossRate(rows, side.id, memberCells, unitCells))
  if (rates[0] && rates[1] && rates[0].rate > 0 && rates[1].rate > 0) {
    const [highIdx, lowIdx] = rates[0].rate >= rates[1].rate ? [0, 1] : [1, 0]
    const ratio = rates[highIdx]!.rate / rates[lowIdx]!.rate
    lines.push({
      label: '손실률',
      verdict: ratioVerdict(pair[highIdx], ratio, 'loss'),
      evidence: `${pair[0].name} ${formatRate(rates[0].rate)} · ${pair[1].name} ${formatRate(rates[1].rate)}`,
    })
  }
  return lines
}
