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
  centerOf,
  formatRate,
  representativeOf,
  LOSS_METRIC_PRIORITY,
  lossRate,
  type MetricObservationLike,
  PERSONNEL_METRIC,
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

/**
 * 두 진영(첫째·둘째)의 한 지표 비교 줄 — 대표값이 있고·'이상' 아님·0 초과일 때만.
 */
function compareLine(
  row: SideMetricRow<MetricObservationLike>,
  sides: readonly [CommentarySide, CommentarySide],
  kind: 'size' | 'loss',
  format: Formatter,
): CommentaryLine | null {
  const pick = (side: CommentarySide) => {
    const picked = representativeOf(row.cells.get(side.id) ?? [])
    if (!picked || picked.atLeast) return null
    const value = centerOf(picked)
    return value && value > 0 ? { observation: picked, value } : null
  }
  const first = pick(sides[0])
  const second = pick(sides[1])
  if (!first || !second) return null
  const [larger, smaller] =
    first.value >= second.value ? [{ side: sides[0], ...first }, { side: sides[1], ...second }] : [{ side: sides[1], ...second }, { side: sides[0], ...first }]
  return {
    label: row.name,
    verdict: ratioVerdict(larger.side, larger.value / smaller.value, kind),
    evidence: `${sides[0].name} ${format(first.observation)} · ${sides[1].name} ${format(second.observation)}`,
  }
}

/**
 * 해설 줄 — 진영이 정확히 둘일 때만(셋 이상은 '누가 몇 배'가 한 문장으로 안 선다).
 */
export function buildSideCommentary(
  rows: ReadonlyArray<SideMetricRow<MetricObservationLike>>,
  sides: ReadonlyArray<CommentarySide>,
  format: Formatter,
): CommentaryLine[] {
  if (sides.length !== 2) return []
  const pair = [sides[0], sides[1]] as const
  const lines: CommentaryLine[] = []
  const personnel = rows.find((row) => row.key === PERSONNEL_METRIC)
  const personnelLine = personnel ? compareLine(personnel, pair, 'size', format) : null
  if (personnelLine) lines.push(personnelLine)
  for (const key of LOSS_METRIC_PRIORITY) {
    const row = rows.find((candidate) => candidate.key === key)
    const line = row ? compareLine(row, pair, 'loss', format) : null
    if (line) {
      lines.push(line)
      break
    }
  }
  const rates = pair.map((side) => lossRate(rows, side.id))
  if (rates[0] && rates[1]) {
    const [high, low] = rates[0].rate >= rates[1].rate ? [0, 1] : [1, 0]
    const ratio = rates[high]!.rate / rates[low]!.rate
    lines.push({
      label: '손실률',
      verdict: ratioVerdict(pair[high], ratio, 'loss'),
      evidence: `${pair[0].name} ${formatRate(rates[0].rate)} · ${pair[1].name} ${formatRate(rates[1].rate)}`,
    })
  }
  return lines
}
