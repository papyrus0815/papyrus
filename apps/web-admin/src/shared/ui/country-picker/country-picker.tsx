/**
 * 국가 선택 피커 — 공용 단일 구현.
 *
 * 예전엔 같은 일(현대/역사 탭·대륙·검색·시대 힌트·역사국가 인라인 등록)을 하는 모달이
 * 세 벌(CountrySelectModal 1,511줄 / CountrySearchModal 828줄 / AdvancedCountrySelectModal
 * 1,085줄) 있었고, 그중 두 벌은 Esc·포커스 트랩·aria-modal이 없었다. 셋은 이제 이 피커의
 * 얇은 어댑터다(호출부 무변경).
 *
 * 선택 방식(`mode`) — 피커마다 "다중 선택"의 뜻이 달랐던 것을 이름으로 갈랐다:
 * - `single`: 누르면 고르고 닫힌다.
 * - `toggle`: 누를 때마다 `onSelect`가 불린다(담기·빼기는 호출부가 정한다). 닫지 않는다.
 * - `batch`: 피커 안에서 담았다 뺐다 하다가 '선택 완료'에서 `onCommit`으로 한 번에 넘긴다.
 *   ✕·Esc·바깥 클릭으로 닫으면 아무것도 넘기지 않는다.
 *
 * **document.body로 포털**한다 — 사건 등록 폼 등 다른 모달 안에서 열리기 때문이다.
 * 부모 모달 DOM 안에 남으면 (1) 부모 셸의 `backdrop-filter`가 containing block을 만들어
 * `position: fixed`가 부모 박스에 갇히고(다크 테마에서만 재현), (2) Esc의 native 이벤트가
 * 부모 모달 root까지 버블해 **자식 대신 부모가 닫힌다**.
 */
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { FiArrowDown, FiArrowUp, FiCheck, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useContinents } from '@/features/continent/use-continents.hook'
import { getStateTypeLabel } from '@/entities/historical-country/lib/utils'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { formatCountryPeriod } from '@/shared/lib/country-period'
import {
  boostByHintYearRange,
  filterCountriesByQuery,
  formatHintYearRange,
  isHintYearRangeUsable,
  matchesHintYearRange,
  type CountryHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { glassCardMixin, scrollbarMixin } from '@/shared/styles/mixins'
import {
  HistoricalCountryCreateButton,
  HistoricalCountryCreateHost,
  HistoricalCountryCreateIcon,
  useCanCreateHistoricalCountry,
} from '@/shared/ui/country-picker-create/historical-country-create'
import { ModalOverlay } from '@/shared/ui/modal/modal.styles'
import { useModalBehavior } from '@/shared/ui/modal/use-modal-behavior.hook'

import {
  coerceSortField,
  sortHistoricalCountries,
  sortModernCountries,
  type CountryPickerHistoricalOption,
  type CountryPickerKind,
  type CountryPickerModernOption,
  type CountryPickerPick,
  type CountryPickerSortField,
} from './country-picker.lib'

interface CountryPickerBaseProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** 검색창 안내 문구 — 없으면 탭에 맞춘 기본 문구 */
  placeholder?: string
  modernCountries: CountryPickerModernOption[]
  historicalCountries: CountryPickerHistoricalOption[]
  /** 한쪽 탭만 보일 때(연결 현대국가·후임 역사국가 등). 기본 'all' */
  scope?: 'all' | CountryPickerKind
  /** 지금 걸려 있는 값 — 체크 표시·여는 탭 결정·batch 초기값에 쓰인다 */
  selectedIds?: string[]
  /**
   * 시대 힌트(F42) — 저작 대상의 부호 연도 범위(BC 음수). 겹치는 역사국가를
   * 상단으로 올릴 뿐 **걸러내지 않는다**(망명·유년기 등 경계 사례 보호).
   */
  hintYearRange?: CountryHintYearRange
  /**
   * 선택 해제 — 주어지면 고른 값이 있을 때 헤더에 해제 버튼이 뜬다(검토 IA-14).
   * '전체 국가'·'선택 안 함' 같은 sentinel 행을 목록에 끼우면 이름 정렬에 섞여 파묻히고
   * 반대 탭에서는 사라진다 — 탭·정렬과 무관한 헤더 액션이 정답이다.
   */
  onClearSelection?: () => void
  /** 해제 버튼 글자 — 기본 '선택 해제' */
  clearSelectionLabel?: string
  /** 열릴 때 미리 적용할 대륙 id(검토 IA-9) */
  initialContinentId?: string
  /** 대륙 이름 목록 — 없으면 공용 대륙 쿼리를 쓴다 */
  continentList?: { id: string; name: string }[]
}

