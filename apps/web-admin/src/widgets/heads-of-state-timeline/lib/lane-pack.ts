/**
 * 막대 레인 패킹 — 시간 구간이 겹치는 막대를 위·아래로 쌓아 가려짐을 방지.
 * "active" 인터벌 트리·greedy 1D 패킹.
 *
 * 입력 막대를 시작 시간순으로 정렬하고, 각 막대를 첫 번째로 비어있는 레인에 배정.
 * 결과는 lane index(0,1,2,...)와 사용된 최대 레인 수.
 */

interface Interval {
  /** 시작(소수점 연도) */
  start: number
  /** 끝(소수점 연도) — null이면 +Infinity로 취급 */
  end: number
}

export interface LaneAssignment<T> {
  item: T
  lane: number
}

export interface LaneResult<T> {
  laneCount: number
  assignments: LaneAssignment<T>[]
}

export function packIntoLanes<T>(items: T[], get: (it: T) => Interval): LaneResult<T> {
  const indexed = items.map((it, i) => ({ it, iv: get(it), order: i }))
  indexed.sort((a, b) => {
    if (a.iv.start !== b.iv.start) return a.iv.start - b.iv.start
    // 동률이면 끝나는 시간이 짧은 것을 먼저(짧은 막대가 위쪽으로)
    return a.iv.end - b.iv.end
  })

  /** 각 레인의 마지막 사용된 end */
  const laneEnds: number[] = []
  const assignments: LaneAssignment<T>[] = new Array(items.length)

  for (const { it, iv, order } of indexed) {
    let placed = -1
    for (let i = 0; i < laneEnds.length; i++) {
      const laneEnd = laneEnds[i]
      if (laneEnd != null && laneEnd <= iv.start) {
        placed = i
        break
      }
    }
    if (placed === -1) {
      placed = laneEnds.length
      laneEnds.push(iv.end)
    } else {
      laneEnds[placed] = iv.end
    }
    assignments[order] = { item: it, lane: placed }
  }

  return { laneCount: laneEnds.length, assignments }
}
