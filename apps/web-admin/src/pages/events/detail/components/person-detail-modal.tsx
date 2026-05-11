import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

interface PersonDetailModalProps {
  /** 열려 있는 인물 id. null이면 모달 닫힘. */
  personId: string | null
  onClose: () => void
}

/**
 * 사건 상세 페이지에서 참여 인물 클릭 시 띄우는 인물 정보 모달.
 *
 * 행정부 상세(country-detail/cabinets-section)의 mentionPerson 모달과 동일한 외형 —
 * 공용 위젯 `PersonInlineModal`을 사용해 정확히 같은 DOM/스타일을 보장한다.
 *
 * 편집 버튼(✎) 클릭 시: 모달을 닫고 `/persons/:id/`로 이동. 이때 history state에
 * `from: { kind: 'event', eventId, pathname }`을 실어, 인물 페이지가 이를 사용해
 * "사건으로 돌아가기" 진입점을 그릴 수 있도록 한다(인물 페이지 미지원이어도
 * 브라우저 back은 항상 가능 — state 손상 X).
 */
export function PersonDetailModal({ personId, onClose }: PersonDetailModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { eventId } = useParams<{ eventId: string }>()
  return (
    <PersonInlineModal
      personId={personId}
      onClose={onClose}
      onEdit={(id) => {
        onClose()
        navigate(pathKeys.persons.detail(id), {
          state: {
            from: {
              kind: 'event',
              eventId: eventId ?? null,
              pathname: location.pathname,
            },
          },
        })
      }}
    />
  )
}
