/**
 * 인물 등록 / 수정 페이지
 * - /persons/create          → 신규 등록
 * - /persons/:personId/edit  → 기존 인물 수정
 *
 * 페이지 외곽(FormCardWrapper + 뒤로가기 + sticky 푸터)은 여기서 담당.
 * `PersonRegisterView`는 폼 본체만 그리고, 라벨·submitting 상태를 콜백으로 흘려보낸다.
 */
import { useEffect, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiArrowLeft } from 'react-icons/fi'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { personKeys } from '@/entities/person/api'
import { confirm } from '@/shared/ui/confirm-dialog'
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
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitLabel, setSubmitLabel] = useState(personId ? '저장' : '등록')
  // 미저장 변경 추적 — SPA 라우트 이동(useBlocker)·새로고침/탭 닫기(beforeunload) 시 경고.
  // 모달 버전과 문구 통일.
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  // SPA 내 라우트 전환(브라우저 뒤로가기·사이드바 링크 포함) 차단 — data router의 useBlocker.
  // state 대신 ref로 판정해 confirm 직후 같은 틱의 navigate가 stale state로 막히지 않게 함.
  const blocker = useBlocker(() => isDirtyRef.current)
  // blocked 진입당 confirm 1회만 — 비동기 confirm 대기 중 리렌더로 다이얼로그가 중복되지 않게.
  const blockerPromptingRef = useRef(false)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      blockerPromptingRef.current = false
      return
    }
    if (blockerPromptingRef.current) return
    blockerPromptingRef.current = true
    confirm({
      title: '확인',
      message: '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?',
    }).then((confirmed) => {
      if (confirmed) blocker.proceed()
      else blocker.reset()
    })
  }, [blocker])

  const handleCancel = async () => {
    if (
      isDirtyRef.current &&
      !(await confirm({
        title: '확인',
        message: '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?',
      }))
    ) {
      return
    }
    // 이미 확인받았으므로 dirty 해제 — blocker의 중복 confirm 방지.
    isDirtyRef.current = false
    setIsDirty(false)
    navigate(-1)
  }

  // 캐시 무효화 — 모달 버전(PersonRegisterViewModal.invalidatePersonCaches)과 동일 세트.
  // staleTime 3분이라 무효화 없이 이동하면 상세·목록이 수정 전 데이터를 보여줌.
  const invalidatePersonCaches = (savedId: string) => {
    queryClient.invalidateQueries({ queryKey: personKeys.all })
    queryClient.invalidateQueries({ queryKey: ['person-detail'] })
    queryClient.invalidateQueries({ queryKey: ['person-family-tree'] })
    if (savedId) {
      queryClient.invalidateQueries({ queryKey: personKeys.detail(savedId) })
    }
  }

  /**
   * create 직후 — 캐시만 무효화하고 페이지는 유지.
   * 여기서 이동하면 폼 안의 "다른 인물 이어서 등록" 다이얼로그가 그려지기 전에 언마운트됨.
   * 이동은 다이얼로그 응답 후 handleSuccess(닫기 선택 → 상세 이동)로 실행.
   */
  const handleCreated = (savedId: string) => {
    invalidatePersonCaches(savedId)
  }

  const handleSuccess = (savedId: string) => {
    // 저장 성공 — dirty 해제 후 이동(이탈 경고 오발 방지).
    isDirtyRef.current = false
    setIsDirty(false)
    invalidatePersonCaches(savedId)
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
          onCreated={handleCreated}
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
