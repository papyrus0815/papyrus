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
  'human.casualties',
  'military.deaths_total',
  'military.combat_deaths',
  'military.killed_in_action',
  'military.deaths_unspecified',
  'human.deaths',
  'human.deaths_total',
  'human.executed',
  'civilian.killed',
  'human.wounded',
  'civilian.wounded',
] as const

export const PERSONNEL_METRIC = 'military.personnel'

/** 동원·참여 인원 쪽 지표 — 정규군 병력이 없으면 경찰·치안 병력(security.personnel) 또는 시위·봉기 참여 인원(society.participants)으로 가늠 */
export const SIZE_METRIC_PRIORITY = [
  'military.personnel',
  'security.personnel',
  'society.participants',
] as const

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
 * 비교에 쓸 수 있는 값 — 대표값이 있고, '~이상'이 아니고, 0보다 클 때만. 해설·그래프 배수·참여 요약판이 같이 쓴다.
 * 예전엔 셋이 제각각이었다: 그래프는 '~이상'(크림 전쟁 동맹국 총사망 ≥30만)으로 '1.5배'를 냈고,
 * 참여 요약판은 대표가 없으면 첫 값을 아무거나 집었다.
 */
export function comparableOf<Entry extends MetricObservationLike>(
  list: ReadonlyArray<Entry>,
): { observation: Entry; value: number } | null {
  const picked = representativeOf(list)
  if (!picked || picked.atLeast) return null
  const value = centerOf(picked)
  return value != null && value > 0 ? { observation: picked, value } : null
}

export type MemberCellsMap<Entry> = ReadonlyMap<
  string,
  ReadonlyMap<string, ReadonlyArray<MemberEntry<Entry>>>
>

/** 진영 규모·손실 한 값 — 진영 직접 값, 없으면 나라·부대 몫의 합 */
export interface SideSize<Entry> {
  metricKey: string
  metricName: string
  value: number
  /** 표기를 빌릴 측정값(나라·부대 합이면 첫 항목의 측정값) */
  observation: Entry
  /** 하위 항목(나라·부대) 몫을 더한 계산 값인가 */
  derived: boolean
  /** 계산 값의 출처 — 'country'(나라 합) | 'unit'(부대 합) | null */
  derivedFrom?: 'country' | 'unit' | null
}

function firstMetricFromPriority<Entry extends MetricObservationLike>(
  priorityKeys: ReadonlyArray<string>,
  rows: ReadonlyArray<SideMetricRow<Entry>>,
  memberCells: MemberCellsMap<Entry> | undefined,
  unitCells: MemberCellsMap<Entry> | undefined,
  sideId: string,
): SideSize<Entry> | null {
  for (const key of priorityKeys) {
    const direct = comparableOf(rows.find((row) => row.key === key)?.cells.get(sideId) ?? [])
    if (direct) {
      return {
        metricKey: key,
        metricName: direct.observation.metric.name,
        value: direct.value,
        observation: direct.observation,
        derived: false,
        derivedFrom: null,
      }
    }
    const members = memberCells?.get(key)?.get(sideId) ?? []
    const countryTotal = memberSum(members)
    if (countryTotal !== null && countryTotal > 0 && members[0]) {
      return {
        metricKey: key,
        metricName: members[0].observation.metric.name,
        value: countryTotal,
        observation: members[0].observation,
        derived: true,
        derivedFrom: 'country',
      }
    }
    const units = unitCells?.get(key)?.get(sideId) ?? []
    const unitTotal = memberSum(units)
    if (unitTotal !== null && unitTotal > 0 && units[0]) {
      return {
        metricKey: key,
        metricName: units[0].observation.metric.name,
        value: unitTotal,
        observation: units[0].observation,
        derived: true,
        derivedFrom: 'unit',
      }
    }
  }
  return null
}

/**
 * 진영의 규모 — SIZE_METRIC_PRIORITY 순(병력 → 참여 인원)으로 첫 비교 가능 값.
 * 진영 값이 없으면 나라 몫의 합, 그다음 부대 몫의 합(항목마다 대표값이 있을 때만, memberSum).
 */
export function sideSizeOf<Entry extends MetricObservationLike>(
  rows: ReadonlyArray<SideMetricRow<Entry>>,
  memberCells: MemberCellsMap<Entry>,
  sideId: string,
  unitCells?: MemberCellsMap<Entry>,
): SideSize<Entry> | null {
  return firstMetricFromPriority(SIZE_METRIC_PRIORITY, rows, memberCells, unitCells, sideId)
}

