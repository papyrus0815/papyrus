/**
 * 인물 등록 뷰 모달 — 공용 CountryFormShell 사용 (현대/역사적 국가 모달과 외곽 통일).
 * 페이지 임베드(person-edit.page)는 PersonRegisterView 직접 사용.
 */
import React, { useEffect, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { invalidatePersonCaches } from '@/entities/person/api'
import { pathKeys } from '@/shared/router'
import { CountryFormShell } from '@/widgets/country/country-form/ui/country-form-shell'
import { PersonRegisterView } from '@/shared/ui/person-register-modal/person-register-view'

export interface PersonRegisterViewModalProps {
  isOpen: boolean
  onClose: () => void
  initialCountryId?: string | null
  onSuccess?: (personId: string) => void
  /**
   * 등록 완료 다이얼로그 "상세 보기"의 **이동 목적지**만 오버라이드.
   * 캐시 무효화·onSuccess·모달 닫기(정산)는 언제나 래퍼가 먼저 수행하므로 여기서는
   * 이동만 하면 된다 — 지면 고유의 상세 경로가 있는 호출부용
   * (예: persons-timeline은 셸을 유지하는 `/persons-timeline/:id`).
   * 기본은 `/persons/:id`. `false`를 주면 "상세 보기" 액션 자체를 감춘다(2지 분기 유지).
   */
  onViewDetail?: ((personId: string) => void) | false
  /** 수정할 인물 ID (없으면 신규 등록) */
  editPersonId?: string | null
  /** 모달 제목 (기본: 인물 등록 / 인물 수정) */
  title?: string
  /** 수정 모드 시 헤더 서브타이틀 (편집 중인 인물 이름) */
  editPersonName?: string
}

export function PersonRegisterViewModal({
  isOpen,
  onClose,
  initialCountryId,
  onSuccess,
  onViewDetail,
  editPersonId,
  title,
  editPersonName,
}: PersonRegisterViewModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [filled, setFilled] = useState<{
    name?: boolean
    surname?: boolean
    gender?: boolean
    countryId?: boolean
  }>({})
  // 좌측 scroll-spy 인덱스 — 폼이 "더 입력" 펼침에 따라 동적으로 보고.
  const [sections, setSections] = useState<
    { id: string; label: string; filled?: boolean }[]
  >([])

  // 모달 닫힐 때 상태 리셋
  useEffect(() => {
    if (!isOpen) {
      setIsDirty(false)
      setFilled({})
      setSections([])
    }
  }, [isOpen])

  // 인물 캐시 무효화는 중앙 헬퍼 경유 — 사본 드리프트 방지(G3-1/G3-2, entities/person/api)

  /**
   * create 직후 — 캐시만 무효화하고 모달은 유지.
   * 여기서 닫으면 폼 안의 "다른 인물 이어서 등록" 다이얼로그가 그려지기 전에 언마운트됨.
   * 닫기는 다이얼로그 응답 후 handleSuccess(닫기 선택) 또는 onClose(취소)로 실행.
   */
  const handleCreated = (personId: string) => {
    invalidatePersonCaches(queryClient, { personId })
  }

  const handleSuccess = (personId?: string) => {
    invalidatePersonCaches(queryClient, { personId })
    setIsDirty(false)
    onSuccess?.(personId ?? '')
    onClose()
  }

  /**
   * 등록 완료 다이얼로그의 "상세 보기" — 모달을 먼저 닫고(스크롤 락·포커스 복원 정리)
   * 방금 등록한 인물 상세로 이동. 등록 직후 재위·경력 등 나머지 기록을 이어서 채우는 경로.
   */
  const handleViewDetail = (personId: string) => {
    handleSuccess(personId)
    // 오버라이드는 목적지만 바꾼다 — 정산을 건너뛸 수 없는 구조로 두어
    // 호출부가 캐시 무효화·onSuccess·닫기를 빠뜨리는 사고를 원천 차단.
    if (typeof onViewDetail === 'function') onViewDetail(personId)
    else navigate(pathKeys.persons.detail(personId))
  }

  const isEdit = !!editPersonId

  return (
    <CountryFormShell
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? (isEdit ? '인물 수정' : '인물 등록')}
      subtitle={isEdit ? editPersonName : undefined}
      titleId="person-register-modal-title"
      formId="person-register-form"
      submitting={submitting}
      isDirty={isDirty}
      submitLabel={isEdit ? '수정 완료' : '인물 등록'}
      mode={isEdit ? 'edit' : 'create'}
      draftEnabled={!isEdit}
      fitContent
      // 첫-오류 이동은 PersonRegisterView.handleSubmit(rAF)이 전담 — 셸의 상시 aria-invalid
      // 옵저버를 꺼 타이핑 중 포커스 강탈·이중 스크롤 레이스를 없앤다(FB-10/A11Y-8/FB-12).
      manageErrorFocus={false}
      requiredFields={[
        { label: '이름', done: !!filled.name, jumpTarget: 'name' },
        { label: '성별', done: !!filled.gender, jumpTarget: 'gender' },
        {
          label: '국적',
          done: !!filled.countryId,
          jumpTarget: 'countryId',
        },
      ]}
      sectionIndex={sections}
    >
      <PersonRegisterView
        initialCountryId={initialCountryId}
        editPersonId={editPersonId ?? undefined}
        onCancel={onClose}
        onSuccess={handleSuccess}
        onCreated={handleCreated}
        onViewDetail={onViewDetail === false ? undefined : handleViewDetail}
        onSubmittingChange={setSubmitting}
        onDirtyChange={setIsDirty}
        onValuesChange={setFilled}
        onSectionsChange={setSections}
      />
    </CountryFormShell>
  )
}
