/**
 * 인물 등록 / 수정 페이지
 * - /persons/create          → 신규 등록
 * - /persons/:personId/edit  → 기존 인물 수정
 */
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { PersonRegisterView } from '@/shared/ui/person-register-modal/person-register-view'
import { pathKeys } from '@/shared/router'

export default function PersonEditPage() {
  const { personId } = useParams<{ personId: string }>()
  const navigate = useNavigate()

  const handleCancel = () => navigate(-1)

  const handleSuccess = (savedId: string) => {
    navigate(pathKeys.persons.detail(savedId), { replace: true })
  }

  return (
    <Root>
      <PersonRegisterView
        editPersonId={personId ?? null}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
        embedInCard
      />
    </Root>
  )
}

const Root = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
`
