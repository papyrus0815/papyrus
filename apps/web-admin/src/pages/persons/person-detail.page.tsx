import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

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
        onClose={() => navigate(-1)}
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
