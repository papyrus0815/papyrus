/**
 * 인물 등록/수정 폼의 "가족" 탭.
 * - 부/모/배우자 슬롯 + 배우자 메모.
 * - 각 슬롯 위에 "최근 등록한 인물" dashed 칩 행 (또 등록 모드에서 가계 일괄 등록 가속).
 * - 슬롯 클릭 시 PersonSelectModal — 검색·필터·"+ 새 인물" 인라인 등록.
 */
import React from 'react'

import styled from 'styled-components'

import type { PersonResponseDto } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { FamilyMemberCard } from '@/shared/ui/person-register-modal/family-member-card'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Textarea,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

export interface FamilySectionProps {
  fid: (key: string) => string
  // 가족 슬롯
  fatherId: string
  motherId: string
  spouseId: string
  spouseNote: string
  setFatherId: (id: string) => void
  setMotherId: (id: string) => void
  setSpouseId: (id: string) => void
  setSpouseNote: (note: string) => void
  // 카드 렌더용 인물 — 부모에서 personById.get(...)로 해소된 결과
  fatherPerson: PersonResponseDto | undefined
  motherPerson: PersonResponseDto | undefined
  spousePerson: PersonResponseDto | undefined
  // PersonSelectModal 표시 상태
  showFatherModal: boolean
  showMotherModal: boolean
  showSpouseModal: boolean
  setShowFatherModal: (v: boolean) => void
  setShowMotherModal: (v: boolean) => void
  setShowSpouseModal: (v: boolean) => void
  // PersonSelectModal에 넘길 데이터
  persons: PersonResponseDto[]
  setPersons: React.Dispatch<React.SetStateAction<PersonResponseDto[]>>
  /** "최근 등록한 인물" — 또 등록 모드 + 슬롯/현재 인물 제외 */
  recentCandidates: PersonResponseDto[]
  // 폼 컨텍스트
  editPersonId?: string | null
  countryId: string
  // 부모 dirty 추적
  markDirty: () => void
}