export type CountryPickerProps = CountryPickerBaseProps &
  (
    | { mode: 'single' | 'toggle'; onSelect: (country: CountryPickerPick) => void }
    | { mode: 'batch'; onCommit: (countries: CountryPickerPick[]) => void }
  )

const EMPTY_IDS: string[] = []

export function CountryPicker(props: CountryPickerProps) {
  const {
    isOpen,
    onClose,
    title = '국가 선택',
    placeholder,
    modernCountries,
    historicalCountries,
    scope = 'all',
    selectedIds = EMPTY_IDS,
    hintYearRange,
    onClearSelection,
    clearSelectionLabel = '선택 해제',
    initialContinentId,
    continentList: continentListProp,
  } = props
  const playClick = useClickSound()
  const { data: continentQueryData } = useContinents()
  const continentList = continentListProp ?? continentQueryData

  const [kind, setKind] = useState<CountryPickerKind>(scope === 'historical' ? 'historical' : 'modern')
  /**
   * 대륙 필터 값은 **continentId**다(검토 IA-9) — 이름이 키면 호출 화면(id)과 값을
   * 주고받을 수 없고, 동명 대륙이 조용히 합쳐지고, 이름이 바뀌면 필터가 무효가 된다.
   */
  const [continentId, setContinentId] = useState<string>(initialContinentId ?? 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [sortBy, setSortBy] = useState<CountryPickerSortField>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [createOpen, setCreateOpen] = useState(false)
  /** batch 모드 — 피커 안에서만 담았다 뺐다 하는 초안. '선택 완료' 전엔 호출부가 모른다. */
  const [draftIds, setDraftIds] = useState<string[]>([])
  /** 인라인 등록으로 방금 만든 역사국가 — 목록 refetch 전에도 이름·종류를 잃지 않도록 보관 */
  const [createdCountries, setCreatedCountries] = useState<CountryPickerHistoricalOption[]>([])
  const wasOpenRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  /**
   * Esc·포커스 트랩·스크롤락·포커스 복원 일괄.
   *
   * `createOpen`(역사국가 등록 폼이 이 모달 *안에* 열린 상태)일 때는 Esc와 트랩을 끈다 —
   * 등록 폼 셸(CountryFormShell)이 Esc를 window에서 듣는데, 여기서 먼저 잡아
   * stopPropagation하면 **등록 폼 대신 피커가 닫힌다**.
   */
  useModalBehavior({
    isOpen,
    onClose,
    containerRef,
    closeOnEsc: !createOpen,
    trapFocus: !createOpen,
  })
  const canCreateHistorical = useCanCreateHistoricalCountry()

  /**
   * 열리는 순간에만 초기화 — 현재 선택이 역사국가면 역사 탭으로 연다(F19①).
   * 무조건 '현대'로 열면 역사국가 선택분이 보이지 않아 미선택으로 오인하게 된다.
   */
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      setCreateOpen(false)
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true
    const selectedInHistorical = historicalCountries.some((country) =>
      selectedIds.includes(country.id),
    )
    setKind(scope !== 'all' ? scope : selectedInHistorical ? 'historical' : 'modern')
    setContinentId(initialContinentId ?? 'all')
    setSearchTerm('')
    setDraftIds(selectedIds)
    setCreatedCountries([])
  }, [isOpen, scope, selectedIds, historicalCountries, initialContinentId])

  const effectiveSortBy = coerceSortField(kind, sortBy)

  const continentNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(continentList ?? []).forEach((continent) => {
      map.set(continent.id, continent.name)
    })
    return map
  }, [continentList])

  /**
   * 대륙 칩 — 현대 국가가 실제 속한 대륙만. **id를 값으로, 이름은 표시용**이다.
   * 이름을 못 찾은 대륙(참조 목록이 아직 안 옴)은 건너뛴다 — uuid를 보여 주느니 잠시 안 보이는 편이 낫다.
   */
  const continents = useMemo(() => {
    const seen = new Map<string, string>()
    modernCountries.forEach((country) => {
      if (!country.continentId || seen.has(country.continentId)) return
      const continentName = continentNameById.get(country.continentId)
      if (continentName) seen.set(country.continentId, continentName)
    })
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((left, right) =>
      left.name.localeCompare(right.name, 'ko'),
    )
  }, [modernCountries, continentNameById])

  const getContinentName = useCallback(
    (country: CountryPickerModernOption | CountryPickerHistoricalOption) =>
      country.continentId ? continentNameById.get(country.continentId) : undefined,
    [continentNameById],
  )

  const visibleModern = useMemo(() => {
    if (kind !== 'modern') return []
    // 검색 필드는 공용 스펙(name·enName·localName·isoCode + 대륙명) 단일 출처(F19②)
    const searched = filterCountriesByQuery(modernCountries, deferredSearchTerm, getContinentName)
    const narrowed =
      continentId === 'all'
        ? searched
        : searched.filter((country) => country.continentId === continentId)
    return sortModernCountries(narrowed, effectiveSortBy, sortOrder, continentNameById)
  }, [
    kind,
    modernCountries,
    deferredSearchTerm,
    getContinentName,
    continentId,
    effectiveSortBy,
    sortOrder,
    continentNameById,
  ])

  const visibleHistorical = useMemo(() => {
    if (kind !== 'historical') return []
    const searched = filterCountriesByQuery(historicalCountries, deferredSearchTerm, getContinentName)
    const sorted = sortHistoricalCountries(searched, effectiveSortBy, sortOrder)
    // 시대 힌트는 역사 탭에서만 — 상단 정렬만, 제외 없음(F42)
    return boostByHintYearRange(sorted, hintYearRange)
  }, [kind, historicalCountries, deferredSearchTerm, getContinentName, effectiveSortBy, sortOrder, hintYearRange])

  const visibleCount = kind === 'modern' ? visibleModern.length : visibleHistorical.length

  const mode = props.mode
  const isMulti = mode !== 'single'
  /** 체크 표시의 기준 — batch는 초안, 나머지는 호출부 값 */
  const checkedIds = mode === 'batch' ? draftIds : selectedIds

  /** id → 표시용 항목. 목록에 없으면(방금 등록한 국가) 등록분에서 찾는다 */
  const resolvePick = (id: string): (CountryPickerPick & { flag: string | null }) | null => {
    const modern = modernCountries.find((country) => country.id === id)
    if (modern) {
      return { id, name: modern.name, isHistorical: false, flag: modern.flagEmoji || '🌐' }
    }
    const historical =
      historicalCountries.find((country) => country.id === id) ??
      createdCountries.find((country) => country.id === id)
    if (historical) return { id, name: historical.name, isHistorical: true, flag: null }
    return null
  }

  const pick = (country: CountryPickerPick) => {
    playClick()
    if (props.mode === 'batch') {
      setDraftIds((previous) =>
        previous.includes(country.id)
          ? previous.filter((id) => id !== country.id)
          : [...previous, country.id],
      )
      return
    }
    props.onSelect(country)
    if (props.mode === 'single') onClose()
  }

  const commit = () => {
    if (props.mode !== 'batch') return
    playClick()
    const picks = draftIds
      .map(resolvePick)
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .map(({ id, name, isHistorical }) => ({ id, name, isHistorical }))
    props.onCommit(picks)
    onClose()
  }

  /** 인라인 등록(F20) — 생성 즉시 선택해 저작 흐름(입력값)을 끊지 않는다 */
  const handleCreated = (created: { id: string; name: string }) => {
    setCreateOpen(false)
    if (props.mode === 'batch') {
      setCreatedCountries((previous) =>
        previous.some((country) => country.id === created.id) ? previous : [...previous, created],
      )
      setDraftIds((previous) => (previous.includes(created.id) ? previous : [...previous, created.id]))
      return
    }
    props.onSelect({ id: created.id, name: created.name, isHistorical: true })
    if (props.mode === 'single') onClose()
  }

  const hintActive = isHintYearRangeUsable(hintYearRange)
  const showCreateCta = kind === 'historical' && canCreateHistorical
  const modernCountryOptions = useMemo(
    () => modernCountries.map(({ id, name }) => ({ id, name })),
    [modernCountries],
  )
  const historicalCountryOptions = useMemo(
    () => historicalCountries.map(({ id, name }) => ({ id, name })),
    [historicalCountries],
  )

  if (!isOpen) return null

  /**
   * 고른 국가 트레이 — 탭·검색·대륙 필터와 무관하게 **지금 담긴 것**을 늘 보여 주고 한 번에 뺀다.
   * 글자는 국기와 이름을 **한 문자열**로 — 목록 행 이름과 겹치지 않게.
   */
  const selectedEntries = checkedIds
    .map(resolvePick)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const renderRowCheck = (isChecked: boolean) => (
    /**
     * 체크는 **단일 선택에도** 붙는다(검토 IA-14) — 지금 걸려 있는 값을 정렬·스크롤 뒤에도
     * 확인할 수 있어야 한다. 고르지 않은 줄은 마우스를 올렸을 때만 '+'를 띄운다.
     */
    <RowCheck $selected={isChecked} aria-hidden="true">
      {isChecked ? <FiCheck size={13} /> : <FiPlus size={13} />}
    </RowCheck>
  )

  const modal = (
    <ModalOverlay onClick={onClose}>
      <ModalContent
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalHeaderActions>
            {onClearSelection && selectedIds.length > 0 && (
              <ClearSelectionButton
                type="button"
                onClick={() => {
                  playClick()
                  onClearSelection()
                }}
              >
                {clearSelectionLabel}
              </ClearSelectionButton>
            )}
            <ModalCloseButton type="button" aria-label="닫기" onClick={onClose}>
              <FiX />
            </ModalCloseButton>
          </ModalHeaderActions>
        </ModalHeader>

        {/* 조작 한 줄 — [현대|역사] 전환 · 검색 · 정렬 */}
        <Controls>
          {scope === 'all' && (
            <TypeSegment role="radiogroup" aria-label="국가 종류">
              {(
                [
                  ['modern', '현대 국가'],
                  ['historical', '역사적 국가'],
                ] as const
              ).map(([type, label]) => (
                <TypeSegmentBtn
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={kind === type}
                  $active={kind === type}
                  onClick={() => {
                    setKind(type)
                    setContinentId('all')
                  }}
                >
                  {label}
                </TypeSegmentBtn>
              ))}
            </TypeSegment>
          )}
          <SearchWrapper>
            <FiSearch aria-hidden="true" />
            <SearchInput
              type="text"
              placeholder={placeholder ?? (kind === 'modern' ? '국가·ISO 코드 검색' : '역사국가 검색')}
              aria-label="국가 검색"
              data-autofocus=""
              value={searchTerm}
              onChange={(changeEvent) => setSearchTerm(changeEvent.target.value)}
            />
          </SearchWrapper>
          <SortRow>
            <SortFieldSelect
              aria-label="정렬 기준"
              value={effectiveSortBy}
              onChange={(changeEvent) =>
                setSortBy(changeEvent.target.value as CountryPickerSortField)
              }
            >
              {kind === 'modern' ? (
                <>
                  <option value="name">이름순</option>
                  <option value="isoCode">ISO 코드순</option>
                  <option value="continent">대륙순</option>
                  <option value="population">인구순</option>
                  <option value="areaSqKm">면적순</option>
                </>
              ) : (
                <>
                  <option value="name">이름순</option>
                  <option value="startYear">시작년도순</option>
                </>
              )}
            </SortFieldSelect>
            <SortOrderBtn
              type="button"
              aria-label={sortOrder === 'asc' ? '오름차순 — 누르면 내림차순' : '내림차순 — 누르면 오름차순'}
              title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
            </SortOrderBtn>
          </SortRow>
        </Controls>

        {kind === 'modern' && continents.length > 0 && (
          <ContinentRow role="radiogroup" aria-label="대륙">
            {[{ id: 'all', name: '전체' }, ...continents].map((continent) => (
              <ContinentChip
                key={continent.id}
                type="button"
                role="radio"
                aria-checked={continentId === continent.id}
                $active={continentId === continent.id}
                onClick={() => setContinentId(continent.id)}
              >
                {continent.name}
              </ContinentChip>
            ))}
          </ContinentRow>
        )}

        {isMulti && selectedEntries.length > 0 && (
          <SelectedTray aria-label="고른 국가">
            {selectedEntries.map((entry) => (
              <SelectedChip key={entry.id}>
                <span>{entry.flag ? `${entry.flag} ${entry.name}` : entry.name}</span>
                <SelectedChipRemove
                  type="button"
                  aria-label={`${entry.name} 빼기`}
                  onClick={() =>
                    pick({ id: entry.id, name: entry.name, isHistorical: entry.isHistorical })
                  }
                >
                  <FiX size={12} />
                </SelectedChipRemove>
              </SelectedChip>
            ))}
          </SelectedTray>
        )}

        {/* 시대 힌트 안내 — '걸러내지 않았다'를 함께 알린다 (F42) */}
        {hintActive && kind === 'historical' && (
          <HintNotice>
            <HintChip>시대 일치</HintChip>
            {formatHintYearRange(hintYearRange)}에 존속한 국가를 위로
            올렸습니다. 나머지도 그대로 있습니다.
          </HintNotice>
        )}

        {/*
         * 목록 — 한 나라 = **한 줄 한 단**(국기 · 이름 · 메타 · 체크). 두 단 격자는 가나다순이
         * 지그재그로 읽혀 찾는 이름을 눈으로 따라가기 어려웠다.
         */}
        <CountryList>
          {kind === 'modern' &&
            visibleModern.map((country) => {
              const isChecked = checkedIds.includes(country.id)
              const meta = [
                country.isoCode,
                getContinentName(country),
                country.capital && `수도 ${country.capital}`,
              ]
              return (
                <CountryRow
                  key={country.id}
                  type="button"
                  aria-pressed={isChecked}
                  $selected={isChecked}
                  onClick={() => pick({ id: country.id, name: country.name, isHistorical: false })}
                >
                  <RowFlag aria-hidden="true">{country.flagEmoji || '🌐'}</RowFlag>
                  <RowName>{country.name}</RowName>
                  <RowMeta>{meta.filter(Boolean).join(' · ')}</RowMeta>
                  {renderRowCheck(isChecked)}
                </CountryRow>
              )
            })}
          {kind === 'historical' &&
            visibleHistorical.map((country) => {
              const isChecked = checkedIds.includes(country.id)
              const meta = [
                formatCountryPeriod(country),
                country.stateType ? getStateTypeLabel(country.stateType) : null,
                country.enName,
              ]
              return (
                <CountryRow
                  key={country.id}
                  type="button"
                  aria-pressed={isChecked}
                  $selected={isChecked}
                  onClick={() => pick({ id: country.id, name: country.name, isHistorical: true })}
                >
                  {/* 국기는 현대 국가만 — 역사국가 행마다 같은 🏛️를 세우면 반복만 된다 */}
                  <RowName>{country.name}</RowName>
                  {hintActive && matchesHintYearRange(country, hintYearRange) && (
                    <HintChip>시대 일치</HintChip>
                  )}
                  <RowMeta>{meta.filter(Boolean).join(' · ')}</RowMeta>
                  {renderRowCheck(isChecked)}
                </CountryRow>
              )
            })}
          {visibleCount === 0 && <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>}
          {/* F20: 없으면 폼을 떠나야 했던 흐름 — 여기서 등록하고 자동 선택 */}
          {showCreateCta && (
            <CreateCtaRow>
              <HistoricalCountryCreateButton
                type="button"
                $variant={visibleCount === 0 ? 'block' : 'inline'}
                onClick={() => {
                  playClick()
                  setCreateOpen(true)
                }}
              >
                <HistoricalCountryCreateIcon />
                {visibleCount === 0 ? '새 역사국가 등록' : '찾는 국가가 없나요? 새 역사국가 등록'}
              </HistoricalCountryCreateButton>
            </CreateCtaRow>
          )}
        </CountryList>

        {/* 여러 개를 고르는 모드는 고를 때마다 닫히지 않는다 — 끝났다는 동작이 있어야 한다 */}
        {isMulti && (
          <ModalFooter>
            <FooterSummary>
              {selectedEntries.length > 0
                ? `${selectedEntries.length}개 국가를 골랐습니다`
                : '누르면 담기고, 다시 누르면 빠집니다'}
            </FooterSummary>
            {mode === 'batch' ? (
              <DoneButton type="button" onClick={commit}>
                선택 완료
              </DoneButton>
            ) : (
              <DoneButton type="button" onClick={onClose}>
                완료
              </DoneButton>
            )}
          </ModalFooter>
        )}

        {/* 등록 모달 — ModalContent(stopPropagation) 안에 두어야 폼 클릭이
            오버레이 onClick={onClose}로 버블링돼 피커까지 닫히지 않는다 */}
        <HistoricalCountryCreateHost
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          modernCountries={modernCountryOptions}
          historicalCountries={historicalCountryOptions}
          onCreated={handleCreated}
        />
      </ModalContent>
    </ModalOverlay>
  )

  if (typeof document === 'undefined') return null

  return createPortal(modal, document.body)
}

