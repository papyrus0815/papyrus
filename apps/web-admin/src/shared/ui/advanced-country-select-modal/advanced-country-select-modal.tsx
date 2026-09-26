/**
 * 고급 국가 선택 모달 - 좌측 필터 + 우측 리스트
 * 인물 페이지와 동일한 스타일
 *
 * **document.body로 포털**한다 — 사건 등록 폼 등 다른 모달 안에서 열리기 때문이다.
 * 부모 모달 DOM 안에 남으면 (1) 부모 셸의 `backdrop-filter`가 containing block을 만들어
 * `position: fixed`가 부모 박스에 갇히고(다크 테마에서만 재현), (2) Esc의 native 이벤트가
 * 부모 모달 root까지 버블해 **자식 대신 부모가 닫힌다**.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { FiArrowDown, FiArrowUp, FiCheck, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useContinents } from '@/features/continent/use-continents.hook'
import { getStateTypeLabel } from '@/entities/historical-country/lib/utils'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { formatCountryPeriod, toSignedYear } from '@/shared/lib/country-period'
import {
  boostByHintYearRange,
  filterCountriesByQuery,
  formatHintYearRange,
  isHintYearRangeUsable,
  matchesHintYearRange,
  type CountryHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { Z_INDEX } from '@/shared/styles/z-index'
import { useModalBehavior } from '@/shared/ui/modal/use-modal-behavior.hook'
import {
  HistoricalCountryCreateButton,
  HistoricalCountryCreateHost,
  HistoricalCountryCreateIcon,
  useCanCreateHistoricalCountry,
} from '@/shared/ui/country-picker-create/historical-country-create'

/**
 * 호출부에서 "전체 국가" 같은 sentinel 옵션을 첫 항목으로 끼워 넣을 수 있도록
 * 일부 필드만 strict하게 요구하고 나머지는 optional로 받음.
 * 모달 내부 렌더는 모든 부가 필드(continentId/population 등)를 nullable check함.
 */
type ModernCountryOption = Partial<CountryResponseDto> &
  Pick<CountryResponseDto, 'id' | 'name'>

interface AdvancedCountrySelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => void
  modernCountries: ModernCountryOption[]
  historicalCountries: HistoricalCountryResponseDto[]
  selectedCountryIds: string[] // 복수 선택용
  multiSelect?: boolean
  title?: string
  /**
   * 시대 힌트(F42) — 저작 대상의 부호 연도 범위(BC 음수). 겹치는 역사국가를
   * 상단으로 올릴 뿐 **걸러내지 않는다**(망명·유년기 등 경계 사례 보호).
   */
  hintYearRange?: CountryHintYearRange
  /**
   * 선택 해제 — 주어지면 헤더에 '선택 해제' 버튼이 뜬다(검토 IA-14).
   *
   * 예전엔 호출부가 `{ id: 'all', name: '전체 국가' }` sentinel을 `modernCountries`
   * 첫 항목으로 끼워 넣었는데, 목록이 `localeCompare(ko)`로 정렬되므로 그 카드는
   * **'ㅈ' 구간 한복판**에 파묻혔다(70여 개 중 40번째쯤). 게다가 역사 탭에는 그 카드가
   * 아예 없어 역사국가를 고른 사람에게는 해제 수단 자체가 없었다.
   * 탭·정렬과 무관한 헤더 액션이 정답이다.
   */
  onClearSelection?: () => void
  /**
   * 열릴 때 미리 적용할 대륙(검토 IA-9).
   *
   * 이 모달은 자체 대륙 필터를 갖는데 호출 화면의 대륙 필터와 단절돼 있었다. 게다가
   * 내부 키가 **대륙 이름**이고 페이지는 **continentId**라, 값을 넘겨받을 방법도 없었다.
   * 내부 키를 id로 통일해 시딩을 가능하게 했다.
   */
  initialContinentId?: string
}

export const AdvancedCountrySelectModal: React.FC<
  AdvancedCountrySelectModalProps
