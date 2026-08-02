/**
 * Event Create Page — 사건 등록 폼의 **페이지 셸**. 딥링크 폴백 전용.
 *
 * ⚠️ 앱 안에서 이 경로로 오는 진입점은 **0개**다. 목록·대시보드의 '새 사건'은
 * `EventRegisterModal`을 연다(화면을 떠나지 않아 목록의 접힘·필터·선택이 보존된다).
 * 이 페이지는 외부 링크·북마크·새 탭으로 `/events/create`에 직접 들어온 경우만 받는다.
 *
 * 폼 본체는 `widgets/event-form/ui/event-basic-form`에 있고, 이 파일은 외곽만 담당한다:
 * 페이지 크롬(제목·이전/저장 버튼), 로딩 오버레이, 이탈 가드(useBlocker), 저장 후 이동.
 *
 * **수정은 다루지 않는다** — `/events/:id/edit`는 상세 인라인 편집으로 흡수됐다
 * (`event-route.ts`의 editRedirect 참고). 폼 본체는 여전히 `eventId`를 받지만,
 * 그 경로를 쓰는 건 모달 셸뿐이다.
 *
 * 복귀 목적지: 진입점이 `state.from`을 주면 그곳으로, 없으면 `/events`.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { FiArrowLeft, FiSave } from 'react-icons/fi'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys, type ReturnToState } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  EventBasicForm,
  type EventBasicFormHandle,
  type EventBasicFormState,
} from '@/widgets/event-form/ui/event-basic-form'

import * as S from './event-create.styles'

const LEAVE_MESSAGE = '저장하지 않은 변경 사항이 있습니다. 페이지를 떠나시겠습니까?'

export const EventCreatePageRefactored: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const playClickSound = useClickSound()

  const formRef = useRef<EventBasicFormHandle | null>(null)
  const [formState, setFormState] = useState<EventBasicFormState>({
    isEditMode: false,
    isLoading: false,
    isSubmitting: false,
    isValid: false,
  })
  const [isDirty, setIsDirty] = useState(false)
  // state 대신 ref로 판정 — confirm 직후 같은 틱의 navigate가 stale state로 막히지 않게.
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  const { isLoading, isSubmitting, isValid, firstError } = formState

  const backTo =
    (location.state as ReturnToState | null)?.from ?? pathKeys.events.root()

  // SPA 내 라우트 전환(브라우저 뒤로가기·사이드바 링크 포함) 차단 — data router의 useBlocker.
  // 예전엔 beforeunload(새로고침·탭 닫기)와 '이전' 버튼만 가드해, 뒤로가기 한 번에 입력이
  // 조용히 사라졌다.
  const blocker = useBlocker(() => isDirtyRef.current)
  // blocked 진입당 confirm 1회만 — 비동기 confirm 대기 중 리렌더로 다이얼로그 중복 방지.
  const blockerPromptingRef = useRef(false)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      blockerPromptingRef.current = false
      return
    }
    if (blockerPromptingRef.current) return
    blockerPromptingRef.current = true
    confirm({ title: '확인', message: LEAVE_MESSAGE }).then((confirmed) => {
      if (confirmed) blocker.proceed()
      else blocker.reset()
    })
  }, [blocker])

  const handleBack = async () => {
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '확인', message: LEAVE_MESSAGE }))
    ) {
      return
    }
    // 이미 확인받았으므로 dirty 해제 — blocker의 중복 confirm 방지.
    isDirtyRef.current = false
    setIsDirty(false)
    navigate(backTo)
  }

  const handleSaved = useCallback(
    (savedId: string) => {
      // 본체가 캐시 시딩·상세 프리페치를 끝낸 뒤 호출한다 → 무로딩 진입.
      isDirtyRef.current = false
      setIsDirty(false)
      navigate(pathKeys.events.detail(savedId), {
        viewTransition: true,
        replace: true,
      })
    },
    [navigate],
  )

  const busy = isLoading || isSubmitting

  return (
    <S.PageWrapper>
      <S.ContentWrapper>
        <S.FormArea aria-busy={busy}>
          {busy && (
            <S.FormOverlay role="status" aria-live="polite">
              <S.OverlaySpinner />
              <span>사건을 등록하는 중...</span>
            </S.FormOverlay>
          )}
          <S.FormAreaHeader>
            <S.FormAreaTitle>사건 등록</S.FormAreaTitle>
            <S.FormAreaActions>
              <S.ActionButton
                type="button"
                $variant="secondary"
                onClick={() => {
                  playClickSound()
                  handleBack()
                }}
              >
                <FiArrowLeft size={16} />
                이전
              </S.ActionButton>
              <S.ActionButton
                type="button"
                $variant="primary"
                onClick={() => {
                  playClickSound()
                  formRef.current?.submit()
                }}
                disabled={!isValid || busy}
                title={
                  isSubmitting
                    ? '저장 중...'
                    : !isValid
                      ? (firstError ?? '기본 정보를 입력해야 저장할 수 있습니다')
                      : undefined
                }
                aria-disabled={!isValid || busy}
              >
                <FiSave size={16} />
                {isSubmitting ? '등록 중...' : '사건 등록'}
              </S.ActionButton>
            </S.FormAreaActions>
          </S.FormAreaHeader>

          <EventBasicForm
            formRef={formRef}
            onDirtyChange={setIsDirty}
            onStateChange={setFormState}
            onSaved={handleSaved}
          />
        </S.FormArea>
      </S.ContentWrapper>
    </S.PageWrapper>
  )
}

export default EventCreatePageRefactored