// Styled Components
/* 표면은 공용 glassCardMixin(web-admin 모달 규약), 오버레이도 공용 ModalOverlay */
const ModalContent = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  width: 100%;
  max-width: 640px;
  height: min(720px, 86vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  outline: none;
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px 20px;
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 헤더 우측 액션 묶음 — 선택 해제(IA-14)와 닫기 ✕ */
const ModalHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const ClearSelectionButton = styled.button`
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ModalCloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/* [종류] [검색……] [정렬]. 좁으면 종류·정렬이 한 줄, 검색이 아래 한 줄을 통째로 쓴다. */
const Controls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 20px 12px;

  @media (max-width: 560px) {
    padding: 0 16px 12px;
  }
`

const TypeSegment = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  flex-shrink: 0;
`

const TypeSegmentBtn = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? (theme.mode === 'dark' ? '#27272a' : '#ffffff') : 'transparent'};
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0, 0, 0, 0.12)' : 'none')};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

const SearchWrapper = styled.div`
  flex: 1 1 200px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#111113' : '#fafafa')};
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
  }

  /* 좁으면 검색이 아래 한 줄을 통째로 쓴다(종류·정렬은 윗줄) */
  @media (max-width: 560px) {
    order: 3;
    flex-basis: 100%;
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  /* 포커스 표시는 감싼 칸(SearchWrapper:focus-within)이 한다 — 링이 안팎 두 겹이 되지 않게 */
  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }
