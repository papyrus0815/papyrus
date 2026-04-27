/**
 * 사건 등록/수정 풀 페이지 진입점.
 * /events/create 와 /events/:eventId/edit 가 같은 컴포넌트를 공유한다.
 */
import { useParams } from 'react-router-dom'
import { EventEditor } from '@/widgets/event-editor'

export default function EventEditorPage() {
  const params = useParams<{ eventId?: string }>()
  const eventId = params.eventId
  const mode = eventId ? 'edit' : 'create'

  // Phase 2 에서 edit 모드일 때 getEventById → form 초기값 매핑.
  return <EventEditor mode={mode} eventId={eventId} />
}
