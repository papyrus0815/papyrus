/**
 * 역사적 국가 등록/수정 모달 — 공용 CountryFormShell 사용 (현대 국가 모달과 외곽 통일).
 */
import React, { useState } from 'react'

import type { HistoricalCountry } from '@/entities/historical-country/api'
import type { TransitionEventType } from '@/shared/api/historical-countries'
import { CountryFormShell } from '@/widgets/country/country-form/ui/country-form-shell'
import { HistoricalCountryForm } from './historical-country-form'

export interface HistoricalCountryFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** 수정 시에는 해당 국가, 등록 시에는 빈 객체 {} 등 */
  editing: HistoricalCountry | Record<string, never> | null
  /** 등록 모달에서 "막부" 선택 시 폼에 미리 채울 값 */
  initialPreset?: { stateType: 'SHOGUNATE'; entityKind: 'REGIME' }
  modernCountries: Array<{ id: string; name: string }>
  historicalCountries?: Array<{ id: string; name: string }>
  onSave: (
    // 건국·멸망 배경은 개요 카드 소유 — 폼 저장이 싣지 않는다(undefined=그대로)
    data: Omit<
      HistoricalCountry,
      'id' | 'createdAt' | 'updatedAt' | 'foundingNote' | 'dissolutionNote'
    > & {
      id?: string
      parentModernCountryIds?: string[]
      parentHistoricalCountryIds?: string[]
      transitionEventType?: TransitionEventType
      transitionScope?: 'STATE_SUCCESSION' | 'REGIME_CHANGE' | null
    },
  ) => Promise<void>
  onSuccess?: () => void
}

export function HistoricalCountryFormModal({
  isOpen,
  onClose,
  editing,
  initialPreset,
  modernCountries,
  historicalCountries = [],
  onSave,
  onSuccess,
}: HistoricalCountryFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [filled, setFilled] = useState<{
    name?: boolean
    stateType?: boolean
    parentModernCountryIds?: boolean
    description?: boolean
  }>({})

  const handleSave = async (
    data: Parameters<HistoricalCountryFormModalProps['onSave']>[0],
  ) => {
    setSubmitting(true)
    try {
      await onSave(data)
      onSuccess?.()
      onClose()
    } catch {
      // 외부에서 토스트 처리
    } finally {
      setSubmitting(false)
    }
  }

  // 신규 등록의 빈 편집 대상은 **한 번 만든 객체를 계속** 넘긴다. 렌더마다 `{}`를 새로
  // 만들면 폼의 초기화 effect가 그 참조 변화에 매번 반응해 reset() — 한 글자 칠 때마다
  // 부모가 다시 그려지며(filled·isDirty 갱신) 입력이 지워져 "아무것도 안 적히던" 원인이었다.
  const blankEditingRef = React.useRef<HistoricalCountry>({} as HistoricalCountry)
  const effectiveEditing =
    editing && typeof editing === 'object' && 'id' in editing
      ? (editing as HistoricalCountry)
      : editing && Object.keys(editing).length === 0
        ? blankEditingRef.current
        : null

  React.useEffect(() => {
    if (!isOpen) {
      setIsDirty(false)
      setFilled({})
    }
  }, [isOpen])

  const active = isOpen && effectiveEditing !== null
  const isEdit = !!effectiveEditing?.id

  return (
    <CountryFormShell
      isOpen={active}
      onClose={onClose}
      title={isEdit ? '역사적 국가 수정' : '역사적 국가 등록'}
      subtitle={
        isEdit && effectiveEditing?.name ? effectiveEditing.name : undefined
      }
      titleId="historical-country-form-modal-title"
      formId="historical-country-form"
      submitting={submitting}
      isDirty={isDirty}
      submitLabel={isEdit ? '수정 완료' : '국가 등록'}
      mode={isEdit ? 'edit' : 'create'}
      draftEnabled={!isEdit}
      requiredFields={[
        { label: '국가명', done: !!filled.name, jumpTarget: 'name' },
        {
          label: '국가 형태',
          done: !!filled.stateType,
          jumpTarget: 'stateType',
        },
      ]}
    >
      {effectiveEditing && (
        <HistoricalCountryForm
          editing={effectiveEditing}
          initialPreset={initialPreset}
          modernCountries={modernCountries}
          historicalCountries={historicalCountries}
          onClose={onClose}
          onSave={handleSave}
          onDirtyChange={setIsDirty}
          onValuesChange={(values) =>
            setFilled({
              name: !!values.name?.trim(),
              stateType: !!values.stateType,
              parentModernCountryIds:
                Array.isArray(values.parentModernCountryIds) &&
                values.parentModernCountryIds.length > 0,
              description: !!values.description?.trim(),
            })
          }
        />
      )}
    </CountryFormShell>
  )
}
