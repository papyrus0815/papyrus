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

  /**
   * "최근 등록" 후보 — 단일 행으로 카드 상단 1회만. 슬롯 라벨이 chip 우측에 작은 secondary 액션
   * 으로 따라붙어 "어떤 슬롯에 넣을지" 한 번에 선택 가능. 이전: 슬롯별 3회 반복(시각 잡음).
   */
  const renderRecentChips = () => {
    if (recentCandidates.length === 0) return null
    return (
      <RecentChipRow>
        <RecentChipLabel>최근 등록</RecentChipLabel>
        {recentCandidates.map((p) => (
          <RecentChipGroup key={p.id} title={getPersonDisplayName(p)}>
            <RecentChipName>{getPersonDisplayName(p)}</RecentChipName>
            <RecentChipActions>
              <RecentSlotBtn
                type="button"
                onClick={() => {
                  setFatherId(p.id)
                  markDirty()
                }}
              >
                父
              </RecentSlotBtn>
              <RecentSlotBtn
                type="button"
                onClick={() => {
                  setMotherId(p.id)
                  markDirty()
                }}
              >
                母
              </RecentSlotBtn>
              <RecentSlotBtn
                type="button"
                onClick={() => {
                  setSpouseId(p.id)
                  markDirty()
                }}
              >
                配
              </RecentSlotBtn>
            </RecentChipActions>
          </RecentChipGroup>
        ))}
      </RecentChipRow>
    )
  }

  return (
    <FormRows>
      {renderRecentChips()}
      {/* 부 · 모 — 한 쌍의 부모. 2-col grid로 의미적 grouping. */}
      <FamilyParentsRow>
        <FamilySlot>
          <FamilySlotLabel htmlFor={fid('father')}>아버지</FamilySlotLabel>
          <FamilyMemberCard
            person={fatherPerson}
            placeholder="아버지 선택"
            onChange={() => setShowFatherModal(true)}
            onClear={() => {
              setFatherId('')
              markDirty()
            }}
          />
        </FamilySlot>
        <FamilySlot>
          <FamilySlotLabel htmlFor={fid('mother')}>어머니</FamilySlotLabel>
          <FamilyMemberCard
            person={motherPerson}
            placeholder="어머니 선택"
            onChange={() => setShowMotherModal(true)}
            onClear={() => {
              setMotherId('')
              markDirty()
            }}
          />
        </FamilySlot>
      </FamilyParentsRow>
      {/* 배우자 — 별도 행 */}
      <FieldRow>
        <FieldLabel htmlFor={fid('spouse')}>배우자</FieldLabel>
        <FieldControl>
          <FamilyMemberCard
            person={spousePerson}
            placeholder="배우자 선택 (대표 1명)"
            onChange={() => setShowSpouseModal(true)}
            onClear={() => {
              setSpouseId('')
              markDirty()
            }}
          />
        </FieldControl>
      </FieldRow>
      <FieldRow>
        <FieldLabel htmlFor={fid('spouseNote')}>배우자 설명</FieldLabel>
        <FieldControl>
          <SpouseNoteTextarea
            id={fid('spouseNote')}
            value={spouseNote}
            onChange={(e) => setSpouseNote(e.target.value)}
            placeholder="1대 왕비, 재위 기간 중 사망"
            disabled={!spouseId}
            rows={3}
          />
        </FieldControl>
      </FieldRow>
      {/* PersonSelectModal — 슬롯별 모달은 그대로(검색·exclude·생성 등 동작 보존) */}
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
          excludeIds={[editPersonId ?? '', motherId, spouseId].filter(Boolean)}
          excludeReason="자기 자신, 어머니·배우자로 지정한 인물은 아버지로 선택할 수 없습니다."
          title="아버지 선택"
          searchPlaceholder="아버지로 등록할 인물을 검색…"
          defaultCountryId={countryId || undefined}
          onCreatedPerson={handleCreatedPerson}
        />
      )}
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
          excludeIds={[editPersonId ?? '', fatherId, spouseId].filter(Boolean)}
          excludeReason="자기 자신, 아버지·배우자로 지정한 인물은 어머니로 선택할 수 없습니다."
          title="어머니 선택"
          searchPlaceholder="어머니로 등록할 인물을 검색…"
          defaultCountryId={countryId || undefined}
          onCreatedPerson={handleCreatedPerson}
        />
      )}
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
          excludeIds={[editPersonId ?? '', fatherId, motherId].filter(Boolean)}
          excludeReason="자기 자신, 아버지·어머니로 지정한 인물은 배우자로 선택할 수 없습니다."
          title="배우자 선택"
          searchPlaceholder="배우자로 등록할 인물을 검색…"
          defaultCountryId={countryId || undefined}
          onCreatedPerson={handleCreatedPerson}
        />
      )}
    </FormRows>
  )
}

// ─── Styled (가족 섹션 전용) ──────────────────────────────────────────────────

/** 부 · 모 슬롯 — 한 쌍이라 2-col grid로 의미적 grouping. */
const FamilyParentsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 8px 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const FamilySlot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const FamilySlotLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/**
 * 최근 등록 chip — 슬롯별 반복(이전: 3회) → 단일 행에 통합.
 * 한 인물 chip 옆에 父/母/配 미니 액션이 따라붙어 한 번에 슬롯 지정.
 */
const RecentChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.06)'
      : 'rgba(99, 102, 241, 0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.18)'
        : 'rgba(99, 102, 241, 0.18)'};
  border-radius: 10px;
`

const RecentChipLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const RecentChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  max-width: 280px;
`

const RecentChipName = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
`

const RecentChipActions = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

/** 父/母/配 mini 슬롯 버튼 — 한 인물을 빠르게 슬롯에 꽂는 inline action. */
const RecentSlotBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;

  &:hover {
    color: #fff;
    background: ${({ theme }) => theme.colors.primary};
  }
`

const SpouseNoteTextarea = styled(Textarea)`
  max-width: 540px;
`
