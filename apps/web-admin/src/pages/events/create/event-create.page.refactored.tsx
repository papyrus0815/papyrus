/**
 * Event Create Page — 사건 기본 정보 폼의 **페이지 셸**.
 *
 * 폼 본체는 `widgets/event-form/ui/event-basic-form`에 있다. 이 파일은 외곽만 담당한다:
 * 페이지 크롬(제목·이전/저장 버튼), 로딩 오버레이, 이탈 가드(useBlocker), 저장 후 이동.
 *
 * 저장 직후 해당 사건 상세로 이동해 사용자가 곧바로 내용을 이어 채우도록 유도한다.
 *
 * 복귀 목적지: 진입점이 `state.from`을 주면 그곳으로(목록의 필터·정렬·선택이 담긴 URL),
 * 없으면 `/events`. 예전엔 무조건 `/events`라 목록에서 들어왔다 나가면 URL에 동기화된
 * 필터·정렬·뷰모드·선택이 전부 날아갔다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { FiArrowLeft, FiSave } from 'react-icons/fi'
import {
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

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
  const { eventId: editEventId } = useParams<{ eventId?: string }>()
  const playClickSound = useClickSound()

  const formRef = useRef<EventBasicFormHandle | null>(null)
  const [formState, setFormState] = useState<EventBasicFormState>({
    isEditMode: Boolean(editEventId),
    isLoading: false,
    isSubmitting: false,
    isValid: false,
  })
  const [isDirty, setIsDirty] = useState(false)
  // state 대신 ref로 판정 — confirm 직후 같은 틱의 navigate가 stale state로 막히지 않게.
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  const { isEditMode, isLoading, isSubmitting, isValid, firstError } = formState

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
              <span>
                {isLoading
                  ? '사건 정보를 불러오는 중...'
                  : isEditMode
                    ? '수정 사항을 저장하는 중...'
                    : '사건을 등록하는 중...'}
              </span>
            </S.FormOverlay>
          )}
          <S.FormAreaHeader>
            <S.FormAreaTitle>
              {isEditMode ? '사건 수정' : '사건 등록'}
            </S.FormAreaTitle>
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
                  isLoading
                    ? '사건 정보를 불러오는 중'
                    : isSubmitting
                      ? '저장 중...'
                      : !isValid
                        ? (firstError ?? '기본 정보를 입력해야 저장할 수 있습니다')
                        : undefined
                }
                aria-disabled={!isValid || busy}
              >
                <FiSave size={16} />
                {isSubmitting
                  ? isEditMode
                    ? '수정 중...'
                    : '등록 중...'
                  : isEditMode
                    ? '수정 완료'
                    : '사건 등록'}
              </S.ActionButton>
            </S.FormAreaActions>
          </S.FormAreaHeader>

          <EventBasicForm
            eventId={editEventId}
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