> = ({
  isOpen,
  onClose,
  onSelect,
  modernCountries,
  historicalCountries,
  selectedCountryIds,
  multiSelect = true,
  title = '국가 선택',
  hintYearRange,
  onClearSelection,
  initialContinentId,
}) => {
  const playClick = useClickSound()
  // 대륙 이름 표시용 — CountryResponseDto에는 continentId만 있어 이름은 대륙 목록에서 매핑
  const { data: continentList } = useContinents()
  const [countryType, setCountryType] = useState<'modern' | 'historical'>(
    'modern',
  )
  /**
   * 대륙 필터의 값은 **continentId**다(검토 IA-9). 예전엔 대륙 *이름*이 키여서
   * ⑴ 호출 화면(페이지 필터는 id)과 값을 주고받을 수 없었고 ⑵ 동명 대륙이 생기면
   * 조용히 합쳐지며 ⑶ 이름이 바뀌면 필터가 통째로 무효가 됐다.
   */
  const [selectedContinentId, setSelectedContinentId] = useState<string>(
    () => initialContinentId ?? 'all',
  )
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
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
   * 열릴 때 현재 선택이 역사국가면 역사 탭으로 연다(F19①).
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
    const selectedInHistorical =
      selectedCountryIds.length > 0 &&
      historicalCountries.some((country) =>
        selectedCountryIds.includes(country.id),
      )
    setCountryType(selectedInHistorical ? 'historical' : 'modern')
  }, [isOpen, selectedCountryIds, historicalCountries])
  const [sortBy, setSortBy] = useState<
    'name' | 'isoCode' | 'continent' | 'startYear' | 'population' | 'areaSqKm'
  >('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (
      countryType === 'historical' &&
      (sortBy === 'isoCode' ||
        sortBy === 'continent' ||
        sortBy === 'population' ||
        sortBy === 'areaSqKm')
    ) {
      setSortBy('name')
    }
    if (countryType === 'modern' && sortBy === 'startYear') {
      setSortBy('name')
    }
  }, [countryType, sortBy])

  // continentId → 대륙 이름 매핑
  const continentNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(continentList ?? []).forEach((continent) => {
      map.set(continent.id, continent.name)
    })
    return map
  }, [continentList])

  /**
   * 대륙 목록 — 현대 국가가 실제 속한 대륙만. **id를 값으로, 이름은 표시용**이다.
   * 이름을 못 찾은 대륙(참조 목록이 아직 안 옴)은 id를 그대로 쓰지 않고 건너뛴다 —
   * 사용자에게 uuid를 보여 주느니 그 대륙만 잠시 안 보이는 편이 낫다.
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

  // 필터링 + 정렬된 국가 목록
  const filteredCountries = useMemo(() => {
    const countries: (ModernCountryOption | HistoricalCountryResponseDto)[] =
      countryType === 'modern' ? modernCountries : historicalCountries

    // 검색 필드는 피커 3종 공용 스펙(name·enName·localName·isoCode + 대륙명)으로 통일(F19②)
    const searched = filterCountriesByQuery(
      countries,
      countrySearchTerm,
      (country) => {
        const continentId = (country as ModernCountryOption).continentId
        return continentId ? continentNameById.get(continentId) : undefined
      },
    )

    const filtered =
      countryType === 'modern' && selectedContinentId !== 'all'
        ? searched.filter(
            (country) =>
              (country as ModernCountryOption).continentId ===
              selectedContinentId,
          )
        : searched

    const mult = sortOrder === 'asc' ? 1 : -1
    const sorted = [...filtered].sort((left, right) => {
      if (countryType === 'modern') {
        const ma = left as CountryResponseDto
        const mb = right as CountryResponseDto
        if (sortBy === 'name') {
          return mult * ma.name.localeCompare(mb.name, 'ko')
        }
        if (sortBy === 'isoCode') {
          const va = ma.isoCode ?? ''
          const vb = mb.isoCode ?? ''
          return mult * va.localeCompare(vb)
        }
        if (sortBy === 'continent') {
          const va =
            (ma.continentId ? continentNameById.get(ma.continentId) : '') ?? ''
          const vb =
            (mb.continentId ? continentNameById.get(mb.continentId) : '') ?? ''
          return (
            mult * va.localeCompare(vb, 'ko') ||
            mult * ma.name.localeCompare(mb.name, 'ko')
          )
        }
        if (sortBy === 'population') {
          const parseNum = (v: string | null | undefined) => {
            if (v == null || v === '') return -1
            const n = Number(String(v).replace(/[^0-9.-]/g, ''))
            return Number.isFinite(n) ? n : -1
          }
          const va = parseNum(ma.population)
          const vb = parseNum(mb.population)
          return mult * (va - vb) || mult * ma.name.localeCompare(mb.name, 'ko')
        }
        if (sortBy === 'areaSqKm') {
          const va = ma.areaSqKm ?? -1
          const vb = mb.areaSqKm ?? -1
          return mult * (va - vb) || mult * ma.name.localeCompare(mb.name, 'ko')
        }
      } else {
        const ha = left as HistoricalCountryResponseDto
        const hb = right as HistoricalCountryResponseDto
        if (sortBy === 'startYear') {
          // BC는 부호 연도(음수)로 — raw startYear는 기원전 753년을 AD 753으로 취급했다
          const va = toSignedYear(ha.startEra, ha.startYear)
          const vb = toSignedYear(hb.startEra, hb.startYear)
          // 시작 미상은 정렬 방향과 무관하게 항상 뒤로 (0 폴백 금지)
          if (va == null && vb == null) {
            return mult * ha.name.localeCompare(hb.name, 'ko')
          }
          if (va == null) return 1
          if (vb == null) return -1
          return mult * (va - vb) || mult * ha.name.localeCompare(hb.name, 'ko')
        }
        return mult * ha.name.localeCompare(hb.name, 'ko')
      }
      return 0
    })

    // 시대 힌트는 역사 탭에서만 의미가 있다 — 상단 정렬만, 제외 없음(F42)
    if (countryType !== 'historical') return sorted
    // 캐스팅 사유: 역사 탭 확정 지점인데 배열 타입이 union이라
    // CountryPeriodShape(전 필드 옵셔널) weak-type 검사에 걸린다.
    return boostByHintYearRange(
      sorted as HistoricalCountryResponseDto[],
      hintYearRange,
    )
  }, [
    countryType,
    modernCountries,
    historicalCountries,
    countrySearchTerm,
    hintYearRange,
    selectedContinentId,
    continentNameById,
    sortBy,
    sortOrder,
  ])

  const handleCountryClick = (
    country: CountryResponseDto | HistoricalCountryResponseDto,
  ) => {
    playClick()
    onSelect({
      id: country.id,
      name: country.name,
      isHistorical: countryType === 'historical',
    })

    // 단일 선택 모드면 모달 닫기
    if (!multiSelect) {
      onClose()
    }
  }

  /** 인라인 등록(F20) — 생성 즉시 선택해 저작 흐름(입력값)을 끊지 않는다 */
  const handleCreated = (created: { id: string; name: string }) => {
    setCreateOpen(false)
    onSelect({ id: created.id, name: created.name, isHistorical: true })
    if (!multiSelect) onClose()
  }

  const hintActive = isHintYearRangeUsable(hintYearRange)
  const showCreateCta = countryType === 'historical' && canCreateHistorical
  const modernCountryOptions = modernCountries.map(({ id, name }) => ({
    id,
    name,
  }))
  const historicalCountryOptions = historicalCountries.map(({ id, name }) => ({
    id,
    name,
  }))

  if (!isOpen) return null

  /**
   * 고른 국가 트레이 — 탭·검색·대륙 필터와 무관하게 **지금 담긴 것**을 늘 보여 주고 한 번에 뺀다.
   * 예전엔 고른 국가가 카드 격자 속 체크 배지로만 남아, 탭을 바꾸거나 스크롤하면 무엇을 골랐는지
   * 확인할 수 없었다. 글자는 국기와 이름을 **한 문자열**로 — 목록 행 이름과 겹치지 않게.
   */
  const selectedEntries = selectedCountryIds
    .map((id) => {
      const modern = modernCountries.find((country) => country.id === id)
      if (modern)
        return { id, name: modern.name, flag: modern.flagEmoji || '🌐', isHistorical: false }
      const historical = historicalCountries.find((country) => country.id === id)
      if (historical)
        return { id, name: historical.name, flag: '🏛️', isHistorical: true }
      return null
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const modal = (
    <Modal onClick={onClose}>
      <ModalContent
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle>
            {title}
            {multiSelect && selectedEntries.length > 0 && (
              <SelectedCount>{selectedEntries.length}개 선택</SelectedCount>
            )}
          </ModalTitle>
          <ModalHeaderActions>
            {/**
             * 선택 해제(검토 IA-14) — **탭·정렬과 무관한** 자리다.
             * sentinel 카드로 두던 시절엔 이름 정렬에 섞여 'ㅈ' 구간에 파묻히고,
             * 역사 탭에는 아예 없어 해제할 방법이 사라졌다.
             */}
            {onClearSelection && selectedCountryIds.length > 0 && (
              <ClearSelectionButton
                type="button"
                onClick={() => {
                  playClick()
                  onClearSelection()
                }}
              >
                선택 해제
              </ClearSelectionButton>
            )}
            <ModalCloseButton type="button" aria-label="닫기" onClick={onClose}>
              <FiX />
            </ModalCloseButton>
          </ModalHeaderActions>
        </ModalHeader>

        {/*
         * 조작 한 줄 — [현대|역사] 전환 · 검색 · 정렬. 예전엔 전환이 좌측 사이드바의 라디오였고
         * 대륙 목록까지 세로로 쌓여 목록 폭 200px을 상시 먹었다.
         */}
        <Controls>
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
                aria-checked={countryType === type}
                $active={countryType === type}
                onClick={() => {
                  setCountryType(type)
                  setSelectedContinentId('all')
                }}
              >
                {label}
              </TypeSegmentBtn>
            ))}
          </TypeSegment>
          <SearchWrapper>
            <FiSearch aria-hidden="true" />
            <SearchInput
              type="text"
              placeholder={countryType === 'modern' ? '국가·ISO 코드 검색' : '역사국가 검색'}
              aria-label="국가 검색"
              data-autofocus=""
              value={countrySearchTerm}
              onChange={(e) => setCountrySearchTerm(e.target.value)}
            />
          </SearchWrapper>
          <SortRow>
            <SortFieldSelect
              aria-label="정렬 기준"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | 'name'
                    | 'isoCode'
                    | 'continent'
                    | 'startYear'
                    | 'population'
                    | 'areaSqKm',
                )
              }
            >
              {countryType === 'modern' ? (
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

        {countryType === 'modern' && continents.length > 0 && (
          <ContinentRow role="radiogroup" aria-label="대륙">
            {[{ id: 'all', name: '전체' }, ...continents].map((continent) => (
              <ContinentChip
                key={continent.id}
                type="button"
                role="radio"
                aria-checked={selectedContinentId === continent.id}
                $active={selectedContinentId === continent.id}
                onClick={() => setSelectedContinentId(continent.id)}
              >
                {continent.name}
              </ContinentChip>
            ))}
          </ContinentRow>
        )}

        {multiSelect && selectedEntries.length > 0 && (
          <SelectedTray aria-label="고른 국가">
            {selectedEntries.map((entry) => (
              <SelectedChip key={entry.id}>
                <span>{`${entry.flag} ${entry.name}`}</span>
                <SelectedChipRemove
                  type="button"
                  aria-label={`${entry.name} 빼기`}
                  onClick={() => {
                    playClick()
                    onSelect({ id: entry.id, name: entry.name, isHistorical: entry.isHistorical })
                  }}
                >
                  <FiX size={12} />
                </SelectedChipRemove>
              </SelectedChip>
            ))}
          </SelectedTray>
        )}

        {/* 시대 힌트 안내 — '걸러내지 않았다'를 함께 알린다 (F42) */}
        {hintActive && countryType === 'historical' && (
          <HintNotice>
            <HintChip>시대 일치</HintChip>
            {formatHintYearRange(hintYearRange)}에 존속한 국가를 위로
            올렸습니다. 나머지도 그대로 있습니다.
          </HintNotice>
        )}

        {/*
         * 목록 — 한 나라 = 한 줄(국기 · 이름 · 메타 한 줄 · 체크). 예전 카드는 메타를 여섯 줄
         * (현지명·ISO·대륙·수도·인구·면적)로 쌓아 한 화면에 15장 남짓이었다. 고르는 데 필요한 건
         * 이름이고, 동명·혼동 구별에 필요한 최소(ISO·대륙 / 존속기간·형태)만 한 줄로 남긴다.
         */}
        <CountryList>
          {filteredCountries.map((country) => {
            const isSelected = selectedCountryIds.includes(country.id)
            const modern = country as CountryResponseDto
            const historical = country as HistoricalCountryResponseDto
            const continentName = modern.continentId
              ? continentNameById.get(modern.continentId)
              : undefined
            const meta =
              countryType === 'modern'
                ? [modern.isoCode, continentName, modern.capital && `수도 ${modern.capital}`]
                : [
                    formatCountryPeriod(historical),
                    historical.stateType ? getStateTypeLabel(historical.stateType) : null,
                    historical.enName,
                  ]
            return (
              <CountryRow
                key={country.id}
                type="button"
                aria-pressed={isSelected}
                $selected={isSelected}
                onClick={() => handleCountryClick(country)}
              >
                <RowFlag aria-hidden="true">
                  {countryType === 'modern' ? modern.flagEmoji || '🌐' : '🏛️'}
                </RowFlag>
                <RowText>
                  <RowName>
                    <span>{country.name}</span>
                    {countryType === 'historical' &&
                      hintActive &&
                      matchesHintYearRange(historical, hintYearRange) && (
                        <HintChip>시대 일치</HintChip>
                      )}
                  </RowName>
                  <RowMeta>{meta.filter(Boolean).join(' · ')}</RowMeta>
                </RowText>
                {/**
                 * 체크는 **단일 선택에도** 붙는다(검토 IA-14) — 지금 걸려 있는 값을
                 * 정렬·스크롤 뒤에도 확인할 수 있어야 한다.
                 */}
                <RowCheck $selected={isSelected} aria-hidden="true">
                  {isSelected && <FiCheck size={13} />}
                </RowCheck>
              </CountryRow>
            )
          })}
          {filteredCountries.length === 0 && (
            <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
          )}
          {/* F20: 없으면 폼을 떠나야 했던 흐름 — 여기서 등록하고 자동 선택 */}
          {showCreateCta && (
            <CreateCtaRow>
              <HistoricalCountryCreateButton
                type="button"
                $variant={filteredCountries.length === 0 ? 'block' : 'inline'}
                onClick={() => {
                  playClick()
                  setCreateOpen(true)
                }}
              >
                <HistoricalCountryCreateIcon />
                {filteredCountries.length === 0
                  ? '새 역사국가 등록'
                  : '찾는 국가가 없나요? 새 역사국가 등록'}
              </HistoricalCountryCreateButton>
            </CreateCtaRow>
          )}
        </CountryList>

        {/* 다중 선택은 고를 때마다 닫히지 않는다 — 끝났다는 동작이 있어야 한다(예전엔 ✕뿐) */}
        {multiSelect && (
          <ModalFooter>
            <FooterSummary>
              {selectedEntries.length > 0
                ? `${selectedEntries.length}개 국가를 골랐습니다`
                : '누르면 담기고, 다시 누르면 빠집니다'}
            </FooterSummary>
            <DoneButton type="button" onClick={onClose}>
              완료
            </DoneButton>
          </ModalFooter>
        )}

        {/* 등록 모달 — ModalContent(stopPropagation) 안에 두어야 폼 클릭이
            Modal onClick={onClose}로 버블링돼 피커까지 닫히지 않는다 */}
        <HistoricalCountryCreateHost
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          modernCountries={modernCountryOptions}
          historicalCountries={historicalCountryOptions}
          onCreated={handleCreated}
        />
      </ModalContent>
    </Modal>
  )

  if (typeof document === 'undefined') return null

  return createPortal(modal, document.body)
}

