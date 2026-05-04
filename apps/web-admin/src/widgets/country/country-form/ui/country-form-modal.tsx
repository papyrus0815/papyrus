/**
 * 현대 국가 등록/수정 모달 — 공용 CountryFormShell을 사용해 외곽 통일.
 */
import React, { useState } from 'react'

import type {
  ContinentOption,
  Country,
  CountryFormData,
} from '@/entities/country/api'
import { CountryForm } from './country-form'
import { CountryFormShell } from './country-form-shell'

export interface CountryFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit' | null
  /** 수정 모드일 때만 의미 있음. create일 땐 null. */
  editing: Country | null
  continents: ContinentOption[]
  onSave: (data: CountryFormData & { id?: string }) => Promise<void>
  onSuccess?: () => void
}

export function CountryFormModal({
  isOpen,
  onClose,
  mode,
  editing,
  continents,
  onSave,
  onSuccess,
}: CountryFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [filled, setFilled] = useState<{
    name?: boolean
    continentId?: boolean
    population?: boolean
    areaSqKm?: boolean
    currencyId?: boolean
    languageId?: boolean
  }>({})
  const [isDirty, setIsDirty] = useState(false)

  const handleSave = async (data: CountryFormData & { id?: string }) => {
    setSubmitting(true)
    try {
      await onSave(data)
      onSuccess?.()
      onClose()
    } catch {
      // 에러 토스트는 useCountryFormModal에서 표시. 모달은 열린 상태 유지.
    } finally {
      setSubmitting(false)
    }
  }

  const active = isOpen && mode !== null

  // 모달 닫힐 때 인디케이터·dirty 리셋
  React.useEffect(() => {
    if (!active) {
      setFilled({})
      setIsDirty(false)
    }
  }, [active])

  return (
    <CountryFormShell
      isOpen={active}
      onClose={onClose}
      title={mode === 'edit' ? '국가 수정' : '국가 등록'}
      subtitle={mode === 'edit' && editing?.name ? editing.name : undefined}
      titleId="country-form-modal-title"
      formId="country-form"
      submitting={submitting}
      isDirty={isDirty}
      submitLabel={mode === 'edit' ? '수정 완료' : '국가 등록'}
      mode={mode === 'edit' ? 'edit' : 'create'}
      draftEnabled={mode === 'create'}
      requiredFields={[
        { label: '국가명', done: !!filled.name, jumpTarget: 'name' },
        {
          label: '대륙',
          done: !!filled.continentId,
          jumpTarget: 'continentId',
        },
      ]}
      sectionIndex={[
        {
          id: 'basic',
          label: '기본 정보',
          filled: !!filled.name && !!filled.continentId,
        },
        {
          id: 'stats',
          label: '통계 정보',
          filled: !!filled.population || !!filled.areaSqKm,
        },
        {
          id: 'extra',
          label: '부가 정보',
          filled: !!filled.currencyId || !!filled.languageId,
        },
        { id: 'display', label: '표시 설정', filled: false },
      ]}
    >
      <CountryForm
        mode={mode ?? 'create'}
        editing={editing}
        continents={continents}
        onSave={handleSave}
        onValuesChange={(values) =>
          setFilled({
            name: !!values.name?.trim(),
            continentId: !!values.continentId,
            population: values.population != null,
            areaSqKm: values.areaSqKm != null,
            currencyId: !!values.currencyId,
            languageId: !!values.languageId,
          })
        }
        onDirtyChange={setIsDirty}
      />
    </CountryFormShell>
  )
}
