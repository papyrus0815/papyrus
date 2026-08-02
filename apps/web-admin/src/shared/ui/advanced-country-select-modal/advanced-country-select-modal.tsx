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

import { FiCheck, FiGlobe, FiSearch, FiX } from 'react-icons/fi'
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
import { glassCardMixin } from '@/shared/styles/mixins'
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
}) => {
  const playClick = useClickSound()
  // 대륙 이름 표시용 — CountryResponseDto에는 continentId만 있어 이름은 대륙 목록에서 매핑
  const { data: continentList } = useContinents()
  const [countryType, setCountryType] = useState<'modern' | 'historical'>(
    'modern',
  )
  const [selectedContinent, setSelectedContinent] = useState<string>('all')
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

  // 대륙 목록 추출 (현대 국가가 실제 속한 대륙만)
  const continents = useMemo(() => {
    const continentSet = new Set<string>()
    modernCountries.forEach((country) => {
      const continentName = country.continentId
        ? continentNameById.get(country.continentId)
        : undefined
      if (continentName) {
        continentSet.add(continentName)
      }
    })
    return Array.from(continentSet).sort()
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
      countryType === 'modern' && selectedContinent !== 'all'
        ? searched.filter((country) => {
            const continentId = (country as ModernCountryOption).continentId
            const continentName = continentId
              ? continentNameById.get(continentId)
              : undefined
            return continentName === selectedContinent
          })
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
    selectedContinent,
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
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>
            <FiX />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {/* 좌측 필터 영역 */}
          <FilterSidebar>
            <FilterSidebarSection>
              <FilterSidebarTitle>국가 타입</FilterSidebarTitle>
              <CountryTypeOption
                $active={countryType === 'modern'}
                onClick={() => {
                  setCountryType('modern')
                  setSelectedContinent('all')
                }}
              >
                <RadioButton $active={countryType === 'modern'}>
                  <ModalRadioDot $active={countryType === 'modern'} />
                </RadioButton>
                <span>현대 국가</span>
              </CountryTypeOption>
              <CountryTypeOption
                $active={countryType === 'historical'}
                onClick={() => {
                  setCountryType('historical')
                  setSelectedContinent('all')
                }}
              >
                <RadioButton $active={countryType === 'historical'}>
                  <ModalRadioDot $active={countryType === 'historical'} />
                </RadioButton>
                <span>역사적 국가</span>
              </CountryTypeOption>
            </FilterSidebarSection>

            {countryType === 'modern' && (
              <FilterSidebarSection>
                <FilterSidebarTitle>대륙</FilterSidebarTitle>
                <FilterOptionButton
                  $active={selectedContinent === 'all'}
                  onClick={() => setSelectedContinent('all')}
                >
                  전체
                </FilterOptionButton>
                {continents.map((continent) => (
                  <FilterOptionButton
                    key={continent}
                    $active={selectedContinent === continent}
                    onClick={() => setSelectedContinent(continent)}
                  >
                    {continent}
                  </FilterOptionButton>
                ))}
              </FilterSidebarSection>
            )}
          </FilterSidebar>

          {/* 우측 리스트 영역 */}
          <ListArea>
            <SearchWrapper>
              <FiSearch />
              <SearchInput
                type="text"
                placeholder="국가 검색..."
                value={countrySearchTerm}
                onChange={(e) => setCountrySearchTerm(e.target.value)}
              />
              <SortRow>
                <SortLabel>정렬</SortLabel>
                <SortFieldSelect
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
                      <option value="name">이름</option>
                      <option value="isoCode">ISO 코드</option>
                      <option value="continent">대륙</option>
                      <option value="population">인구</option>
                      <option value="areaSqKm">면적</option>
                    </>
                  ) : (
                    <>
                      <option value="name">이름</option>
                      <option value="startYear">시작년도</option>
                    </>
                  )}
                </SortFieldSelect>
                <SortOrderGroup>
                  <SortOrderBtn
                    $active={sortOrder === 'asc'}
                    onClick={() => setSortOrder('asc')}
                  >
                    오름차순
                  </SortOrderBtn>
                  <SortOrderBtn
                    $active={sortOrder === 'desc'}
                    onClick={() => setSortOrder('desc')}
                  >
                    내림차순
                  </SortOrderBtn>
                </SortOrderGroup>
              </SortRow>
            </SearchWrapper>

            {/* 시대 힌트 안내 — '걸러내지 않았다'를 함께 알린다 (F42) */}
            {hintActive && countryType === 'historical' && (
              <HintNotice>
                <HintChip>시대 일치</HintChip>
                {formatHintYearRange(hintYearRange)}에 존속한 국가를 위로
                올렸습니다. 나머지도 그대로 있습니다.
              </HintNotice>
            )}

            <CardGrid>
              {filteredCountries.map((country) => {
                const isSelected = selectedCountryIds.includes(country.id)
                const modern = country as CountryResponseDto
                const historical = country as HistoricalCountryResponseDto
                const continentName = modern.continentId
                  ? continentNameById.get(modern.continentId)
                  : undefined
                return (
                  <CountryCard
                    key={country.id}
                    $selected={isSelected}
                    onClick={() => handleCountryClick(country)}
                  >
                    <CardFlag>{modern.flagEmoji || '🌐'}</CardFlag>
                    <CardName>{country.name}</CardName>
                    {countryType === 'historical' &&
                      hintActive &&
                      matchesHintYearRange(historical, hintYearRange) && (
                        <HintChip>시대 일치</HintChip>
                      )}
                    <CardMetaList>
                      {countryType === 'modern' ? (
                        <>
                          {modern.localName && (
                            <CardMetaRow>{modern.localName}</CardMetaRow>
                          )}
                          {modern.isoCode && (
                            <CardMetaRow>ISO {modern.isoCode}</CardMetaRow>
                          )}
                          {continentName && (
                            <CardMetaRow>{continentName}</CardMetaRow>
                          )}
                          {modern.capital && (
                            <CardMetaRow>수도 {modern.capital}</CardMetaRow>
                          )}
                          {modern.population && (
                            <CardMetaRow>인구 {modern.population}</CardMetaRow>
                          )}
                          {modern.areaSqKm != null && (
                            <CardMetaRow>
                              면적 {Number(modern.areaSqKm).toLocaleString()}{' '}
                              km²
                            </CardMetaRow>
                          )}
                        </>
                      ) : (
                        <>
                          {historical.enName && (
                            <CardMetaRow>{historical.enName}</CardMetaRow>
                          )}
                          {/* 존속기간·국가형태는 공용 포맷터/라벨로 — raw 표기는 BC를
                              AD로, 종료 미상을 '현재'로 오독시켰다(F19③) */}
                          {formatCountryPeriod(historical) && (
                            <CardMetaRow>
                              {formatCountryPeriod(historical)}
                            </CardMetaRow>
                          )}
                          {historical.stateType && (
                            <CardMetaRow>
                              {getStateTypeLabel(historical.stateType)}
                            </CardMetaRow>
                          )}
                          {historical.description && (
                            <CardMetaRow className="desc">
                              {historical.description.length > 24
                                ? `${historical.description.slice(0, 24)}…`
                                : historical.description}
                            </CardMetaRow>
                          )}
                        </>
                      )}
                    </CardMetaList>
                    {isSelected && multiSelect && (
                      <CardCheck>
                        <FiCheck size={14} />
                      </CardCheck>
                    )}
                  </CountryCard>
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
                    $variant={
                      filteredCountries.length === 0 ? 'block' : 'inline'
                    }
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
            </CardGrid>
          </ListArea>
        </ModalBody>
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

const ModalContent = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  width: 92%;
  max-width: 1000px;
  max-height: 68vh;
  display: flex;
  flex-direction: column;
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: all 0.2s ease;
  border-radius: 8px;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const ModalBody = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  max-height: calc(68vh - 72px);
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-height: none;
  }
`

const FilterSidebar = styled.div`
  background: ${({ theme }) => theme.colors.background.secondary};
  padding: 24px 20px;
  border-right: 1.5px solid ${({ theme }) => theme.colors.border.light};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
    padding: 16px 16px;
    gap: 16px;
    max-height: 40vh;
  }
`

const FilterSidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FilterSidebarTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const CountryTypeOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : '#ffffff'
      : 'transparent'};
  border: 1.5px solid
    ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.3)' : 'transparent')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  text-align: left;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#ffffff'};
    border-color: rgba(99, 102, 241, 0.2);
  }
`

const RadioButton = styled.div<{ $active: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${({ $active }) => ($active ? '#6366f1' : '#cbd5e1')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
`

const ModalRadioDot = styled.div<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? '#6366f1' : 'transparent')};
  transition: all 0.2s ease;
`

const FilterOptionButton = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : '#ffffff'
      : 'transparent'};
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  border-radius: 8px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active, theme }) =>
    $active ? '#818cf8' : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#6366f1')};
  }
`

const ListArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const SearchWrapper = styled.div`
  padding: 20px 24px;
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SortRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const SortLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SortFieldSelect = styled.select`
  padding: 8px 28px 8px 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  min-width: 100px;
  outline: none;

  &:focus {
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const SortOrderGroup = styled.div`
  display: flex;
  gap: 4px;
`

const SortOrderBtn = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : theme.colors.background.tertiary};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'transparent' : theme.colors.border.light};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ $active }) => ($active ? '#ffffff' : '#6366f1')};
  }
`

const CardGrid = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  align-content: start;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.secondary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }
`

const CountryCard = styled.button<{ $selected: boolean }>`
  position: relative;
  aspect-ratio: 1;
  min-height: 140px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  background: ${({ $selected, theme }) =>
    $selected
      ? 'rgba(99, 102, 241, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#ffffff'};
  border: 1.5px solid
    ${({ $selected, theme }) =>
      $selected ? 'rgba(99, 102, 241, 0.35)' : theme.colors.border.light};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    background: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.04)'};
    border-color: rgba(99, 102, 241, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }
`

const CardFlag = styled.span`
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
`

const CardName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;
`

const CardMetaList = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const CardMetaRow = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  line-height: 1.3;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;

  &.desc {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
`

const CardCheck = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6366f1;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

/** 시대 힌트 안내 줄 (F42) */
const HintNotice = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
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

/** 인라인 등록 CTA 행 (F20) — 그리드 전체 폭 차지 */
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
