/**
 * 인물 등록/수정 폼의 "가족" 탭.
 * - 부/모/배우자 슬롯 + 배우자 메모.
 * - 각 슬롯 위에 "최근 등록한 인물" dashed 칩 행 (또 등록 모드에서 가계 일괄 등록 가속).
 * - 슬롯 클릭 시 PersonSelectModal — 검색·필터·"+ 새 인물" 인라인 등록.
 */
import React, { useEffect, useState } from 'react'

import { FiAlertCircle, FiChevronDown, FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonResponseDto } from '@/shared/api/persons'
import { MARRIAGE_RANK_OPTIONS } from '@/shared/lib/marriage-rank-labels'
import {
  buildPartialDateString,
  emptyPartialDateParts,
  hasAnyPartialDateInput,
  isPartialRangeInverted,
  parsePartialDateString,
  type PartialDateParts,
} from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Textarea,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import {
  AddRowBtn,
  FONT,
  FieldError,
  RADIUS,
  inputFocusMixin,
  mobileInputFontMixin,
} from '../_form-primitives'
import { InlineDateField } from './inline-date-field'
import {
  InlineSearchSelect,
  type SearchOption,
} from './inline-search-select'

/**
 * 배우자 폼 행 — 혼인일은 명시적 파츠(era/연/월/일) 상태.
 * (단일 문자열 왕복은 "월을 지우면 일이 소실·빈 행 BC 토글 무반응" 같은 편집 중간 상태를
 *  표현 못 해 파츠 상태로 정규화. 저장 시 partialPartsToDateInfo가 정밀도 사다리를 적용.)
 */
export interface SpouseFormRow {
  spouseId: string
  start: PartialDateParts
  end: PartialDateParts
  /** MarriageRank 토큰 또는 ''(미분류) */
  rank: string
  note: string | null
}

/**
 * 구형 draft 스냅샷(부분 정밀 문자열 marriageStartDate / 네이티브 date 'YYYY-MM-DD') 호환 —
 * 어떤 저장 형상이 와도 SpouseFormRow로 승격한다.
 */
export function normalizeSpouseRow(
  raw:
    | (Partial<SpouseFormRow> & {
        marriageStartDate?: string
        marriageEndDate?: string
        marriageRank?: string | null
      })
    | null
    | undefined,
): SpouseFormRow {
  return {
    spouseId: raw?.spouseId ?? '',
    start: raw?.start ?? parsePartialDateString(raw?.marriageStartDate),
    end: raw?.end ?? parsePartialDateString(raw?.marriageEndDate),
    rank: raw?.rank ?? raw?.marriageRank ?? '',
    note: raw?.note ?? null,
  }
}

