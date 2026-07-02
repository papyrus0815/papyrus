/**
 * 인물 등록/수정 폼의 "가족" 탭.
 * - 부/모/배우자 슬롯 + 배우자 메모.
 * - 각 슬롯 위에 "최근 등록한 인물" dashed 칩 행 (또 등록 모드에서 가계 일괄 등록 가속).
 * - 슬롯 클릭 시 PersonSelectModal — 검색·필터·"+ 새 인물" 인라인 등록.
 */
import React, { useState } from 'react'

import styled from 'styled-components'

import type { PersonResponseDto, SpouseRelationInput } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Textarea,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import { FONT, RADIUS } from '../_form-primitives'
import {
  InlineSearchSelect,
  type SearchOption,
} from './inline-search-select'

export interface FamilySectionProps {
  fid: (key: string) => string
  // 가족 슬롯
  fatherId: string
  motherId: string
  /** 사생아·서출 — 가계도 카드 별표(*) 마커 */
  illegitimate: boolean
  /** 배우자 관계 반복 행 (배우자 + 혼인 시작/종료일 + 메모) */
  spouseRows: SpouseRelationInput[]
  setFatherId: (id: string) => void
  setMotherId: (id: string) => void
  setIllegitimate: (value: boolean) => void
  setSpouseRows: React.Dispatch<React.SetStateAction<SpouseRelationInput[]>>
  // PersonSelectModal 표시 상태(= "+ 새 인물" 생성 분기)
  showFatherModal: boolean
  showMotherModal: boolean
  showSpouseModal: boolean
  setShowFatherModal: (v: boolean) => void
  setShowMotherModal: (v: boolean) => void
  setShowSpouseModal: (v: boolean) => void
  /** 인라인 검색 옵션 원천 — 인물 풀 + 수정 모드 편집 캐시 합집합(즉시 표시) */
  knownPersons: PersonResponseDto[]
  // PersonSelectModal에 넘길 데이터(검색·"+ 새 인물" 생성)
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
  illegitimate,
  spouseRows,
  setFatherId,
  setMotherId,
  setIllegitimate,
  setSpouseRows,
  showFatherModal,
  showMotherModal,
  showSpouseModal,
  setShowFatherModal,
  setShowMotherModal,
  setShowSpouseModal,
  knownPersons,
  persons,
  setPersons,
  recentCandidates,
  editPersonId,
  countryId,
  markDirty,
}: FamilySectionProps) {
  const handleCreatedPerson = (p: PersonResponseDto) =>
    setPersons((prev) => [...prev, p])

  // ─── 배우자 반복 행 ──────────────────────────────────────────────────────────
  /** "새 인물 등록" 모달이 채울 대상 행 인덱스 (null = 열려있지 않음/미지정). */
  const [pendingSpouseRowIndex, setPendingSpouseRowIndex] = useState<number | null>(null)
  /** 이미 배우자로 지정된 id들 — 옵션·모달 exclude 및 중복 방지용. */
  const usedSpouseIds = spouseRows.map((row) => row.spouseId).filter(Boolean)

  const addSpouseRow = () => setSpouseRows((prev) => [...prev, { spouseId: '' }])
  const updateSpouseRow = (index: number, patch: Partial<SpouseRelationInput>) =>
    setSpouseRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    )
  const removeSpouseRow = (index: number) =>
    setSpouseRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
  /** PersonSelectModal 선택/생성 결과를 pending 행에 채운다(인덱스 없으면 중복 아닐 때 추가). */
  const fillSpouseFromModal = (id: string) => {
    setSpouseRows((prev) => {
      if (pendingSpouseRowIndex != null && pendingSpouseRowIndex < prev.length)
        return prev.map((row, rowIndex) =>
          rowIndex === pendingSpouseRowIndex ? { ...row, spouseId: id } : row,
        )
      if (prev.some((row) => row.spouseId === id)) return prev
      return [...prev, { spouseId: id }]
    })
  }
  /** <input type="date">용 — ISO/문자열을 YYYY-MM-DD로 자른다. */
  const toDateInputValue = (value?: string) => (value ? value.slice(0, 10) : '')

  /** 인물 풀 → 콤보 옵션(슬롯별 exclude 적용). */
  const personOptions = (excludeIds: string[]): SearchOption[] =>
    knownPersons
      .filter((person) => !excludeIds.includes(person.id))
      .map((person) => ({
        value: person.id,
        label: getPersonDisplayName(person),
      }))

  /** "최근 등록" 칩의 슬롯 지정 버튼 — 글리프/라벨/setter만 다름. */
  const recentSlots: ReadonlyArray<{
    glyph: string
    label: string
    setId: (id: string) => void
  }> = [
    { glyph: '父', label: '아버지로 지정', setId: setFatherId },
    { glyph: '母', label: '어머니로 지정', setId: setMotherId },
    {
      glyph: '配',
      label: '배우자로 추가',
      setId: (id) =>
        setSpouseRows((prev) =>
          prev.some((row) => row.spouseId === id) ? prev : [...prev, { spouseId: id }],
        ),
    },
  ]

  /**
   * 부/모/배우자 PersonSelectModal — show/exclude/문구만 다른 동일 구조.
   * 3중 복붙 대신 config로 구동해 exclude 리스트가 서로 어긋나는 실수를 막는다.
   */
  const selectSlots: ReadonlyArray<{
    slot: 'father' | 'mother'
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
      excludeIds: [editPersonId ?? '', motherId, ...usedSpouseIds],
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
      excludeIds: [editPersonId ?? '', fatherId, ...usedSpouseIds],
      excludeReason:
        '자기 자신, 아버지·배우자로 지정한 인물은 어머니로 선택할 수 없습니다.',
      title: '어머니 선택',
      searchPlaceholder: '어머니로 등록할 인물을 검색…',
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
          <FamilySlotLabel>아버지</FamilySlotLabel>
          <InlineSearchSelect
            ariaLabel="아버지"
            placeholder="아버지 검색·선택"
            options={personOptions([editPersonId ?? '', motherId, ...usedSpouseIds])}
            value={fatherId}
            onChange={(id) => {
              setFatherId(id)
              markDirty()
            }}
            onCreateNew={() => setShowFatherModal(true)}
            createLabel="새 인물 등록"
            limit={30}
          />
        </FamilySlot>
        <FamilySlot>
          <FamilySlotLabel>어머니</FamilySlotLabel>
          <InlineSearchSelect
            ariaLabel="어머니"
            placeholder="어머니 검색·선택"
            options={personOptions([editPersonId ?? '', fatherId, ...usedSpouseIds])}
            value={motherId}
            onChange={(id) => {
              setMotherId(id)
              markDirty()
            }}
            onCreateNew={() => setShowMotherModal(true)}
            createLabel="새 인물 등록"
            limit={30}
          />
        </FamilySlot>
      </FamilyParentsRow>
      {/* 사생아·서출 — 가계도 카드 별표(*) 마커. 부모 관계의 성격이라 부모 슬롯 아래. */}
      <IllegitimateRow>
        <IllegitimateCheckbox
          type="checkbox"
          id={fid('illegitimate')}
          checked={illegitimate}
          onChange={(e) => {
            setIllegitimate(e.target.checked)
            markDirty()
          }}
        />
        <IllegitimateLabel htmlFor={fid('illegitimate')}>
          사생아·서출 <IllegitimateHint>가계도에서 이름 옆 별표(*)로 표시됩니다</IllegitimateHint>
        </IllegitimateLabel>
      </IllegitimateRow>
      {/* 배우자 — 반복 행(다중 배우자·혼인일·메모). 정실/후궁·순차 재혼을 직접 편집. */}
      <FieldRow>
        <FieldLabel>배우자</FieldLabel>
        <FieldControl>
          <SpouseRowList>
            {spouseRows.length === 0 && (
              <SpouseEmptyHint>등록된 배우자가 없습니다</SpouseEmptyHint>
            )}
            {spouseRows.map((row, index) => (
              <SpouseRowCard key={index}>
                <SpouseRowMain>
                  <SpouseRowIndex>{index + 1}</SpouseRowIndex>
                  <SpouseRowSelect>
                    <InlineSearchSelect
                      ariaLabel={`배우자 ${index + 1}`}
                      placeholder="배우자 검색·선택"
                      options={personOptions([
                        editPersonId ?? '',
                        fatherId,
                        motherId,
                        // 다른 행에 이미 지정된 배우자는 제외(같은 행 값은 표시 유지)
                        ...usedSpouseIds.filter((id) => id !== row.spouseId),
                      ])}
                      value={row.spouseId}
                      onChange={(id) => {
                        updateSpouseRow(index, { spouseId: id })
                        markDirty()
                      }}
                      onCreateNew={() => {
                        setPendingSpouseRowIndex(index)
                        setShowSpouseModal(true)
                      }}
                      createLabel="새 인물 등록"
                      limit={30}
                    />
                  </SpouseRowSelect>
                  <SpouseRemoveBtn
                    type="button"
                    aria-label={`배우자 ${index + 1} 삭제`}
                    title="이 배우자 행 삭제"
                    onClick={() => {
                      removeSpouseRow(index)
                      markDirty()
                    }}
                  >
                    ×
                  </SpouseRemoveBtn>
                </SpouseRowMain>
                <SpouseRowMeta>
                  <SpouseDateField>
                    <SpouseDateLabel>혼인 시작</SpouseDateLabel>
                    <SpouseDateInput
                      type="date"
                      value={toDateInputValue(row.marriageStartDate)}
                      onChange={(e) => {
                        updateSpouseRow(index, { marriageStartDate: e.target.value || undefined })
                        markDirty()
                      }}
                    />
                  </SpouseDateField>
                  <SpouseDateField>
                    <SpouseDateLabel>혼인 종료</SpouseDateLabel>
                    <SpouseDateInput
                      type="date"
                      value={toDateInputValue(row.marriageEndDate)}
                      onChange={(e) => {
                        updateSpouseRow(index, { marriageEndDate: e.target.value || undefined })
                        markDirty()
                      }}
                    />
                  </SpouseDateField>
                </SpouseRowMeta>
                <SpouseNoteTextarea
                  aria-label={`배우자 ${index + 1} 설명`}
                  value={row.note ?? ''}
                  onChange={(e) => {
                    updateSpouseRow(index, { note: e.target.value || null })
                    markDirty()
                  }}
                  placeholder="1대 왕비, 재위 기간 중 사망"
                  rows={2}
                />
              </SpouseRowCard>
            ))}
            <SpouseAddBtn
              type="button"
              onClick={() => {
                addSpouseRow()
                markDirty()
              }}
            >
              + 배우자 추가
            </SpouseAddBtn>
          </SpouseRowList>
        </FieldControl>
      </FieldRow>
      {/* 부·모 PersonSelectModal — config 구동(검색·exclude·생성 보존). */}
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
      {/* 배우자 "새 인물 등록" 모달 — pending 행을 채운다(검색·생성). */}
      {showSpouseModal && (
        <PersonSelectModal
          persons={persons}
          selectedPersonId={
            pendingSpouseRowIndex != null
              ? spouseRows[pendingSpouseRowIndex]?.spouseId ?? ''
              : ''
          }
          onSelect={(id) => {
            fillSpouseFromModal(id)
            setShowSpouseModal(false)
            setPendingSpouseRowIndex(null)
            markDirty()
          }}
          onClose={() => {
            setShowSpouseModal(false)
            setPendingSpouseRowIndex(null)
          }}
          excludeIds={[
            editPersonId ?? '',
            fatherId,
            motherId,
            // 다른 행에 이미 지정된 배우자 제외(현재 편집 중 행 값은 허용)
            ...usedSpouseIds.filter(
              (id) =>
                pendingSpouseRowIndex == null ||
                id !== spouseRows[pendingSpouseRowIndex]?.spouseId,
            ),
          ].filter(Boolean)}
          excludeReason="자기 자신, 부모·이미 지정된 배우자는 배우자로 선택할 수 없습니다."
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

/** 사생아·서출 체크박스 행 — 부모 슬롯 아래. */
const IllegitimateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 8px;
`

const IllegitimateCheckbox = styled.input`
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary};
`

const IllegitimateLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const IllegitimateHint = styled.span`
  font-size: ${FONT.meta};
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
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

// ─── 배우자 반복 행 ──────────────────────────────────────────────────────────
const SpouseRowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SpouseEmptyHint = styled.div`
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 2px 0;
`

const SpouseRowCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.card};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'};
`

const SpouseRowMain = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const SpouseRowIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
  border-radius: 50%;
`

const SpouseRowSelect = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`

const SpouseRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: #fff;
    background: #ef4444;
  }
`

const SpouseRowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-left: 30px;
`

const SpouseDateField = styled.label`
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
`

const SpouseDateLabel = styled.span`
  font-size: ${FONT.eyebrow};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const SpouseDateInput = styled.input`
  font-size: ${FONT.meta};
  padding: 6px 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  color-scheme: ${({ theme }) => (theme.mode === 'dark' ? 'dark' : 'light')};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SpouseAddBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.primary};
  border-radius: ${RADIUS.pill};
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'};
  }
`