`

const SortRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;

  @media (max-width: 560px) {
    margin-left: auto;
  }
`

const SortFieldSelect = styled.select`
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background-color: ${({ theme }) => (theme.mode === 'dark' ? '#111113' : '#ffffff')};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
`

const SortOrderBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#111113' : '#ffffff')};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 대륙 — 가로 칩 한 줄(넘치면 가로 스크롤) */
const ContinentRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 0 20px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
  /* 넘친 칩이 잘려 보이기만 하면 더 있다는 걸 모른다 — 오른쪽 끝을 흐려 이어짐을 알린다 */
  mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);

  &::-webkit-scrollbar {
    display: none;
  }
`

const ContinentChip = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border.default)};
  background: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : '#eef2ff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca') : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
`

/** 고른 국가 트레이 — 한 줄 칩, 넘치면 줄바꿈(높이 상한 안에서 스크롤) */
const SelectedTray = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 76px;
  overflow-y: auto;
  padding: 0 20px 12px;
  flex-shrink: 0;
`

const SelectedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(165, 180, 252, 0.14)' : '#eef2ff')};
  border: 1px solid transparent;
`

const SelectedChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: rgba(239, 68, 68, 0.1);
  }
`

/** 목록 — 한 단. 줄 사이 구분은 선 없이 간격·hover 면으로만 */
const CountryList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 10px 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  ${scrollbarMixin}
`