/**
 * 진영의 대표 손실 — LOSS_METRIC_PRIORITY 순(손실 합계 → 총사망 → 전사 …)으로 첫 비교 가능 값.
 * 진영 값이 없으면 나라 몫의 합, 그다음 부대 몫의 합.
 */
export function sideLossOf<Entry extends MetricObservationLike>(
  rows: ReadonlyArray<SideMetricRow<Entry>>,
  memberCells: MemberCellsMap<Entry>,
  sideId: string,
  unitCells?: MemberCellsMap<Entry>,
): SideSize<Entry> | null {
  return firstMetricFromPriority(LOSS_METRIC_PRIORITY, rows, memberCells, unitCells, sideId)
}

/**
 * 비교 행 순서 — 규모(병력·참여 인원) → 손실 합계 → 나머지(서버 지표 순 유지).
 * 지표 정렬 순 그대로면 '동원 병력'이 맨 아래였다(보불·보오·플라시·아편 전부). 읽는 질문의 순서는
 * '얼마나 모였나 → 얼마나 잃었나 → 무엇으로 잃었나'다.
 */
export function orderSideMetricRows<Row extends { key: string }>(rows: ReadonlyArray<Row>): Row[] {
  const rank = (key: string) =>
    (SIZE_METRIC_PRIORITY as ReadonlyArray<string>).includes(key)
      ? 0
      : key === 'military.casualties_total' || key === 'human.casualties'
        ? 1
        : 2
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => rank(left.row.key) - rank(right.row.key) || left.index - right.index)
    .map(({ row }) => row)
}

/**
 * 손실 구성 요소 — 사망·부상·실종·포로/체포(전통적 '손실 합계'의 네 몫).
 * 질병 사망까지 든 '군 총사망'(military.deaths_total)과 '총사망(군+민)'(human.deaths_total)은 손실 합계의 부분 몫과 겹칠 수 있어 섞지 않는다.
 */
export const LOSS_COMPONENTS = [
  {
    key: 'deaths',
    label: '사망',
    metricKeys: [
      'military.killed_in_action',
      'military.combat_deaths',
      'military.deaths_unspecified',
      'human.deaths',
      'civilian.killed',
      'human.executed',
    ],
  },
  { key: 'wounded', label: '부상', metricKeys: ['military.wounded', 'human.wounded', 'civilian.wounded'] },
  { key: 'missing', label: '실종', metricKeys: ['military.missing', 'human.missing'] },
  { key: 'captured', label: '포로', metricKeys: ['military.captured', 'society.arrested'] },
] as const

export interface LossPart<Entry> {
  key: (typeof LOSS_COMPONENTS)[number]['key']
  label: string
  value: number
  observation: Entry
}

export interface LossComposition<Entry> {
  sideId: string
  parts: LossPart<Entry>[]
  /** 몫의 합 */
  sum: number
  /** 기록된 '군 손실 합계'(비교 가능할 때) */
  total: { value: number; observation: Entry } | null
  /** 몫의 합과 기록된 합계가 5% 넘게 어긋나면 그 차(합계 − 몫의 합) */
  mismatch: number | null
}

export function lossCompositionOf<Entry extends MetricObservationLike>(
  rows: ReadonlyArray<SideMetricRow<Entry>>,
  sideId: string,
): LossComposition<Entry> | null {
  const parts: LossPart<Entry>[] = []
  for (const component of LOSS_COMPONENTS) {
    for (const metricKey of component.metricKeys) {
      const picked = comparableOf(rows.find((row) => row.key === metricKey)?.cells.get(sideId) ?? [])
      if (picked) {
        parts.push({ key: component.key, label: component.label, value: picked.value, observation: picked.observation })
        break
      }
    }
  }
  if (parts.length === 0) return null
  const sum = parts.reduce((total, part) => total + part.value, 0)
  const total =
    comparableOf(rows.find((row) => row.key === 'military.casualties_total')?.cells.get(sideId) ?? []) ??
    comparableOf(rows.find((row) => row.key === 'human.casualties')?.cells.get(sideId) ?? [])
  return {
    sideId,
    parts,
    sum,
    total,
    mismatch: parts.length >= 2 ? sumMismatch(total?.value ?? null, sum) : null,
  }
}

