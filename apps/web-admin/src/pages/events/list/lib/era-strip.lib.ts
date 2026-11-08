/**
 * 시대 띠의 기하 — 순수.
 *
 * 축은 **세기마다 같은 폭**이다. 사건은 1500년 이후에 몰려 있어(실측 608건 중 대부분) 연도 그대로 그으면
 * 고대·중세가 몇 픽셀로 눌린다. 그래서 사건이 있는 세기는 한 칸씩, 사건이 없는 세기 구간은 좁은 틈(⋯)으로
 * 접는다 — 세기 안에서는 연도에 비례한다. 띠 위의 거리는 '세기 수'이지 '햇수'가 아니라는 것을 틈 표지가 말한다.
 *
 * 연도는 부호 연도(BC 44 = -44, 0년 없음). 네이티브 Date를 쓰지 않는다(event-structured-bc-date 규약).
 */

/** 세기 번호 — AD 1~100 = 1, 1901~2000 = 20, BC 100~1 = -1, BC 200~101 = -2 */
export function centuryOf(signedYear: number): number {
  return signedYear > 0 ? Math.ceil(signedYear / 100) : -Math.ceil(-signedYear / 100)
}

/** 세기의 첫해·끝해(부호 연도) */
function centuryBounds(century: number): [number, number] {
  return century > 0 ? [(century - 1) * 100 + 1, century * 100] : [century * 100, century * 100 + 99]
}

/** 다음 세기 — BC 1세기(-1) 다음은 AD 1세기(1) */
const nextCentury = (century: number) => (century === -1 ? 1 : century + 1)

export interface EraSlot {
  kind: 'century' | 'gap'
  /** 세기 칸이면 그 세기, 틈이면 틈 앞 세기 */
  century: number
  /** 이 칸의 왼쪽 끝·폭(%) */
  left: number
  width: number
  /** 틈이 접은 세기 수 */
  skipped?: number
}

export interface EraAxis {
  slots: EraSlot[]
  /** 부호 연도(소수 가능) → % — 없는 세기는 가까운 칸 끝으로 붙인다 */
  toPct: (signedYear: number) => number
}

/** 틈 하나의 폭(세기 칸 대비) */
const GAP_UNITS = 0.35

export function buildEraAxis(years: ReadonlyArray<number>): EraAxis | null {
  const centuries = [...new Set(years.filter(Number.isFinite).map(centuryOf))].sort((left, right) => left - right)
  if (centuries.length === 0) return null
  type Unit = { kind: 'century' | 'gap'; century: number; units: number; skipped?: number }
  const units: Unit[] = []
  centuries.forEach((century, index) => {
    if (index > 0) {
      const previous = centuries[index - 1]
      let skipped = 0
      for (let cursor = nextCentury(previous); cursor !== century; cursor = nextCentury(cursor)) skipped += 1
      if (skipped > 0) units.push({ kind: 'gap', century: previous, units: GAP_UNITS, skipped })
    }
    units.push({ kind: 'century', century, units: 1 })
  })
  const total = units.reduce((sum, unit) => sum + unit.units, 0)
  let cursor = 0
  const slots: EraSlot[] = units.map((unit) => {
    const slot: EraSlot = {
      kind: unit.kind,
      century: unit.century,
      left: (cursor / total) * 100,
      width: (unit.units / total) * 100,
      skipped: unit.skipped,
    }
    cursor += unit.units
    return slot
  })
  const centurySlots = slots.filter((slot) => slot.kind === 'century')
  const toPct = (signedYear: number) => {
    const century = centuryOf(signedYear)
    const slot = centurySlots.find((candidate) => candidate.century === century)
    if (slot) {
      const [first] = centuryBounds(century)
      const fraction = Math.min(1, Math.max(0, (signedYear - first) / 100))
      return slot.left + fraction * slot.width
    }
    /* 사건 없는 세기(긴 묶음이 지나가는 자리) — 그 앞의 마지막 칸 끝, 없으면 첫 칸 앞 */
    const before = [...centurySlots].reverse().find((candidate) => candidate.century < century)
    return before ? before.left + before.width : 0
  }
  return { slots, toPct }
}

/** 세기 라벨 — '21', 'BC 5' */
export function centuryLabel(century: number): string {
  return century > 0 ? String(century) : `BC ${-century}`
}

/** 10년 칸 — 세기 칸 안의 열 칸. 부호 연도의 칸 번호(0~9) */
export function decadeIndex(signedYear: number): number {
  const [first] = centuryBounds(centuryOf(signedYear))
  return Math.min(9, Math.max(0, Math.floor((signedYear - first) / 10)))
}

/** 10년 칸의 대표 연도 — 눌렀을 때 목록이 갈 해(칸 가운데) */
export function decadeMidYear(century: number, index: number): number {
  const [first] = centuryBounds(century)
  const mid = first + index * 10 + 5
  return mid === 0 ? 1 : mid
}

/**
 * 긴 막대(묶음 사건)를 줄에 나눠 쌓는다 — 겹치면 다음 줄, 줄이 다 차면 가장 일찍 비는 줄.
 * 좌우 % 기준, 최소 간격 gap(%)
 */
export function packLanes<T extends { left: number; right: number }>(
  items: ReadonlyArray<T>,
  maxLanes: number,
  gap = 0.4,
): Array<T & { lane: number }> {
  const ends: number[] = []
  return [...items]
    .sort((first, second) => first.left - second.left)
    .map((item) => {
      let lane = ends.findIndex((end) => end + gap <= item.left)
      if (lane < 0) lane = ends.length < maxLanes ? ends.length : ends.indexOf(Math.min(...ends))
      ends[lane] = Math.max(ends[lane] ?? -Infinity, item.right)
      return { ...item, lane }
    })
}
