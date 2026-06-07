/**
 * 인물 등록 / 수정 페이지
 * - /persons/create          → 신규 등록
 * - /persons/:personId/edit  → 기존 인물 수정
 *
 * 페이지 외곽(FormCardWrapper + 뒤로가기 + sticky 푸터)은 여기서 담당.
 * `PersonRegisterView`는 폼 본체만 그리고, 라벨·submitting 상태를 콜백으로 흘려보낸다.
 */
import { useEffect, useRef, useState } from 'react'

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
  // 미저장 변경 추적 — 이탈(뒤로가기·새로고침) 시 경고. 모달 버전과 문구 통일.
  // 수정 모드는 draft가 꺼져 있어(복구 불가) 경고가 특히 중요.
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  const handleCancel = () => {
    if (
      isDirtyRef.current &&
      !window.confirm('저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?')
    ) {
      return
    }
    navigate(-1)
  }

  const handleSuccess = (savedId: string) => {
    // 저장 성공 — dirty 해제 후 이동(이탈 경고 오발 방지).
    isDirtyRef.current = false
    setIsDirty(false)
    navigate(pathKeys.persons.detail(savedId), { replace: true })
  }

  // 새로고침/탭 닫기 경고 — 앱 공통 패턴(event-create.page와 동일).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

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
          onDirtyChange={setIsDirty}
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