// Styled Components
const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

const ModalContent = styled.div`
  width: 100%;
  max-width: 760px;
  height: min(720px, 86vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  outline: none;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#18181b' : '#ffffff')};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px 20px;
`

const ModalTitle = styled.h3`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SelectedCount = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
`

/** 헤더 우측 액션 묶음 — '선택 해제'(IA-14)와 닫기 ✕ */
const ModalHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

/** 탭·정렬과 무관한 선택 해제(검토 IA-14) */
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

const Controls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 20px 12px;
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
  box-shadow: ${({ $active }) =>
    $active ? '0 1px 2px rgba(0, 0, 0, 0.12)' : 'none'};

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
  /* 포커스 표시는 감싼 칸(SearchWrapper:focus-within)이 한다 — 입력 자체의 전역 링까지
     그리면 링이 안팎 두 겹이 된다 */
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

/** 대륙 — 좌측 세로 목록이던 것을 가로 칩 한 줄로(넘치면 가로 스크롤) */
const ContinentRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 0 20px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;

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
  padding: 10px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#131316' : '#fafafa')};
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
  background: ${({ theme }) => (theme.mode === 'dark' ? '#27272a' : '#ffffff')};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
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

/** 목록 — 넓으면 두 칸, 좁으면 한 칸 */
const CountryList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-content: start;
  gap: 2px 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const CountryRow = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: none;
  border-radius: 10px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  background: ${({ $selected, theme }) =>
    $selected ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.16)' : '#eef2ff') : 'transparent'};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.22)'
          : '#e0e7ff'
        : theme.colors.background.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }
`

const RowFlag = styled.span`
  flex-shrink: 0;
  width: 28px;
  text-align: center;
  font-size: 22px;
  line-height: 1;
`

const RowText = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RowName = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};

  & > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const RowMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:empty {
    display: none;
  }
`

const RowCheck = styled.span<{ $selected: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border.default)};
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : 'transparent')};
  color: #ffffff;
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

/** 인라인 등록 CTA 행 (F20) — 목록 전체 폭 차지 */
const CreateCtaRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
`

const EmptyMessage = styled.div`
  grid-column: 1 / -1;
  padding: 48px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
`
