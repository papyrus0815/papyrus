/**
 * 직위 보유 연표 — `GET /government-positions/office-holding-timeline`
 *
 * 재위·재임이 한 테이블(직위 보유 단일 모델)이 된 뒤의 단일 피드. 군주직 행(재위)과
 * 비군주직 국가원수·정부수반 행(대통령·총리 취임)을 한 번에 받고, 행의 `isMonarchical`로 가른다.
 * 소비처: 사건 목록의 즉위·취임 표지(`widgets/event-list-compact/lib/reign-markers.ts`), 수장 지도.
 * 행 모양은 재위·재임 같다 — 대수는 ordinal, regnalNumber는 '이름 속 서수'.
 */
import { nestiaApiService } from './api.service'

/** 사건 목록·수장 지도가 같은 캐시를 쓴다 */
export const officeHoldingTimelineKey = ['office-holding-timeline'] as const

export async function getOfficeHoldingTimeline(): Promise<unknown[]> {
  const connection = nestiaApiService.getConnection()
  const response = await fetch(
    `${connection.host}/government-positions/office-holding-timeline`,
    {
      headers: (connection.headers ?? {}) as HeadersInit,
      credentials: 'include',
    },
  )
  if (!response.ok) {
    throw new Error(`직위 보유 연표 조회 실패: HTTP ${response.status}`)
  }
  const data = await response.json()
  return Array.isArray(data) ? data : (data?.data ?? [])
}

/** 단일 피드 → 군주 재위 / 대통령·총리 재임 */
export function splitOfficeHoldingTimeline(rows: readonly unknown[] | undefined): {
  reigns: unknown[]
  heads: unknown[]
} {
  const reigns: unknown[] = []
  const heads: unknown[] = []
  for (const row of rows ?? []) {
    if ((row as { isMonarchical?: boolean }).isMonarchical) reigns.push(row)
    else heads.push(row)
  }
  return { reigns, heads }
}
