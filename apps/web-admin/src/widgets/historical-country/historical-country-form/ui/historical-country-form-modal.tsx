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
    data: Omit<HistoricalCountry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      parentModernCountryIds?: string[]
      parentHistoricalCountryIds?: string[]
      transitionEventType?: TransitionEventType
      transitionScope?: string | null
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

  const effectiveEditing =
    editing && typeof editing === 'object' && 'id' in editing
      ? (editing as HistoricalCountry)
      : editing && Object.keys(editing).length === 0
        ? ({} as HistoricalCountry)
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
      sectionIndex={[
        {
          id: 'basic',
          label: '기본 정보',
          filled: !!filled.name && !!filled.stateType,
        },
        {
          id: 'relations',
          label: '관계',
          filled: !!filled.parentModernCountryIds,
        },
        { id: 'narrative', label: '서술', filled: !!filled.description },
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