const RowCheck = styled.span<{ $selected: boolean }>`
  flex-shrink: 0;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: ${({ $selected, theme }) => ($selected ? '#ffffff' : theme.colors.text.tertiary)};
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : 'transparent')};
  opacity: ${({ $selected }) => ($selected ? 1 : 0)};
  transition: opacity 0.12s ease;
`

const CountryRow = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 42px;
  flex-shrink: 0;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  background: ${({ $selected, theme }) =>
    $selected ? (theme.mode === 'dark' ? 'rgba(165, 180, 252, 0.12)' : '#f5f7ff') : 'transparent'};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(165, 180, 252, 0.18)'
          : '#eef2ff'
        : theme.colors.background.tertiary};
  }
  &:hover ${RowCheck}, &:focus-visible ${RowCheck} {
    opacity: 1;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }
`

const RowFlag = styled.span`
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  font-size: 19px;
  line-height: 1;
`

const RowName = styled.span`
  flex-shrink: 1;
  min-width: 0;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

/* 이름 옆에 붙는 구별 단서(ISO·대륙 / 존속 기간·형태) — 남는 폭을 쓰고 넘치면 말줄임 */
const RowMeta = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

const FooterSummary = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DoneButton = styled.button`
  padding: 8px 20px;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    filter: brightness(1.06);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }
`

const HintNotice = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 20px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

const HintChip = styled.span`
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

/** 인라인 등록 CTA 행 (F20) */
const CreateCtaRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
`

const EmptyMessage = styled.div`
  padding: 48px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
`
