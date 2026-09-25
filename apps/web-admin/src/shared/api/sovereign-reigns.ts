/**
 * 군주 재위 연표 — `GET /government-positions/sovereign-reigns`
 *
 * 사건 목록의 즉위 구분선용 경량 목록. 응답 형태는
 * `widgets/event-list-compact/lib/reign-markers.ts`의 `SovereignReignTimelineItem`이 소비한다.
 */
import { nestiaApiService } from './api.service'

export async function getSovereignReignTimeline(): Promise<unknown[]> {
  const connection = nestiaApiService.getConnection()
  const response = await fetch(
    `${connection.host}/government-positions/sovereign-reigns`,
    {
      headers: (connection.headers ?? {}) as HeadersInit,
      credentials: 'include',
    },
  )
  if (!response.ok) {
    throw new Error(`군주 재위 연표 조회 실패: HTTP ${response.status}`)
  }
  const data = await response.json()
  return Array.isArray(data) ? data : (data?.data ?? [])
}
