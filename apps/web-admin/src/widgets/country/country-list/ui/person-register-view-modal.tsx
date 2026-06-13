/**
 * 인물 등록 뷰 모달 — 공용 CountryFormShell 사용 (현대/역사적 국가 모달과 외곽 통일).
 * 페이지 임베드(person-edit.page)는 PersonRegisterView 직접 사용.
 */
import React, { useEffect, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { personKeys } from '@/entities/person/api'
import { CountryFormShell } from '@/widgets/country/country-form/ui/country-form-shell'
import { PersonRegisterView } from '@/shared/ui/person-register-modal/person-register-view'

export interface PersonRegisterViewModalProps {
  isOpen: boolean
  onClose: () => void
  initialCountryId?: string | null
  onSuccess?: (personId: string) => void
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
  editPersonId,
  title,
  editPersonName,
}: PersonRegisterViewModalProps) {
  const queryClient = useQueryClient()
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

  /** 인물 관련 캐시 무효화 — create 직후(onCreated)와 저장 완료(handleSuccess) 공용. */
  const invalidatePersonCaches = (personId?: string) => {
    queryClient.invalidateQueries({ queryKey: personKeys.all })
    // 가족 노드(부모·자녀·손자녀)에 박힌 profileImageUrl 등이 다른 인물 상세·가계도 캐시에도
    // 들어가 있으므로 broad invalidate (특정 personId가 아닌 prefix 전체)
    queryClient.invalidateQueries({ queryKey: ['person-detail'] })
    queryClient.invalidateQueries({ queryKey: ['person-family-tree'] })
    if (personId) {
      queryClient.invalidateQueries({ queryKey: personKeys.detail(personId) })
    }
  }

  /**
   * create 직후 — 캐시만 무효화하고 모달은 유지.
   * 여기서 닫으면 폼 안의 "다른 인물 이어서 등록" 다이얼로그가 그려지기 전에 언마운트됨.
   * 닫기는 다이얼로그 응답 후 handleSuccess(닫기 선택) 또는 onClose(취소)로 실행.
   */
  const handleCreated = (personId: string) => {
    invalidatePersonCaches(personId)
  }

  const handleSuccess = (personId?: string) => {
    invalidatePersonCaches(personId)
    setIsDirty(false)
    onSuccess?.(personId ?? '')
    onClose()
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
        onSubmittingChange={setSubmitting}
        onDirtyChange={setIsDirty}
        onValuesChange={setFilled}
        onSectionsChange={setSections}
      />
    </CountryFormShell>
  )
}