export interface FamilySectionProps {
  fid: (key: string) => string
  // 가족 슬롯
  fatherId: string
  motherId: string
  /** 사생아·서출 — 가계도 카드 별표(*) 마커 */
  illegitimate: boolean
  /** 배우자 관계 반복 행 (배우자 + 혼인 시작/종료일·서열 + 메모) */
  spouseRows: SpouseFormRow[]
  setFatherId: (id: string) => void
  setMotherId: (id: string) => void
  setIllegitimate: (value: boolean) => void
  setSpouseRows: React.Dispatch<React.SetStateAction<SpouseFormRow[]>>
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
  /**
   * 배우자 혼인일 달력(DatePickerModal) 열림 여부를 부모에 보고 — 열린 채로 ⌘Enter가
   * 폼을 뒤에서 제출하지 않도록 부모 anyModalOpen에 포함시키기 위함(affiliation과 동일 패턴).
   */
  onDateModalOpenChange?: (open: boolean) => void
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
  onDateModalOpenChange,
}: FamilySectionProps) {
  const handleCreatedPerson = (p: PersonResponseDto) =>
    setPersons((prev) => [...prev, p])

  // ─── 배우자 반복 행 ──────────────────────────────────────────────────────────
  /** "새 인물 등록" 모달이 채울 대상 행 인덱스 (null = 열려있지 않음/미지정). */
  const [pendingSpouseRowIndex, setPendingSpouseRowIndex] = useState<number | null>(null)
  /** 이미 배우자로 지정된 id들 — 옵션·모달 exclude 및 중복 방지용. */
  const usedSpouseIds = spouseRows.map((row) => row.spouseId).filter(Boolean)
  /**
   * 혼인 정보(혼인일·메모) disclosure — spouseId별로 수동 펼침 상태를 보관.
   * 배우자만 고르는 흔한 경우 첫인상 잡음(날짜피커 2개 + textarea)을 줄이려 기본 접힘.
   * 이미 입력된 메타가 있으면(수정 로드 포함) 항상 노출해 데이터를 숨기지 않는다.
   * index가 아니라 spouseId로 키잉해 행 삭제·정렬로 인덱스가 밀려도 펼침이 엉키지 않는다.
   */
  const [openMetaSpouseIds, setOpenMetaSpouseIds] = useState<Set<string>>(new Set())
  /** 달력 보조 모달 대상 — {행, 시작/종료}. null = 닫힘 */
  const [spouseDateModal, setSpouseDateModal] = useState<{
    index: number
    side: 'start' | 'end'
  } | null>(null)
  // 혼인일 달력 열림/닫힘을 부모에 보고 — 열린 채로 ⌘Enter 조기 제출 차단(anyModalOpen 게이트).
  useEffect(() => {
    onDateModalOpenChange?.(spouseDateModal !== null)
  }, [spouseDateModal, onDateModalOpenChange])
  const rowHasMeta = (row: SpouseFormRow) =>
    Boolean(
      hasAnyPartialDateInput(row.start) ||
        hasAnyPartialDateInput(row.end) ||
        row.rank ||
        (row.note && row.note.trim()),
    )
  const toggleMetaOpen = (spouseId: string) =>
    setOpenMetaSpouseIds((prev) => {
      const next = new Set(prev)
      if (next.has(spouseId)) next.delete(spouseId)
      else next.add(spouseId)
      return next
    })

  const emptySpouseRow = (): SpouseFormRow => ({
    spouseId: '',
    start: emptyPartialDateParts(),
    end: emptyPartialDateParts(),
    rank: '',
    note: null,
  })
  const addSpouseRow = () => setSpouseRows((prev) => [...prev, emptySpouseRow()])
  const updateSpouseRow = (index: number, patch: Partial<SpouseFormRow>) =>
    setSpouseRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...normalizeSpouseRow(row), ...patch } : row,
      ),
    )
  const removeSpouseRow = (index: number) =>
    setSpouseRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
  /** PersonSelectModal 선택/생성 결과를 pending 행에 채운다(인덱스 없으면 중복 아닐 때 추가). */
  const fillSpouseFromModal = (id: string) => {
    setSpouseRows((prev) => {
      if (pendingSpouseRowIndex != null && pendingSpouseRowIndex < prev.length)
        return prev.map((row, rowIndex) =>
          rowIndex === pendingSpouseRowIndex
            ? { ...normalizeSpouseRow(row), spouseId: id }
            : row,
        )
      if (prev.some((row) => row.spouseId === id)) return prev
      return [...prev, { ...emptySpouseRow(), spouseId: id }]
    })
  }
  /** 혼인일 한 파트 갱신 — 파츠 상태 직접 패치(문자열 왕복 없음: 편집 중간 상태 보존). */
  const patchSpouseDateParts = (
    index: number,
    side: 'start' | 'end',
    patch: Partial<PartialDateParts>,
  ) => {
    setSpouseRows((prev) =>
      prev.map((raw, rowIndex) => {
        if (rowIndex !== index) return raw
        const row = normalizeSpouseRow(raw)
        return { ...row, [side]: { ...row[side], ...patch } }
      }),
    )
    markDirty()
  }

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
          prev.some((row) => row.spouseId === id)
            ? prev
            : [...prev, { ...emptySpouseRow(), spouseId: id }],
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
                    // 부/모는 단일 슬롯이라 기존 값을 덮어쓴다 — 무성 교체 대신 지정 결과를 알림.
                    notify.success(`${getPersonDisplayName(p)} · ${slot.label}`)
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
            {spouseRows.map((rawRow, index) => {
              // 구형 draft 스냅샷 방어 — 어떤 저장 형상이 와도 파츠 행으로 승격
              const row = normalizeSpouseRow(rawRow)
              // 역전 검증 — 공통 정밀도까지만 보수 비교(연만 아는 종료일 오탐 방지, BC 안전)
              const dateInverted = isPartialRangeInverted(row.start, row.end)
              // 배우자를 고른 뒤에만 혼인 메타(혼인일·메모) 노출 — 빈 새 행 잡음 감소.
              // 이미 값이 있으면(수정 로드 포함) 항상 노출해 데이터를 숨기지 않는다.
              const showMeta =
                Boolean(row.spouseId) && (rowHasMeta(row) || openMetaSpouseIds.has(row.spouseId))
              const dateErrorId = fid(`spouse-${index}-date-error`)
              return (
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
                    onClick={async () => {
                      // 입력된 내용이 있으면 무경고 삭제 대신 확인 — 혼인일·서열·메모 유실 방지.
                      const hasContent = Boolean(row.spouseId || rowHasMeta(row))
                      if (hasContent) {
                        const ok = await confirm({
                          title: '배우자 행 삭제',
                          message: `${index + 1}번 배우자 행을 삭제할까요? 입력한 혼인일·메모도 함께 삭제됩니다.`,
                          confirmLabel: '삭제',
                          danger: true,
                        })
                        if (!ok) return
                      }
                      removeSpouseRow(index)
                      markDirty()
                    }}
                  >
                    ×
                  </SpouseRemoveBtn>
                </SpouseRowMain>
                {showMeta ? (
                  <>
                    <SpouseRowMeta>
                      {/* 혼인일 — 생몰일과 동일한 era/연/월/일 입력(연도만·BC 지원). 월·일은 비워도 된다. */}
                      <SpouseMetaField>
                        <SpouseDateLabel>혼인 시작</SpouseDateLabel>
                        <InlineDateField
                          ariaLabel={`배우자 ${index + 1} 혼인 시작일`}
                          era={row.start.era}
                          year={row.start.year}
                          month={row.start.month}
                          day={row.start.day}
                          onEra={(era) => patchSpouseDateParts(index, 'start', { era })}
                          onYear={(value) => patchSpouseDateParts(index, 'start', { year: value })}
                          onMonth={(value) => patchSpouseDateParts(index, 'start', { month: value })}
                          onDay={(value) => patchSpouseDateParts(index, 'start', { day: value })}
                          onOpenPicker={() => setSpouseDateModal({ index, side: 'start' })}
                        />
                      </SpouseMetaField>
                      <SpouseMetaField>
                        <SpouseDateLabel>혼인 종료</SpouseDateLabel>
                        <InlineDateField
                          ariaLabel={`배우자 ${index + 1} 혼인 종료일`}
                          era={row.end.era}
                          year={row.end.year}
                          month={row.end.month}
                          day={row.end.day}
                          onEra={(era) => patchSpouseDateParts(index, 'end', { era })}
                          onYear={(value) => patchSpouseDateParts(index, 'end', { year: value })}
                          onMonth={(value) => patchSpouseDateParts(index, 'end', { month: value })}
                          onDay={(value) => patchSpouseDateParts(index, 'end', { day: value })}
                          onOpenPicker={() => setSpouseDateModal({ index, side: 'end' })}
                          error={dateInverted}
                          ariaDescribedBy={dateInverted ? dateErrorId : undefined}
                        />
                      </SpouseMetaField>
                      {/* 혼인 서열/형태 — 정실·계비·후궁 등 (미분류 허용) */}
                      <SpouseMetaField>
                        <SpouseDateLabel>서열</SpouseDateLabel>
                        <SpouseRankSelectWrap>
                          <SpouseRankSelect
                            aria-label={`배우자 ${index + 1} 혼인 서열`}
                            value={row.rank}
                            onChange={(event) => {
                              updateSpouseRow(index, { rank: event.target.value })
                              markDirty()
                            }}
                          >
                            <option value="">미분류</option>
                            {MARRIAGE_RANK_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SpouseRankSelect>
                          <SpouseRankCaret>
                            <FiChevronDown size={14} />
                          </SpouseRankCaret>
                        </SpouseRankSelectWrap>
                      </SpouseMetaField>
                    </SpouseRowMeta>
                    {dateInverted && (
                      <SpouseDateError id={dateErrorId} role="alert">
                        <FiAlertCircle size={13} />
                        혼인 종료일이 시작일보다 빠릅니다.
                      </SpouseDateError>
                    )}
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
                    {/* 빈 채로 펼친 행은 다시 접을 수 있게 — 값이 있으면 데이터 은닉 방지차 미노출. */}
                    {!rowHasMeta(row) && (
                      <SpouseMetaToggle
                        type="button"
                        aria-expanded={showMeta}
                        onClick={() => toggleMetaOpen(row.spouseId)}
                      >
                        혼인 정보 접기
                      </SpouseMetaToggle>
                    )}
                  </>
                ) : (
                  row.spouseId && (
                    <SpouseMetaToggle
                      type="button"
                      aria-expanded={showMeta}
                      onClick={() => toggleMetaOpen(row.spouseId)}
                    >
                      <FiPlus size={13} /> 혼인 정보(혼인일·서열·메모) 추가
                    </SpouseMetaToggle>
                  )
                )}
              </SpouseRowCard>
              )
            })}
            <AddRowBtn
              type="button"
              onClick={() => {
                addSpouseRow()
                markDirty()
              }}
            >
              <FiPlus size={16} />
              배우자 추가
            </AddRowBtn>
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
      {/* 배우자 혼인일 달력 보조 — AD/BC 토글 지원, 선택 결과('-YYYY-MM-DD')를 파츠로 반영. */}
      {spouseDateModal &&
        (() => {
          const targetRow = normalizeSpouseRow(spouseRows[spouseDateModal.index])
          const targetParts =
            spouseDateModal.side === 'start' ? targetRow.start : targetRow.end
          // 부분 정밀(연만·연월) 값은 달력 초기값으로 못 쓴다 — 완전일자일 때만 전달
          const initialDate =
            targetParts.year && targetParts.month && targetParts.day
              ? buildPartialDateString(targetParts)
              : undefined
          return (
            <DatePickerModal
              isOpen
              onSelect={(date) => {
                patchSpouseDateParts(
                  spouseDateModal.index,
                  spouseDateModal.side,
                  parsePartialDateString(date),
                )
                setSpouseDateModal(null)
              }}
              onClose={() => setSpouseDateModal(null)}
              initialDate={initialDate}
            />
          )
        })()}
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
  gap: 6px;
`

/** 父/母/配 mini 슬롯 버튼 — 한 인물을 빠르게 슬롯에 꽂는 inline action.
 *  글리프는 22px로 유지하되 ::before 투명 히트박스로 실제 탭 영역을 26px(≥WCAG 2.5.8)로 확대. */
const RecentSlotBtn = styled.button`
  position: relative;
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

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
  }

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
    background: ${({ theme }) => theme.colors.alert.danger.fg};
  }
