/**
 * 인물 선택 필드 - 인물 등록/역대 수반 등록 등에서 공통 사용
 * 라벨 + 아바타/이름 버튼 + PersonSelectModal
 */
import React from 'react'
import { FiChevronRight, FiUser } from 'react-icons/fi'

import type { PersonResponseDto } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  Required,
} from '@/shared/ui/register-form-layout'
import {
  PersonAvatar,
  PersonLabel,
  PersonSelectButton,
} from './form-fields.styles'

export interface PersonSelectFieldProps {
  label?: string
  required?: boolean
  /** 라벨 아래·컨트롤 아래에 표시할 설명 (통일된 스타일) */
  hint?: string
  /** 인물 목록 로딩 등으로 선택 비활성화 */
  disabled?: boolean
  value: string
  selectedPerson: Pick<
    PersonResponseDto,
    'id' | 'name' | 'surname' | 'middleName' | 'nameDisplayOrder' | 'profileImageUrl'
  > & {
    country?: { defaultNameDisplayOrder?: string | null } | null
  } | null
  persons: PersonResponseDto[]
  isModalOpen: boolean
  onModalOpenChange: (open: boolean) => void
  onSelect: (personId: string) => void
  placeholder?: string
}

function getDisplayName(
  p: (Pick<
    PersonResponseDto,
    'name' | 'surname' | 'middleName' | 'nameDisplayOrder'
  > & {
    country?: { defaultNameDisplayOrder?: string | null } | null
  }) | null,
): string {
  if (!p) return '—'
  return getPersonDisplayName({
    name: p.name ?? '',
    surname: p.surname ?? '',
    middleName: p.middleName ?? '',
    nameDisplayOrder: p.nameDisplayOrder ?? null,
    country: p.country ?? null,
  })
}

export const PersonSelectField: React.FC<PersonSelectFieldProps> = ({
  label = '인물',
  required = false,
  hint,
  disabled = false,
  value,
  selectedPerson,
  persons,
  isModalOpen,
  onModalOpenChange,
  onSelect,
  placeholder = '인물 선택',
}) => {
  const selectControl = (
    <FieldControl $variant="person">
      <PersonSelectButton
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onModalOpenChange(true)}
        $hasValue={!!value}
      >
        <PersonAvatar $hasImage={!!selectedPerson?.profileImageUrl}>
          {selectedPerson?.profileImageUrl ? (
            <img src={selectedPerson.profileImageUrl} alt="" />
          ) : (
            <FiUser size={22} strokeWidth={2} />
          )}
        </PersonAvatar>
        <PersonLabel>
          {value ? getDisplayName(selectedPerson) : placeholder}
        </PersonLabel>
        <FiChevronRight size={20} strokeWidth={2.5} />
      </PersonSelectButton>
      {hint && <FieldHint>{hint}</FieldHint>}
    </FieldControl>
  )

  return (
    <>
      {label !== '' ? (
        <FieldRow>
          <FieldLabel>
            {label ?? '인물'}
            {required && <Required aria-label="필수" />}
          </FieldLabel>
          {selectControl}
        </FieldRow>
      ) : (
        selectControl
      )}

      {isModalOpen && (
        <PersonSelectModal
          persons={persons}
          selectedPersonId={value}
          onSelect={(id) => {
            onSelect(id)
            onModalOpenChange(false)
          }}
          onClose={() => onModalOpenChange(false)}
        />
      )}
    </>
  )
}
