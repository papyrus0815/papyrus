import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'

export default function PersonDetailPage() {
  const { personId } = useParams<{ personId: string }>()
  const navigate = useNavigate()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)

  if (!personId) return null

  return (
    <Root>
      <PersonDetailPanel
        personId={personId}
        syncDocumentTitle
        onClose={() => {
          // 새 탭 딥링크(백 엔트리 없음)에서 navigate(-1)은 no-op —
          // 삭제된 인물 404 에러 화면의 '닫기'가 무동작이 되지 않게 목록 폴백.
          if (window.history.length > 1) navigate(-1)
          else navigate(pathKeys.persons.root(), { replace: true })
        }}
        onEdit={(id) => {
          setEditingPersonId(id)
          setEditModalOpen(true)
        }}
        closeLabel="뒤로"
      />
      <PersonRegisterViewModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editPersonId={editingPersonId}
        onSuccess={() => setEditModalOpen(false)}
      />
    </Root>
  )
}

const Root = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background.primary};
`
