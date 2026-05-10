/**
 * 인물 등록 / 수정 페이지
 * - /persons/create          → 신규 등록
 * - /persons/:personId/edit  → 기존 인물 수정
 *
 * 페이지 외곽(FormCardWrapper + 뒤로가기 + sticky 푸터)은 여기서 담당.
 * `PersonRegisterView`는 폼 본체만 그리고, 라벨·submitting 상태를 콜백으로 흘려보낸다.
 */
import { useState } from 'react'

import { FiArrowLeft } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { PersonRegisterView } from '@/shared/ui/person-register-modal/person-register-view'
import { StickyFooter } from '@/shared/ui/person-register-modal/person-register-view.styles'
import { pathKeys } from '@/shared/router'
import {
  BackButton,
  FormCardWrapper,
  FormHeader,
  SubmitButton,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

export default function PersonEditPage() {
  const { personId } = useParams<{ personId: string }>()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitLabel, setSubmitLabel] = useState(personId ? '저장' : '등록')

  const handleCancel = () => navigate(-1)

  const handleSuccess = (savedId: string) => {
    navigate(pathKeys.persons.detail(savedId), { replace: true })
  }

  return (
    <Root>
      <FormCardWrapper>
        <FormHeader>
          <BackButton type="button" onClick={handleCancel}>
            <FiArrowLeft size={18} />
            목록 보기
          </BackButton>
        </FormHeader>
        <PersonRegisterView
          editPersonId={personId ?? null}
          onCancel={handleCancel}
          onSuccess={handleSuccess}
          onSubmittingChange={setIsSubmitting}
          onSubmitLabelChange={setSubmitLabel}
        />
        <StickyFooter>
          <SubmitButton
            type="submit"
            form="person-register-form"
            disabled={isSubmitting}
          >
            {submitLabel}
          </SubmitButton>
        </StickyFooter>
      </FormCardWrapper>
    </Root>
  )
}

const Root = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
`
