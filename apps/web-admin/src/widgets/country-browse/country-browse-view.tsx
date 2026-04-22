import React from 'react'

import { FiSearch, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'

/**
 * 국가 탐색 페이지. `/history/country` 루트(상세 없음)에서 풀스크린으로 렌더.
 * - 검색 / 대륙 / 국가 유형 / 정렬 필터는 CountryListStateProvider에서 공유.
 * - 카드 클릭 → countryDetail(id)로 이동 (기존 상세 페이지와 동일 URL).
 */
export function CountryBrowseView() {
  const navigate = useNavigate()
  const {
    query,
    setQuery,
    continentFilter,
    setContinentFilter,
    countryTypeFilter,
    setCountryTypeFilter,
    sortBy,
    setSortBy,
    filtered,
    continents,
  } = useCountryListState()

  return (
    <Root>
      <Header>
        <Title>국가</Title>
        <Subtitle>전체 {filtered.length.toLocaleString()}개 국가</Subtitle>
      </Header>

      <Toolbar>
        <SearchBox>
          <FiSearch size={14} />
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="국가명·약어·수도·영문명 검색..."
            aria-label="국가 검색"
          />
          {query && (
            <ClearBtn
              type="button"
              aria-label="지우기"
              onClick={() => setQuery('')}
            >
              <FiX size={14} />
            </ClearBtn>
          )}
        </SearchBox>

        <Filters>
          <Segmented>
            {(
              [
                ['all', '전체'],
                ['modern', '현대'],
                ['historical', '역사'],
              ] as const
            ).map(([key, label]) => (
              <SegmentedBtn
                key={key}
                type="button"
                $active={countryTypeFilter === key}
                onClick={() => setCountryTypeFilter(key)}
              >
                {label}
              </SegmentedBtn>
            ))}
          </Segmented>

          <Select
            value={continentFilter}
            onChange={(e) => setContinentFilter(e.target.value)}
            aria-label="대륙"
          >
            <option value="">대륙 전체</option>
            {continents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'name' | 'population' | 'area')
            }
            aria-label="정렬"
          >
            <option value="area">면적순</option>
            <option value="population">인구순</option>
            <option value="name">이름순</option>
          </Select>
        </Filters>
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty>조건에 맞는 국가가 없습니다.</Empty>
      ) : (
        <Grid>
          {filtered.map((country) => (
            <CountryCard
              key={country.id}
              onClick={() =>
                navigate(pathKeys.history.countryDetail(country.id))
              }
              country={country}
            />
          ))}
        </Grid>
      )}
    </Root>
  )
}

function CountryCard({
  country,
  onClick,
}: {
  country: UnifiedCountry
  onClick: () => void
}) {
  const isHistorical = country.type === 'historical'
  const flagEmoji = (country as { flagEmoji?: string | null }).flagEmoji
  const localName = (country as { localName?: string | null }).localName
  const isoCode = (country as { isoCode?: string | null }).isoCode
  const population = (country as { population?: string | null }).population
  const area = (country as { areaSqKm?: number | null }).areaSqKm
  const capital = (country as { capital?: string | null }).capital
  const startYear = (country as { startYear?: number | null }).startYear
  const endYear = (country as { endYear?: number | null }).endYear
  const startEra = (country as { startEra?: string | null }).startEra
  const endEra = (country as { endEra?: string | null }).endEra
  const flagUrl = (country as { flagImageUrl?: string | null }).flagImageUrl
  const flagImg = flagUrl ? getUploadImageUrl(flagUrl) : null

  const yearRange = startYear
    ? `${startEra === 'BC' ? 'BC ' : ''}${startYear}${endYear ? ` ~ ${endEra === 'BC' ? 'BC ' : ''}${endYear}` : ' ~ 현재'}`
    : null

  const subtitle = isHistorical
    ? yearRange
    : [localName, isoCode].filter(Boolean).join(' · ')

  const meta = isHistorical
    ? capital
      ? `수도 ${capital}`
      : null
    : [
        population ? `${Number(population).toLocaleString()}명` : null,
        area ? `${area.toLocaleString()}㎢` : null,
      ]
        .filter(Boolean)
        .join(' · ')

  return (
    <Card type="button" onClick={onClick} $historical={isHistorical}>
      <FlagWrap>
        {flagImg ? (
          <FlagImg src={flagImg} alt="" />
        ) : flagEmoji ? (
          <FlagEmoji>{flagEmoji}</FlagEmoji>
        ) : (
          <FlagPlaceholder>{isHistorical ? '🏛️' : '🌐'}</FlagPlaceholder>
        )}
        <TypeChip $historical={isHistorical}>
          {isHistorical ? '역사' : '현대'}
        </TypeChip>
      </FlagWrap>
      <CardBody>
        <CardName>{country.name}</CardName>
        {subtitle && <CardSub>{subtitle}</CardSub>}
        {meta && <CardMeta>{meta}</CardMeta>}
      </CardBody>
    </Card>
  )
}

// ─── styles ─────────────────────────────────────────────────────────────

const Root = styled.div`
  padding: 32px clamp(16px, 4vw, 48px) 48px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.colors.background.primary};
`

const Header = styled.div`
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 18px;
`

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Subtitle = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 260px;
  min-width: 0;
  max-width: 420px;
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const Segmented = styled.div`
  display: inline-flex;
  align-items: center;
  border-radius: 10px;
  padding: 3px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const SegmentedBtn = styled.button<{ $active?: boolean }>`
  border: none;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.14s, color 0.14s;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.primary};
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.tertiary};
          &:hover {
            color: ${theme.colors.text.secondary};
          }
        `}
`

const Select = styled.select`
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`

const Card = styled.button<{ $historical?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  background: ${({ theme }) => theme.colors.background.primary};
  transition: transform 0.14s ease, box-shadow 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.border.medium};
    box-shadow: 0 8px 24px
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(15,23,42,0.08)'};
  }
`

const FlagWrap = styled.div`
  position: relative;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  overflow: hidden;
`

const FlagImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const FlagEmoji = styled.span`
  font-size: 52px;
  line-height: 1;
`

const FlagPlaceholder = styled.span`
  font-size: 40px;
  opacity: 0.5;
`

const TypeChip = styled.span<{ $historical?: boolean }>`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  letter-spacing: 0.02em;

  ${({ $historical, theme }) =>
    $historical
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(245,158,11,0.2)'
            : '#fef3c7'};
          color: ${theme.mode === 'dark' ? '#fcd34d' : '#b45309'};
        `
      : css`
          background: ${theme.mode === 'dark'
            ? 'rgba(99,102,241,0.2)'
            : '#eef0ff'};
          color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
        `}
`

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px 14px;
`

const CardName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Empty = styled.div`
  padding: 80px 24px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 16px;
`
