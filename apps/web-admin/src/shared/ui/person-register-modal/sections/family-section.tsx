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

import { FONT, RADIUS } from '../_form-primitives'

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

  /** "최근 등록" 칩의 슬롯 지정 버튼 — 글리프/라벨/setter만 다름. */
  const recentSlots: ReadonlyArray<{
    glyph: string
    label: string
    setId: (id: string) => void
  }> = [
    { glyph: '父', label: '아버지로 지정', setId: setFatherId },
    { glyph: '母', label: '어머니로 지정', setId: setMotherId },
    { glyph: '配', label: '배우자로 지정', setId: setSpouseId },
  ]

  /**
   * 부/모/배우자 PersonSelectModal — show/exclude/문구만 다른 동일 구조.
   * 3중 복붙 대신 config로 구동해 exclude 리스트가 서로 어긋나는 실수를 막는다.
   */
  const selectSlots: ReadonlyArray<{
    slot: 'father' | 'mother' | 'spouse'
    show: boolean
    setShow: (v: boolean) => void
    selectedId: string
    setId: (id: string) => void
    excludeIds: string[]
    excludeReason: string
    title: string
    searchPlaceholder: string
  }> = [
    {
      slot: 'father',
      show: showFatherModal,
      setShow: setShowFatherModal,
      selectedId: fatherId,
      setId: setFatherId,
      excludeIds: [editPersonId ?? '', motherId, spouseId],
      excludeReason:
        '자기 자신, 어머니·배우자로 지정한 인물은 아버지로 선택할 수 없습니다.',
      title: '아버지 선택',
      searchPlaceholder: '아버지로 등록할 인물을 검색…',
    },
    {
      slot: 'mother',
      show: showMotherModal,
      setShow: setShowMotherModal,
      selectedId: motherId,
      setId: setMotherId,
      excludeIds: [editPersonId ?? '', fatherId, spouseId],
      excludeReason:
        '자기 자신, 아버지·배우자로 지정한 인물은 어머니로 선택할 수 없습니다.',
      title: '어머니 선택',
      searchPlaceholder: '어머니로 등록할 인물을 검색…',
    },
    {
      slot: 'spouse',
      show: showSpouseModal,
      setShow: setShowSpouseModal,
      selectedId: spouseId,
      setId: setSpouseId,
      excludeIds: [editPersonId ?? '', fatherId, motherId],
      excludeReason:
        '자기 자신, 아버지·어머니로 지정한 인물은 배우자로 선택할 수 없습니다.',
      title: '배우자 선택',
      searchPlaceholder: '배우자로 등록할 인물을 검색…',
    },
  ]

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
              {recentSlots.map((slot) => (
                <RecentSlotBtn
                  key={slot.glyph}
                  type="button"
                  aria-label={`${getPersonDisplayName(p)} ${slot.label}`}
                  title={slot.label}
                  onClick={() => {
                    slot.setId(p.id)
                    markDirty()
                  }}
                >
                  {slot.glyph}
                </RecentSlotBtn>
              ))}
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
      {/* PersonSelectModal — 슬롯별 모달(검색·exclude·생성 동작 보존). config 구동. */}
      {selectSlots.map((slot) =>
        slot.show ? (
          <PersonSelectModal
            key={slot.slot}
            persons={persons}
            selectedPersonId={slot.selectedId}
            onSelect={(id) => {
              slot.setId(id)
              slot.setShow(false)
              markDirty()
            }}
            onClose={() => slot.setShow(false)}
            excludeIds={slot.excludeIds.filter(Boolean)}
            excludeReason={slot.excludeReason}
            title={slot.title}
            searchPlaceholder={slot.searchPlaceholder}
            defaultCountryId={countryId || undefined}
            onCreatedPerson={handleCreatedPerson}
          />
        ) : null,
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
  border-radius: ${RADIUS.card};
`

const RecentChipLabel = styled.span`
  font-size: ${FONT.eyebrow};
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
  border-radius: ${RADIUS.pill};
  max-width: 280px;
`

const RecentChipName = styled.span`
  font-size: ${FONT.meta};
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
