/**
 * 사건 등록 모달 — 목록·대시보드에서 흐름을 끊지 않고 사건을 추가하는 표면.
 *
 * 페이지(`/events/create`) 대신 이걸 쓰는 이유는 "목록을 보면서 입력"이 아니다. 오버레이가
 * 화면 대부분을 가리므로 병행 참조는 못 준다. **사는 것은 복귀 충실도** — 목록의 스크롤·
 * 필터·정렬·접힘·선택이 아무것도 언마운트되지 않고 그대로 남는다. 페이지로 나갔다 오면
 * URL에 없는 UI 상태(접힘·펼침)는 소멸하고, 돌아오는 URL도 필터가 빠진 `/events`였다.
 *
 * 폭: `min(1040px, 96vw)` — 폼 설계폭이 라벨 200 + gap 24 + 필드 680 = 904px이고
 * FormScroll padding이 32×2라 콘텐츠 976px > 904px. 즉 **페이지 대비 가로 손실 0**.
 * 기본 셸 폭(960px)이면 콘텐츠가 896px로 904px에 못 미쳐 라벨/필드가 눌린다.
 *
 * 본문은 `React.lazy` — 이 모달이 목록·대시보드에 정적으로 딸려가면 두 진입 화면의
 * 초기 번들에 폼 청크(gzip 약 19KB)가 상시 얹힌다. 이 앱의 다른 등록 모달은 정적 import가
 * 지배적이지만, 여기서는 "폼을 안 여는 다수"가 비용을 내는 구조라 분리한다.
 *
 * 편집도 `eventId`로 지원하지만 **편집 진입점은 만들지 않는다** — 사건 상세가 이미 같은
 * 필드를 인라인 PATCH하므로 세 번째 편집 표면이 된다(흡수는 별도 배치).
 */
