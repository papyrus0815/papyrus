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
import { FiArrowLeft, FiCheck, FiCloud } from 'react-icons/fi'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { invalidatePersonCaches } from '@/entities/person/api'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PersonRegisterView } from '@/shared/ui/person-register-modal/person-register-view'
import {
  AutoSaveStatus,
  StickyFooter,
} from '@/shared/ui/person-register-modal/person-register-view.styles'
import { pathKeys } from '@/shared/router'
import {
  BackButton,
  FormCardWrapper,
  FormHeader,
  FormHeaderTitle,
  SubmitButton,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

export default function PersonEditPage() {
  const { personId } = useParams<{ personId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 제출 라벨은 뷰(onSubmitLabelChange)가 단일 출처로 갱신 — 초기값도 모달과 동일 세트로.
  const [submitLabel, setSubmitLabel] = useState(
    personId ? '수정 완료' : '인물 등록',
  )
  // 신규 등록은 draft로 임시 저장되므로 이탈 경고를 모달과 정합(수정 모드는 임시저장 없음).
  const leaveMessage = personId
    ? '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?'
    : '입력 내용은 임시 저장되어 다음에 이어서 작성할 수 있습니다. 정말 나가시겠습니까?'
  // 필수 필드 채움 상태 — 페이지 모드엔 좌측 레일이 없어, 접기가 담당하던
  // '필수만 채우면 끝' 안심 신호를 sticky 푸터의 진척칩으로 대체(모달 푸터와 동형).
  const [filled, setFilled] = useState<{
    name?: boolean
    surname?: boolean
    gender?: boolean
    countryId?: boolean
  }>({})
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
      message: leaveMessage,
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
        message: leaveMessage,
      }))
    ) {
      return
    }
    // 이미 확인받았으므로 dirty 해제 — blocker의 중복 confirm 방지.
    isDirtyRef.current = false
    setIsDirty(false)
    navigate(-1)
  }

  // 인물 캐시 무효화는 중앙 헬퍼 경유 — 사본 드리프트 방지(G3-1/G3-2, entities/person/api).
  // staleTime 3분이라 무효화 없이 이동하면 상세·목록이 수정 전 데이터를 보여줌.

  /**
   * create 직후 — 캐시만 무효화하고 페이지는 유지.
   * 여기서 이동하면 폼 안의 "다른 인물 이어서 등록" 다이얼로그가 그려지기 전에 언마운트됨.
   * 이동은 다이얼로그 응답 후 handleViewDetail(상세 보기) 또는 handleSuccess(닫기 → 목록)로 실행.
   */
  const handleCreated = (savedId: string) => {
    invalidatePersonCaches(queryClient, { personId: savedId })
  }

  /** 저장 성공 공통 마무리 — dirty 해제(이탈 경고 오발 방지) + 캐시 무효화. */
  const settleAfterSave = (savedId: string) => {
    isDirtyRef.current = false
    setIsDirty(false)
    invalidatePersonCaches(queryClient, { personId: savedId })
  }

  /**
   * 수정 저장 → 그 인물 상세로.
   * 신규 등록 후 '닫기'(= 상세로 안 감) → 인물 목록으로. 상세 이동은 등록 완료
   * 다이얼로그의 '상세 보기'(handleViewDetail)가 전담해 두 버튼이 같은 곳으로 가지 않게 한다.
   */
  const handleSuccess = (savedId: string) => {
    settleAfterSave(savedId)
    navigate(
      personId ? pathKeys.persons.detail(savedId) : pathKeys.persons.root(),
      { replace: true },
    )
  }

  /** 등록 완료 다이얼로그의 '상세 보기' — 방금 등록한 인물 상세로. */
  const handleViewDetail = (savedId: string) => {
    settleAfterSave(savedId)
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

  // 필수 3항목(이름·성별·국적) 진척 — 성(surname)은 선택이라 제외(레지스터 뷰 완료 판정과 동일).
  const requiredFlags = [!!filled.name, !!filled.gender, !!filled.countryId]
  const requiredDone = requiredFlags.filter(Boolean).length
  const requiredTotal = requiredFlags.length
  const requiredComplete = requiredDone === requiredTotal
  const requiredMissing = [
    !filled.name && '이름',
    !filled.gender && '성별',
    !filled.countryId && '국적',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Root>
      <FormCardWrapper>
        <FormHeader>
          <BackButton type="button" onClick={handleCancel}>
            <FiArrowLeft size={18} />
            목록 보기
          </BackButton>
          {/* 페이지 최상위 랜드마크 — 모달의 ModalTitle(h2) 미러링(헤딩 레벨 건너뜀 방지). */}
          <FormHeaderTitle>{personId ? '인물 수정' : '인물 등록'}</FormHeaderTitle>
        </FormHeader>
        <FormBody>
          <PersonRegisterView
            editPersonId={personId ?? null}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
            onCreated={handleCreated}
            onViewDetail={handleViewDetail}
            onSubmittingChange={setIsSubmitting}
            onSubmitLabelChange={setSubmitLabel}
            onDirtyChange={setIsDirty}
            onValuesChange={setFilled}
          />
        </FormBody>
        <StickyFooter>
          <RequiredProgress
            $complete={requiredComplete}
            title={
              requiredComplete
                ? '필수 항목 모두 입력'
                : `필수 미완: ${requiredMissing}`
            }
          >
            <RequiredDots>
              {requiredFlags.map((done, idx) => (
                <RequiredDot
                  key={idx}
                  $on={done}
                  $complete={requiredComplete}
                />
              ))}
            </RequiredDots>
            {requiredComplete && <FiCheck size={12} />}
            필수 {requiredDone}/{requiredTotal}
          </RequiredProgress>
          {/* 신규 등록은 draft 자동 임시저장 — 모달 푸터의 '임시 저장 중'과 동형 신호. */}
          {!personId && isDirty && (
            <AutoSaveStatus>
              <FiCloud size={12} />
              임시 저장 중
            </AutoSaveStatus>
          )}
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

/**
 * 페이지 모드 폼 본문 좌우 거터 — 모달은 FormScroll(padding 28px 32px)이 담당하지만
 * 페이지는 그 셸이 없어 콘텐츠가 카드 가장자리에 붙던 문제(RESP-12)를 이 진입점에서만 보정.
 * 공유 FormCardWrapper는 다른 폼도 쓰므로 건드리지 않고 페이지 전용으로만 패딩을 준다.
 */
const FormBody = styled.div`
  padding: 8px clamp(16px, 4vw, 40px) 0;
`

// 페이지 모드 sticky 푸터의 필수 진척칩 — 모달 셸의 ProgressLabel과 동형(색·톤 일치).
// margin-right:auto로 좌측 정렬, 제출 버튼은 우측 유지(StickyFooter flex-end 그대로).
const RequiredProgress = styled.span<{ $complete: boolean }>`
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  white-space: nowrap;
  color: ${({ $complete, theme }) =>
    $complete ? theme.colors.alert.success.fg : theme.colors.text.tertiary};

  > svg {
    flex-shrink: 0;
  }
`

const RequiredDots = styled.span`
  display: inline-flex;
  gap: 4px;
`

const RequiredDot = styled.span<{ $on: boolean; $complete: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: background 0.15s ease;
  background: ${({ $on, $complete, theme }) =>
    $complete
      ? theme.colors.alert.success.fg
      : $on
        ? theme.colors.primary
        : theme.colors.border.medium};
`
