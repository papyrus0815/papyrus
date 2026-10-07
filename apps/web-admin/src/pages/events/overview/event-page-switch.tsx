/**
 * `/events/:eventId` 진입점 — 최상위 사건이면 조망, 아니면 기존 상세(문서).
 *
 * 최상위 = 살아 있는 상위가 없고(상위가 삭제된 사건도 실질 최상위) 하위가 1건 이상.
 * '평범한 사건으로 보기'(anchorOverride=PLAIN)로 지정한 사건은 하위가 있어도 문서로 연다.
 * `?view=doc`이면 최상위 사건도 문서로 — 서술·편집은 문서 지면이 계속 맡는다.
 *
 * 판정은 상세와 **같은 캐시**(eventDetailQueryOptions)를 읽는다. 아직 없으면 상세 페이지를
 * 그대로 그린다 — 상세가 Suspense로 같은 요청을 기다리므로 로딩 화면이 하나로 유지된다.
 */
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'

import EventDetailPage from '@/pages/events/detail/event-detail.page'
import {
  type EventDetail,
  eventDetailQueryOptions,
} from '@/pages/events/detail/use-event-detail'

import { EventOverviewPage } from './event-overview.page'
import * as S from './overview.styles'

export function isOverviewEvent(event: EventDetail | undefined): boolean {
  if (!event) return false
  const isRoot = !event.parentEventId || !event.parentEvent
  return isRoot && (event.childEvents?.length ?? 0) > 0 && event.anchorOverride !== 'PLAIN'
}

export default function EventPageSwitch() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data } = useQuery({ ...eventDetailQueryOptions(eventId), enabled: Boolean(eventId) })

  const overviewable = isOverviewEvent(data)
  const wantsDocument = searchParams.get('view') === 'doc'

  const setView = (view: 'doc' | null) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (view) next.set('view', view)
        else next.delete('view')
        return next
      },
      { replace: false },
    )

  if (overviewable && !wantsDocument) {
    // key — 다른 최상위 사건으로 옮기면 거르기·강조 상태를 새로 시작
    return <EventOverviewPage key={eventId} eventId={eventId} onShowDocument={() => setView('doc')} />
  }

  return (
    <>
      {overviewable && (
        <S.DocumentViewBar>
          <span>하위 {data?.childEvents?.length ?? 0}건을 거느린 최상위 사건 — 문서 보기</span>
          <S.ActionButton type="button" onClick={() => setView(null)}>
            조망으로 보기
          </S.ActionButton>
        </S.DocumentViewBar>
      )}
      <EventDetailPage />
    </>
  )
}
