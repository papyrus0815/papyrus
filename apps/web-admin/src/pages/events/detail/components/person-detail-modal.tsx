import { useNavigate } from 'react-router-dom'

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
 * 편집 버튼(✎) 클릭 시: 모달을 닫고 `/persons/:id/edit`으로 이동.
 */
export function PersonDetailModal({ personId, onClose }: PersonDetailModalProps) {
  const navigate = useNavigate()
  return (
    <PersonInlineModal
      personId={personId}
      onClose={onClose}
      onEdit={(id) => {
        onClose()
        navigate(pathKeys.persons.detail(id))
      }}
    />
  )
}
