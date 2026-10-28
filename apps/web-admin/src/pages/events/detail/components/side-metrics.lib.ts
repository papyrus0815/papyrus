/**
 * 진영 수치 비교표 — 진영 대상 측정값을 '지표 행 × 진영 열'로 접는다(순수 로직, side-metrics.spec.ts).
 *
 * 예전엔 위에 '진영 비교' 막대 차트, 아래에 진영별 표가 **같은 값을 두 번** 보였다(보불전쟁 수치 영역 1,944px).
 * 한 표로 합치면 같은 지표의 두 진영 값이 한 줄에 나란히 서서 비교가 곧 읽기가 된다.
 */

export interface MetricObservationLike {
  id: string
  subjectType: string
  subjectId: string
  metric: { key: string; name: string }
  value: string | null
  low: string | null
  high: string | null
  atLeast: boolean
}

export interface SideMetricRow<Entry> {
  key: string
  name: string
  /** 진영 id → 그 진영의 이 지표 측정값(시점·단서가 다르면 여럿) */
  cells: Map<string, Entry[]>
}

export function buildSideMetricRows<Entry extends MetricObservationLike>(
  observations: ReadonlyArray<Entry>,
  sideIds: ReadonlyArray<string>,
): SideMetricRow<Entry>[] {
  const known = new Set(sideIds)
  const rows = new Map<string, SideMetricRow<Entry>>()
  for (const observation of observations) {
    if (observation.subjectType !== 'EVENT_SIDE' || !known.has(observation.subjectId)) continue
    const row = rows.get(observation.metric.key) ?? {
      key: observation.metric.key,
      name: observation.metric.name,
      cells: new Map<string, Entry[]>(),
    }
    row.cells.set(observation.subjectId, [...(row.cells.get(observation.subjectId) ?? []), observation])
    rows.set(observation.metric.key, row)
  }
  /* 행 순서 = 측정값이 처음 나온 순서(서버가 지표 정렬 순으로 준다) */
  return [...rows.values()]
}

/** 손실 쪽 지표 — 앞에 있을수록 우선(장부 '사상자' 줄과 같은 우선순위 — 정의가 다른 수를 섞지 않는다) */
export const LOSS_METRIC_PRIORITY = [
  'military.casualties_total',
  'military.deaths_total',
  'military.combat_deaths',
  'military.killed_in_action',
  'military.deaths_unspecified',
] as const

export const PERSONNEL_METRIC = 'military.personnel'

const centerOf = (observation: MetricObservationLike): number | null => {
  const toNumber = (raw: string | null) => (raw == null || raw === '' ? null : Number(raw))
  const value = toNumber(observation.value)
  const low = toNumber(observation.low)
  const high = toNumber(observation.high)
  const center = value ?? (low != null && high != null ? (low + high) / 2 : (low ?? high))
  return center != null && Number.isFinite(center) ? center : null
}

/**
 * 손실률 — (손실 ÷ 동원 병력). 둘 다 **하나씩만** 있을 때만 낸다: 시점·전선이 다른 값이 여럿이면
 * 어느 둘을 나눠야 하는지 모른다. '~이상' 값은 비율을 거짓으로 만들어 뺀다.
 */
export function lossRate(
  rows: ReadonlyArray<SideMetricRow<MetricObservationLike>>,
  sideId: string,
): { rate: number; lossName: string } | null {
  const single = (key: string) => {
    const list = rows.find((row) => row.key === key)?.cells.get(sideId) ?? []
    return list.length === 1 && !list[0].atLeast ? list[0] : null
  }
  const personnel = single(PERSONNEL_METRIC)
  const personnelValue = personnel ? centerOf(personnel) : null
  if (!personnelValue || personnelValue <= 0) return null
  for (const key of LOSS_METRIC_PRIORITY) {
    const loss = single(key)
    const lossValue = loss ? centerOf(loss) : null
    if (lossValue != null) return { rate: lossValue / personnelValue, lossName: loss!.metric.name }
  }
  return null
}

/** 손실률 표기 — 10% 미만은 소수 한 자리, 그 이상은 정수 */
export function formatRate(rate: number): string {
  const percent = rate * 100
  return `${percent < 10 ? percent.toFixed(1) : Math.round(percent)}%`
}