export function FamilySection({
  fid,
  fatherId,
  motherId,
  spouseId,
  spouseNote,
  setFatherId,
  setMotherId,
  setSpouseId,
  setSpouseNote,
  fatherPerson,
  motherPerson,
  spousePerson,
  showFatherModal,
  showMotherModal,
  showSpouseModal,
  setShowFatherModal,
  setShowMotherModal,
  setShowSpouseModal,
  persons,
  setPersons,
  recentCandidates,
  editPersonId,
  countryId,
  markDirty,
}: FamilySectionProps) {
  const handleCreatedPerson = (p: PersonResponseDto) =>
    setPersons((prev) => [...prev, p])

  return (
    <FormRows>
      <FieldRow>
        <FieldLabel htmlFor={fid('father')}>아버지</FieldLabel>
        <FieldControl>
          {recentCandidates.length > 0 && (
            <RecentChipRow>
              <RecentChipLabel>최근 등록</RecentChipLabel>
              {recentCandidates.map((p) => (
                <RecentChip
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setFatherId(p.id)
                    markDirty()
                  }}
                  title="이 슬롯에 지정"
                >
                  {getPersonDisplayName(p)}
                </RecentChip>
              ))}
            </RecentChipRow>
          )}
          <FamilyMemberCard
            person={fatherPerson}
            placeholder="아버지 선택"
            onChange={() => setShowFatherModal(true)}
            onClear={() => {
              setFatherId('')
              markDirty()
            }}
          />
          {showFatherModal && (
            <PersonSelectModal
              persons={persons}
              selectedPersonId={fatherId}
              onSelect={(id) => {
                setFatherId(id)
                setShowFatherModal(false)
                markDirty()
              }}
              onClose={() => setShowFatherModal(false)}
              excludeIds={[editPersonId ?? '', motherId, spouseId].filter(
                Boolean,
              )}
              excludeReason="자기 자신, 어머니·배우자로 지정한 인물은 아버지로 선택할 수 없습니다."
              title="아버지 선택"
              searchPlaceholder="아버지로 등록할 인물을 검색…"
              defaultCountryId={countryId || undefined}
              onCreatedPerson={handleCreatedPerson}
            />
          )}
        </FieldControl>
      </FieldRow>
      <FieldRow>
        <FieldLabel htmlFor={fid('mother')}>어머니</FieldLabel>
        <FieldControl>
          {recentCandidates.length > 0 && (
            <RecentChipRow>
              <RecentChipLabel>최근 등록</RecentChipLabel>
              {recentCandidates.map((p) => (
                <RecentChip
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setMotherId(p.id)
                    markDirty()
                  }}
                  title="이 슬롯에 지정"
                >
                  {getPersonDisplayName(p)}
                </RecentChip>
              ))}
            </RecentChipRow>
          )}
          <FamilyMemberCard
            person={motherPerson}
            placeholder="어머니 선택"
            onChange={() => setShowMotherModal(true)}
            onClear={() => {
              setMotherId('')
              markDirty()
            }}
          />
          {showMotherModal && (
            <PersonSelectModal
              persons={persons}
              selectedPersonId={motherId}
              onSelect={(id) => {
                setMotherId(id)
                setShowMotherModal(false)
                markDirty()
              }}
              onClose={() => setShowMotherModal(false)}
              excludeIds={[editPersonId ?? '', fatherId, spouseId].filter(
                Boolean,
              )}
              excludeReason="자기 자신, 아버지·배우자로 지정한 인물은 어머니로 선택할 수 없습니다."
              title="어머니 선택"
              searchPlaceholder="어머니로 등록할 인물을 검색…"
              defaultCountryId={countryId || undefined}
              onCreatedPerson={handleCreatedPerson}
            />
          )}
        </FieldControl>
      </FieldRow>
      <FieldRow>
        <FieldLabel htmlFor={fid('spouse')}>배우자</FieldLabel>
        <FieldControl>
          {recentCandidates.length > 0 && (
            <RecentChipRow>
              <RecentChipLabel>최근 등록</RecentChipLabel>
              {recentCandidates.map((p) => (
                <RecentChip
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSpouseId(p.id)
                    markDirty()
                  }}
                  title="이 슬롯에 지정"
                >
                  {getPersonDisplayName(p)}
                </RecentChip>
              ))}
            </RecentChipRow>
          )}
          <FamilyMemberCard
            person={spousePerson}
            placeholder="배우자 선택 (대표 1명)"
            onChange={() => setShowSpouseModal(true)}
            onClear={() => {
              setSpouseId('')
              markDirty()
            }}
          />
          {showSpouseModal && (
            <PersonSelectModal
              persons={persons}
              selectedPersonId={spouseId}
              onSelect={(id) => {
                setSpouseId(id)
                setShowSpouseModal(false)
                markDirty()
              }}
              onClose={() => setShowSpouseModal(false)}
              excludeIds={[editPersonId ?? '', fatherId, motherId].filter(
                Boolean,
              )}
              excludeReason="자기 자신, 아버지·어머니로 지정한 인물은 배우자로 선택할 수 없습니다."
              title="배우자 선택"
              searchPlaceholder="배우자로 등록할 인물을 검색…"
              defaultCountryId={countryId || undefined}
              onCreatedPerson={handleCreatedPerson}
            />
          )}
        </FieldControl>
      </FieldRow>
      <FieldRow>
        <FieldLabel htmlFor={fid('spouseNote')}>배우자 설명</FieldLabel>
        <FieldControl>
          <SpouseNoteTextarea
            id={fid('spouseNote')}
            value={spouseNote}
            onChange={(e) => setSpouseNote(e.target.value)}
            placeholder="예: 1대 왕비, 재위 기간 중 사망"
            disabled={!spouseId}
            rows={3}
          />
        </FieldControl>
      </FieldRow>
    </FormRows>
  )
}

// ─── Styled (가족 섹션 전용) ──────────────────────────────────────────────────

const RecentChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`

const RecentChipLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-right: 2px;
`

const RecentChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 220px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.alert.info.border};
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
  &:hover {
    color: #fff;
    background: #6366f1;
    border-color: #6366f1;
  }
`

const SpouseNoteTextarea = styled(Textarea)`
  max-width: 540px;
`
