/**
 * PlaceSelect — 출생지/사망지 선택 컴포넌트
 *
 * 두 가지 모드:
 *  1. DB 선택: 국가 → 행정구역 → 도시 계층 선택
 *  2. 직접 입력: 자유 텍스트 (역사 지명 등)
 */
import React, { useEffect, useRef, useState } from 'react'

import {
  FiChevronDown,
  FiDatabase,
  FiEdit3,
  FiMapPin,
  FiX,
} from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import {
  type AdministrativeDivision,
  type City,
  cityApi,
} from '@/shared/api/city'
import { type Country, countryApi } from '@/shared/api/country'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaceResult {
  displayName: string
  shortName: string
  /** DB City.id */
  cityId?: string
  /** DB AdministrativeDivision.id */
  adminDivisionId?: string
  region?: string
  countryName?: string
  /** 직접 입력 여부 */
  isManual?: boolean
}

export interface PlaceSelectProps {
  value?: PlaceResult | null
  onChange: (place: PlaceResult | null) => void
  /** 외부에서 국가를 미리 고정할 때 (설정 시 국가 선택 드롭다운 숨김) */
  countryId?: string
  disabled?: boolean
  accentColor?: string
}

type TabMode = 'db' | 'manual'

// ---------------------------------------------------------------------------
// Styled Components
// ---------------------------------------------------------------------------

const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`

const Wrap = styled.div`
  width: 100%;
`

const TabBar = styled.div`
  display: flex;
  margin-bottom: 8px;
  border: 1.5px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f9fafb'};
`

const Tab = styled.button<{ $active: boolean; $accent: string }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border: none;
  background: ${(p) =>
    p.$active
      ? p.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : '#fff'
      : 'transparent'};
  color: ${(p) =>
    p.$active
      ? p.theme.mode === 'dark'
        ? '#ffffff'
        : p.$accent
      : p.theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  transition: all 0.15s;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: ${(p) => (p.$active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none')};
  &:last-child {
    border-right: none;
  }
  &:hover:not(:disabled) {
    color: ${(p) => (p.theme.mode === 'dark' ? '#ffffff' : p.$accent)};
    background: ${(p) =>
      p.theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#fff'};
  }
`

const SelectGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FieldLabel = styled.div`
  font-size: 11.5px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
`

const SelectWrap = styled.div`
  position: relative;
`

const StyledSelect = styled.select<{ $hasValue: boolean; $accent: string }>`
  width: 100%;
  padding: 9px 36px 9px 13px;
  border: 1.5px solid ${(p) => (p.$hasValue ? p.$accent : p.theme.colors.border.light)};
  border-radius: 10px;
  font-size: 14px;
  color: ${(p) => (p.$hasValue ? p.theme.colors.text.primary : p.theme.colors.text.secondary)};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  appearance: none;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  &:focus {
    border-color: ${(p) => p.$accent};
    box-shadow: 0 0 0 3px ${(p) => p.$accent}22;
  }
  &:disabled {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
    cursor: default;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const SelectIcon = styled.span`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
`

const LoadingIcon = styled.span`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  animation: ${spin} 0.7s linear infinite;
`

const SaveRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 2px;
`

