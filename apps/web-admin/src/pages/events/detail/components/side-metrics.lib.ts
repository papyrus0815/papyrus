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
  /** 경합 추정치 중 지위 — PREFERRED(채택)·ALTERNATIVE·DISPUTED. 없으면 단일 값 */
  estimateRole?: string | null
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

/**
 * 한 칸의 대표값 — 값이 하나면 그것, 여럿이면 **채택(PREFERRED)이 정확히 하나**일 때 그것.
 * 그 밖(채택 없음·채택 둘)은 null: 시점·전선이 다른 값인지 경합 추정인지 모르니 고르지 않는다.
 */
export function representativeOf<Entry extends MetricObservationLike>(list: ReadonlyArray<Entry>): Entry | null {
  if (list.length === 1) return list[0]
  const preferred = list.filter((entry) => entry.estimateRole === 'PREFERRED')
  return preferred.length === 1 ? preferred[0] : null
}

/** 대표값 말고 나머지 — 대안·논쟁 추정치. 대표가 없으면 빈 배열(전부 나란히 보인다) */
export function alternativesOf<Entry extends MetricObservationLike>(list: ReadonlyArray<Entry>): Entry[] {
  const representative = list.length > 1 ? representativeOf(list) : null
  return representative ? list.filter((entry) => entry !== representative) : []
}

export const centerOf = (observation: MetricObservationLike): number | null => {
  const toNumber = (raw: string | null) => (raw == null || raw === '' ? null : Number(raw))
  const value = toNumber(observation.value)
  const low = toNumber(observation.low)
  const high = toNumber(observation.high)
  const center = value ?? (low != null && high != null ? (low + high) / 2 : (low ?? high))
  return center != null && Number.isFinite(center) ? center : null
}

/**
 * 손실률 — (손실 ÷ 동원 병력). 둘 다 **대표값**이 있을 때만 낸다: 시점·전선이 다른 값이 여럿이면
 * 어느 둘을 나눠야 하는지 모른다(채택 추정치가 정해졌으면 그것으로). '~이상' 값은 비율을 거짓으로 만들어 뺀다.
 */
export function lossRate(
  rows: ReadonlyArray<SideMetricRow<MetricObservationLike>>,
  sideId: string,
): { rate: number; lossName: string } | null {
  const single = (key: string) => {
    const picked = representativeOf(rows.find((row) => row.key === key)?.cells.get(sideId) ?? [])
    return picked && !picked.atLeast ? picked : null
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

/** 진영에 든 참여국 몫 한 줄 — 비교표 진영 칸 아래 '그 진영 나라들'로 */
export interface MemberEntry<Entry> {
  name: string
  observation: Entry
}

/**
 * 진영 소속 나라들의 측정값 — 지표 → 진영 → [나라·값]. 진영에 안 든 나라는 뺀다(목록에 남는다).
 * 예전엔 나라 몫이 비교표 아래 따로 8묶음(묶음마다 한 줄)으로 흩어져, 진영 값과 견줄 수 없었다.
 */
export function buildMemberCells<Entry extends MetricObservationLike>(
  observations: ReadonlyArray<Entry>,
  participantSide: ReadonlyMap<string, { sideId: string; name: string }>,
): Map<string, Map<string, MemberEntry<Entry>[]>> {
  const byMetric = new Map<string, Map<string, MemberEntry<Entry>[]>>()
  for (const observation of observations) {
    if (observation.subjectType !== 'EVENT_PARTICIPANT') continue
    const member = participantSide.get(observation.subjectId)
    if (!member) continue
    const bySide = byMetric.get(observation.metric.key) ?? new Map<string, MemberEntry<Entry>[]>()
    bySide.set(member.sideId, [...(bySide.get(member.sideId) ?? []), { name: member.name, observation }])
    byMetric.set(observation.metric.key, bySide)
  }
  return byMetric
}

/**
 * 나라 몫의 합 — 나라마다 대표값이 있고 '~이상'이 없을 때만(그래야 합이 뜻을 가진다). 아니면 null.
 */
export function memberSum(entries: ReadonlyArray<MemberEntry<MetricObservationLike>>): number | null {
  const perCountry = new Map<string, MetricObservationLike[]>()
  for (const entry of entries) perCountry.set(entry.name, [...(perCountry.get(entry.name) ?? []), entry.observation])
  let sum = 0
  for (const list of perCountry.values()) {
    const picked = representativeOf(list)
    if (!picked || picked.atLeast) return null
    const value = centerOf(picked)
    if (value === null) return null
    sum += value
  }
  return perCountry.size > 0 ? sum : null
}

/** 진영 값과 나라 합이 어긋나는가 — 5% 넘게 차이 나면 어긋남(추정치 반올림 안쪽은 같다고 본다) */
export function sumMismatch(sideValue: number | null, sum: number | null): number | null {
  if (sideValue === null || sum === null || sideValue <= 0) return null
  const gap = sideValue - sum
  return Math.abs(gap) / sideValue > 0.05 ? gap : null
}