import React, { Suspense, useCallback, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import type {
  EventBasicFormHandle,
  EventBasicFormState,
} from '@/widgets/event-form/ui/event-basic-form'

const LazyEventBasicForm = React.lazy(() =>
  import('@/widgets/event-form/ui/event-basic-form').then((module) => ({
    default: module.EventBasicForm,
  })),
)

const LEAVE_MESSAGE = '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'

export interface EventRegisterModalProps {
  isOpen: boolean
  /** 닫기 — dirty면 이 컴포넌트가 먼저 확인을 받는다 */
  onClose: () => void
  /** 편집 대상. 없으면 신규 등록. */
  eventId?: string
  /**
   * 저장 성공 통지 — 호출부가 자기 목록을 추가로 손봐야 할 때만.
   * 캐시 무효화는 폼 본체가 이미 했으므로 대개 필요 없다.
   */
  onSaved?: (eventId: string) => void
}

export const EventRegisterModal: React.FC<EventRegisterModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSaved,
}) => {
  const navigate = useNavigate()
  const formRef = useRef<EventBasicFormHandle | null>(null)
  const [formState, setFormState] = useState<EventBasicFormState>({
    isEditMode: Boolean(eventId),
    isLoading: false,
    isSubmitting: false,
    isValid: false,
  })
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty
  /** 저장 직후 3지 분기 다이얼로그 대상 */
  const [savedEventId, setSavedEventId] = useState<string | null>(null)

  const { isEditMode, isLoading, isSubmitting, isValid, firstError } = formState
  const busy = isLoading || isSubmitting

  /** Esc·오버레이·취소 공통 — dirty면 확인부터 */
  const requestClose = useCallback(async () => {
    if (isSubmitting) return
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '확인', message: LEAVE_MESSAGE }))
    ) {
      return
    }
    isDirtyRef.current = false
    setIsDirty(false)
    onClose()
  }, [isSubmitting, onClose])

  const handleSaved = useCallback(
    (id: string) => {
      isDirtyRef.current = false
      setIsDirty(false)
      onSaved?.(id)
      setSavedEventId(id)
    },
    [onSaved],
  )

  /** 상세 보기 — 폼 본체가 캐시 시딩·프리페치를 끝낸 뒤라 무로딩 진입 */
  const handleViewDetail = useCallback(() => {
    const targetId = savedEventId
    setSavedEventId(null)
    onClose()
    if (targetId) {
      navigate(pathKeys.events.detail(targetId), { viewTransition: true })
    }
  }, [navigate, onClose, savedEventId])

  /** 계속 등록 — 연속 입력은 대개 같은 카테고리·같은 국가 묶음이라 그 둘은 남긴다 */
  const handleRegisterAnother = useCallback(() => {
    setSavedEventId(null)
    formRef.current?.reset({ keepCategory: true, keepRelatedCountries: true })
  }, [])

  const handleCloseAfterSave = useCallback(() => {
    setSavedEventId(null)
    onClose()
  }, [onClose])

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          void requestClose()
        }}
        title={isEditMode ? '사건 수정' : '사건 등록'}
        maxWidth="min(1040px, 96vw)"
        minHeight="min(680px, 86vh)"
        fullBleedOnMobile
        // 저장 중에는 Esc·오버레이로 닫히지 않게 — 요청이 날아간 뒤 UI만 사라지는 상태 방지
        closeOnEsc={!isSubmitting}
        closeOnOverlayClick={!isSubmitting}
      >
        <PersonRegisterModalFormScroll>
          {busy && (
            <BusyBar role="status" aria-live="polite">
              {isLoading
                ? '사건 정보를 불러오는 중...'
                : isEditMode
                  ? '수정 사항을 저장하는 중...'
                  : '사건을 등록하는 중...'}
            </BusyBar>
          )}
          <Suspense fallback={<LoadingNote>폼을 불러오는 중...</LoadingNote>}>
            {isOpen && (
              <LazyEventBasicForm
                eventId={eventId}
                formRef={formRef}
                onDirtyChange={setIsDirty}
                onStateChange={setFormState}
                onSaved={handleSaved}
                // 모달은 열 때마다 마운트라 로드 토스트가 매번 뜬다 — 제목으로 대체
                notifyOnLoad={false}
              />
            )}
          </Suspense>
        </PersonRegisterModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <FooterHint>
            {isEditMode
              ? '기본 정보만 수정합니다. 본문·인물·군사 기록은 상세에서 이어서 편집하세요.'
              : '기본 정보만 등록합니다. 본문·인물·군사 기록은 상세에서 이어서 채우세요.'}
          </FooterHint>
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={() => {
                void requestClose()
              }}
              disabled={isSubmitting}
            >
              취소
            </PersonRegisterModalCancelBtn>
            <PersonRegisterModalPrimaryBtn
              type="button"
              onClick={() => {
                void formRef.current?.submit()
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
            >
              {isSubmitting
                ? isEditMode
                  ? '수정 중...'
                  : '등록 중...'
                : isEditMode
                  ? '수정 완료'
                  : '사건 등록'}
            </PersonRegisterModalPrimaryBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      {/*
       * 등록 완료 3지 분기. 초기 포커스는 ConfirmDialog 규약대로 '닫기' —
       * 주 액션 '상세 보기'는 화면 이탈이라, 반사적 Enter로 연속 등록 흐름이 끊기지 않게 한다.
       */}
      <ConfirmDialog
        isOpen={savedEventId !== null}
        title={isEditMode ? '사건 수정 완료' : '사건 등록 완료'}
        message={
          isEditMode
            ? '수정했습니다. 상세로 이동해 나머지 기록을 이어서 편집할 수 있습니다.'
            : '등록했습니다. 상세로 이동해 본문·인물·군사 기록을 이어서 채우거나, 사건을 계속 등록할 수 있습니다.'
        }
        confirmLabel="상세 보기"
        altLabel={isEditMode ? undefined : '사건 계속 등록'}
        onAlt={isEditMode ? undefined : handleRegisterAnother}
        cancelLabel="닫기"
        onConfirm={handleViewDetail}
        onCancel={handleCloseAfterSave}
      />
    </>
  )
}

const BusyBar = styled.div`
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LoadingNote = styled.div`
  padding: 48px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FooterHint = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 768px) {
    display: none;
  }
`

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`

export default EventRegisterModal