const SaveBtn = styled.button<{ $accent: string }>`
  padding: 7px 18px;
  background: ${(p) => p.$accent};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const ManualPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const TextInput = styled.input<{ $accent: string }>`
  width: 100%;
  padding: 9px 13px;
  border: 1.5px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  &:focus {
    border-color: ${(p) => p.$accent};
    box-shadow: 0 0 0 3px ${(p) => p.$accent}22;
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  &:disabled {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  }
`

const ResultBadge = styled.div<{ $manual: boolean; $accent: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: ${(p) => p.theme.mode === 'dark'
    ? (p.$manual ? 'rgba(253,216,168,0.08)' : `${p.$accent}18`)
    : (p.$manual ? '#fdf8f0' : `${p.$accent}0d`)};
  border: 1px solid ${(p) => p.theme.mode === 'dark'
    ? (p.$manual ? 'rgba(240,217,168,0.2)' : `${p.$accent}33`)
    : (p.$manual ? '#f0d9a8' : `${p.$accent}33`)};
  border-radius: 10px;
`

const BadgeText = styled.div`
  flex: 1;
  min-width: 0;
`

const BadgeMain = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const BadgeSub = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 1px;
`

const TypeTag = styled.em<{ $manual: boolean; $accent: string }>`
  flex-shrink: 0;
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;
  padding: 2px 6px;
  background: ${(p) => p.theme.mode === 'dark'
    ? (p.$manual ? 'rgba(254,243,199,0.12)' : `${p.$accent}1a`)
    : (p.$manual ? '#fef3c7' : `${p.$accent}1a`)};
  border: 1px solid ${(p) => p.theme.mode === 'dark'
    ? (p.$manual ? 'rgba(240,217,168,0.25)' : `${p.$accent}40`)
    : (p.$manual ? '#f0d9a8' : `${p.$accent}40`)};
  color: ${(p) => p.$manual
    ? (p.theme.mode === 'dark' ? '#fbbf24' : '#92650a')
    : p.$accent};
`

const ClearBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1d5db'};
  }
`

const EmptyNote = styled.div`
  padding: 10px 13px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f9fafb'};
  border: 1px dashed ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  text-align: center;
`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaceSelect({
  value,
  onChange,
  countryId: fixedCountryId,
  disabled = false,
  accentColor = '#6366f1',
}: PlaceSelectProps) {
  const [tab, setTab] = useState<TabMode>(value?.isManual ? 'manual' : 'db')

  // 국가
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState(
    fixedCountryId ?? '',
  )
  const [loadingCountries, setLoadingCountries] = useState(false)

  // 행정구역
  const [adminDivisions, setAdminDivisions] = useState<
    AdministrativeDivision[]
  >([])
  const [selectedDivId, setSelectedDivId] = useState('')
  const [loadingDivs, setLoadingDivs] = useState(false)

  // 도시
  const [cities, setCities] = useState<City[]>([])
  const [selectedCityId, setSelectedCityId] = useState('')
  const [loadingCities, setLoadingCities] = useState(false)

  // 직접 입력
  const [manualText, setManualText] = useState('')
  const manualInputRef = useRef<HTMLInputElement>(null)

  // 외부 countryId 고정 여부
  const isCountryFixed = !!fixedCountryId

  // 국가 목록 로드 (고정 아닐 때만)
  useEffect(() => {
    if (isCountryFixed) return
    setLoadingCountries(true)
    countryApi
      .getAll()
      .then((list) => setCountries(list ?? []))
      .finally(() => setLoadingCountries(false))
  }, [isCountryFixed])

  // 고정 국가 변경 반영
  useEffect(() => {
    if (fixedCountryId) setSelectedCountryId(fixedCountryId)
  }, [fixedCountryId])

  // 국가 선택 시 행정구역 로드
  useEffect(() => {
    if (!selectedCountryId) {
      setAdminDivisions([])
      setSelectedDivId('')
      setCities([])
      setSelectedCityId('')
      return
    }
    setLoadingDivs(true)
    setSelectedDivId('')
    setCities([])
    setSelectedCityId('')
    cityApi
      .getAdministrativeDivisions(selectedCountryId)
      .then(setAdminDivisions)
      .finally(() => setLoadingDivs(false))
  }, [selectedCountryId])

  // 행정구역 선택 시 도시 로드
  useEffect(() => {
    if (!selectedDivId) {
      setCities([])
      setSelectedCityId('')
      return
    }
    setLoadingCities(true)
    setSelectedCityId('')
    cityApi
      .getByAdministrativeDivisionId(selectedDivId)
      .then(setCities)
      .finally(() => setLoadingCities(false))
  }, [selectedDivId])

  // value 초기 복원 (1회)
  useEffect(() => {
    if (!value) return
    if (value.isManual) {
      setTab('manual')
      setManualText(value.shortName)
    } else {
      setTab('db')
      if (value.adminDivisionId) setSelectedDivId(value.adminDivisionId)
      if (value.cityId) setSelectedCityId(value.cityId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- 핸들러 ---

  const handleCountryChange = (id: string) => {
    setSelectedCountryId(id)
    onChange(null)
  }

  const handleDivChange = (divId: string) => {
    setSelectedDivId(divId)
    setSelectedCityId('')
    onChange(null)
  }

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId)
    if (!cityId) {
      onChange(null)
      return
    }
    const city = cities.find((c) => c.id === cityId)
    const div = flatDivisions.find((d) => d.id === selectedDivId)
    const country = countries.find((c) => c.id === selectedCountryId)
    if (!city) return
    const parts = [city.name, div?.name, country?.name].filter(Boolean)
    onChange({
      cityId: city.id,
      adminDivisionId: selectedDivId || undefined,
      displayName: parts.join(', '),
      shortName: city.name,
      region: div?.name,
      countryName: country?.name,
    })
  }

  const handleDivOnly = () => {
    const div = flatDivisions.find((d) => d.id === selectedDivId)
    const country = countries.find((c) => c.id === selectedCountryId)
    if (!div) return
    const parts = [div.name, country?.name].filter(Boolean)
    onChange({
      adminDivisionId: div.id,
      displayName: parts.join(', '),
      shortName: div.name,
      countryName: country?.name,
    })
  }

  const handleManualSave = () => {
    const text = manualText.trim()
    if (!text) return
    onChange({ displayName: text, shortName: text, isManual: true })
  }

  const handleClear = () => {
    onChange(null)
    setSelectedDivId('')
    setSelectedCityId('')
    setManualText('')
    if (!isCountryFixed) setSelectedCountryId('')
  }

  const handleTabChange = (next: TabMode) => {
    setTab(next)
    onChange(null)
    setSelectedDivId('')
    setSelectedCityId('')
    setManualText('')
    if (!isCountryFixed) setSelectedCountryId('')
  }

  const flatDivisions = adminDivisions.flatMap((d) => [
    d,
    ...(d.children ?? []),
  ])

  // 고정 국가명 (badge 표시용)
  const fixedCountryName = isCountryFixed
    ? countries.find((c) => c.id === fixedCountryId)?.name
    : undefined

  return (
    <Wrap>
      <TabBar>
        <Tab
          type="button"
          $active={tab === 'db'}
          $accent={accentColor}
          onClick={() => handleTabChange('db')}
          disabled={disabled}
        >
          <FiDatabase size={12} />
          등록된 지역 선택
        </Tab>
        <Tab
          type="button"
          $active={tab === 'manual'}
          $accent="#b45309"
          onClick={() => handleTabChange('manual')}
          disabled={disabled}
        >
          <FiEdit3 size={12} />
          직접 입력
        </Tab>
      </TabBar>

      {/* DB 선택 탭 */}
      {tab === 'db' && (
        <SelectGrid>
          {/* 국가 선택 (외부에서 고정된 경우 숨김) */}
          {!isCountryFixed && (
            <div>
              <FieldLabel>국가</FieldLabel>
              <SelectWrap>
                <StyledSelect
                  $hasValue={!!selectedCountryId}
                  $accent={accentColor}
                  value={selectedCountryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={disabled || loadingCountries}
                >
                  <option value="">
                    {loadingCountries ? '불러오는 중...' : '국가 선택'}
                  </option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flagEmoji ? `${c.flagEmoji} ` : ''}
                      {c.name}
                    </option>
                  ))}
                </StyledSelect>
                {loadingCountries ? (
                  <LoadingIcon>↻</LoadingIcon>
                ) : (
                  <SelectIcon>
                    <FiChevronDown size={15} />
                  </SelectIcon>
                )}
              </SelectWrap>
            </div>
          )}

          {/* 행정구역 선택 */}
          {(selectedCountryId || isCountryFixed) && (
            <div>
              <FieldLabel>행정구역 (시·도·주 등)</FieldLabel>
              <SelectWrap>
                <StyledSelect
                  $hasValue={!!selectedDivId}
                  $accent={accentColor}
                  value={selectedDivId}
                  onChange={(e) => handleDivChange(e.target.value)}
                  disabled={disabled || loadingDivs}
                >
                  <option value="">
                    {loadingDivs
                      ? '불러오는 중...'
                      : adminDivisions.length === 0
                        ? '등록된 행정구역 없음'
                        : '행정구역 선택'}
                  </option>
                  {adminDivisions.map((div) => (
                    <React.Fragment key={div.id}>
                      <option value={div.id}>{div.name}</option>
                      {(div.children ?? []).map((child) => (
                        <option key={child.id} value={child.id}>
                          &nbsp;&nbsp;└ {child.name}
                        </option>
                      ))}
                    </React.Fragment>
                  ))}
                </StyledSelect>
                {loadingDivs ? (
                  <LoadingIcon>↻</LoadingIcon>
                ) : (
                  <SelectIcon>
                    <FiChevronDown size={15} />
                  </SelectIcon>
                )}
              </SelectWrap>
              {!loadingDivs && adminDivisions.length === 0 && (
                <EmptyNote style={{ marginTop: 6 }}>
                  등록된 행정구역이 없습니다. 직접 입력 탭을 이용해주세요.
                </EmptyNote>
              )}
            </div>
          )}

          {/* 도시 선택 */}
          {selectedDivId && (
            <div>
              <FieldLabel>도시 (선택)</FieldLabel>
              <SelectWrap>
                <StyledSelect
                  $hasValue={!!selectedCityId}
                  $accent={accentColor}
                  value={selectedCityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={disabled || loadingCities}
                >
                  <option value="">
                    {loadingCities
                      ? '불러오는 중...'
                      : cities.length === 0
                        ? '등록된 도시 없음'
                        : '도시 선택 (선택 안 해도 됨)'}
                  </option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </StyledSelect>
                {loadingCities ? (
                  <LoadingIcon>↻</LoadingIcon>
                ) : (
                  <SelectIcon>
                    <FiChevronDown size={15} />
                  </SelectIcon>
                )}
              </SelectWrap>
            </div>
          )}

          {/* 행정구역만 저장 버튼 */}
          {selectedDivId && !selectedCityId && (
            <SaveRow>
              <SaveBtn
                type="button"
                $accent={accentColor}
                onClick={handleDivOnly}
              >
                행정구역만 저장
              </SaveBtn>
            </SaveRow>
          )}
        </SelectGrid>
      )}

      {/* 직접 입력 탭 */}
      {tab === 'manual' && (
        <ManualPanel>
          <div>
            <FieldLabel>지명 입력</FieldLabel>
            <TextInput
              ref={manualInputRef}
              $accent="#b45309"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="예: 사쓰마번, 한성부, 프로이센 왕국, 불명"
              disabled={disabled}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleManualSave()
                }
              }}
            />
          </div>
          <SaveRow>
            <SaveBtn
              type="button"
              $accent="#b45309"
              onClick={handleManualSave}
              disabled={!manualText.trim() || disabled}
            >
              저장
            </SaveBtn>
          </SaveRow>
        </ManualPanel>
      )}

      {/* 선택 결과 뱃지 */}
      {value && (
        <ResultBadge $manual={!!value.isManual} $accent={accentColor}>
          {value.isManual ? (
            <FiEdit3 size={13} color="#b45309" />
          ) : (
            <FiMapPin size={13} color={accentColor} />
          )}
          <BadgeText>
            <BadgeMain>{value.shortName}</BadgeMain>
            {(value.region || value.countryName) && !value.isManual && (
              <BadgeSub>
                {[value.region, value.countryName].filter(Boolean).join(' · ')}
              </BadgeSub>
            )}
          </BadgeText>
          <TypeTag $manual={!!value.isManual} $accent={accentColor}>
            {value.isManual
              ? '직접입력'
              : value.cityId
                ? 'DB 도시'
                : 'DB 행정구역'}
          </TypeTag>
          {!disabled && (
            <ClearBtn type="button" onClick={handleClear} title="지우기">
              <FiX size={11} />
            </ClearBtn>
          )}
        </ResultBadge>
      )}
    </Wrap>
  )
}