/**
 * 진영들의 손실 구성 — 둘 이상 진영에 몫이 있고, 그중 하나라도 몫이 둘 이상일 때만(몫 하나면 쌓을 게 없다).
 */
export function lossCompositions<Entry extends MetricObservationLike>(
  rows: ReadonlyArray<SideMetricRow<Entry>>,
  sideIds: ReadonlyArray<string>,
): LossComposition<Entry>[] {
  const list = sideIds
    .map((sideId) => lossCompositionOf(rows, sideId))
    .filter((composition): composition is LossComposition<Entry> => composition !== null)
  return list.length >= 2 && list.some((composition) => composition.parts.length >= 2) ? list : []
}

/**
 * 손실률 — (손실 ÷ 동원 병력·참여 인원). 둘 다 **대표값**(또는 하위 나라·부대 합)이 있을 때만 낸다:
 * 시점·전선이 다른 값이 여럿이면 어느 둘을 나눠야 하는지 모른다(채택 추정치가 정해졌으면 그것으로).
 * '~이상' 값은 비율을 거짓으로 만들어 뺀다.
 */
export function lossRate(
  rows: ReadonlyArray<SideMetricRow<MetricObservationLike>>,
  sideId: string,
  memberCells?: MemberCellsMap<MetricObservationLike>,
  unitCells?: MemberCellsMap<MetricObservationLike>,
): {
  rate: number
  lossName: string
  lossKey: string
  sizeKey: string
  sizeName: string
  derived: boolean
} | null {
  const resolveMetric = (key: string, allowZero: boolean) => {
    const picked = representativeOf(rows.find((row) => row.key === key)?.cells.get(sideId) ?? [])
    if (picked && !picked.atLeast) {
      const numeric = centerOf(picked)
      if (numeric != null && (allowZero ? numeric >= 0 : numeric > 0)) {
        return { value: numeric, name: picked.metric.name, key, derived: false }
      }
    }
    const members = memberCells?.get(key)?.get(sideId) ?? []
    const countrySum = memberSum(members)
    if (countrySum !== null && (allowZero ? countrySum >= 0 : countrySum > 0) && members[0]) {
      return { value: countrySum, name: members[0].observation.metric.name, key, derived: true }
    }
    const units = unitCells?.get(key)?.get(sideId) ?? []
    const unitSumVal = memberSum(units)
    if (unitSumVal !== null && (allowZero ? unitSumVal >= 0 : unitSumVal > 0) && units[0]) {
      return { value: unitSumVal, name: units[0].observation.metric.name, key, derived: true }
    }
    return null
  }

  const personnel =
    resolveMetric(PERSONNEL_METRIC, false) ??
    resolveMetric('security.personnel', false) ??
    resolveMetric('society.participants', false)
  if (!personnel) return null
  for (const key of LOSS_METRIC_PRIORITY) {
    const loss = resolveMetric(key, true)
    if (loss != null) {
      return {
        rate: loss.value / personnel.value,
        lossName: loss.name,
        lossKey: loss.key,
        sizeKey: personnel.key,
        sizeName: personnel.name,
        derived: personnel.derived || loss.derived,
      }
    }
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

/**
 * 진영 소속 투입 부대(EVENT_SIDE_UNIT)들의 측정값 — 지표 → 진영 → [부대·값].
 */
export function buildUnitCells<Entry extends MetricObservationLike>(
  observations: ReadonlyArray<Entry>,
  unitSide: ReadonlyMap<string, { sideId: string; name: string }>,
): Map<string, Map<string, MemberEntry<Entry>[]>> {
  const byMetric = new Map<string, Map<string, MemberEntry<Entry>[]>>()
  for (const observation of observations) {
    if (observation.subjectType !== 'EVENT_SIDE_UNIT') continue
    const unitInfo = unitSide.get(observation.subjectId)
    if (!unitInfo) continue
    const bySide = byMetric.get(observation.metric.key) ?? new Map<string, MemberEntry<Entry>[]>()
    bySide.set(unitInfo.sideId, [
      ...(bySide.get(unitInfo.sideId) ?? []),
      { name: unitInfo.name, observation },
    ])
    byMetric.set(observation.metric.key, bySide)
  }
  return byMetric
}
