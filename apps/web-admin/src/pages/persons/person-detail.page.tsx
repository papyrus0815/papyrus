import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'
import { pathKeys } from '@/shared/router'

export default function PersonDetailPage() {
  const { personId } = useParams<{ personId: string }>()
  const navigate = useNavigate()

  if (!personId) return null

  return (
    <Root>
      <PersonDetailPanel
        personId={personId}
        onClose={() => navigate(-1)}
        onEdit={(id) => navigate(pathKeys.persons.edit(id))}
        closeLabel="뒤로"
      />
    </Root>
  )
}

const Root = styled.div`
  min-height: 100vh;
  background: #0f0f0f;
`