`

/** 혼인 정보(혼인일·메모) disclosure 토글 — 경량 ghost 텍스트(카드-인-카드 금지, canon). */
const SpouseMetaToggle = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 30px;
  @media (max-width: 480px) {
    margin-left: 0;
  }
  padding: 2px 4px;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const SpouseRowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-left: 30px;

  /* 좁은 폰: 30px 들여쓰기가 폭을 크게 잠식 → 회수 */
  @media (max-width: 480px) {
    padding-left: 0;
  }
`

/** 혼인 메타 필드(혼인일·서열) — 라벨 + 컨트롤 세로 스택. label 태그 아님(내부에 버튼 여럿). */
const SpouseMetaField = styled.div`
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

const SpouseRankSelectWrap = styled.div`
  position: relative;
  width: 118px;
`

const SpouseRankSelect = styled.select`
  width: 100%;
  appearance: none;
  padding: 7px 26px 7px 8px;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  ${mobileInputFontMixin}
  ${({ theme }) => inputFocusMixin(theme)}
`

const SpouseRankCaret = styled.span`
  position: absolute;
  top: 50%;
  right: 7px;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
`

/** 혼인일 역전 오류 — 공용 FieldError(아이콘·톤 통일) + 배우자 카드 들여쓰기(30px). */
const SpouseDateError = styled(FieldError)`
  margin-left: 30px;
  @media (max-width: 480px) {
    margin-left: 0;
  }
`

