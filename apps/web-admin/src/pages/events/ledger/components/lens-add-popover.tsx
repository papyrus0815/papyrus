/**
 * Lens 추가 팝오버 — 사용자가 + 버튼을 누르면 뜬다.
 *
 * 1단계: 종류 선택 (카테고리·국가·역사 국가·시대·품질)
 * 2단계: 종류 안에서 값 선택 (검색 가능)
 *
 * 외부 클릭·ESC 닫기와 호출자 포커스 복원은 부모(LensBar)가 책임진다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { FiAlertTriangle, FiCalendar, FiGlobe, FiLayers, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'

import {
  decadeOf,
  fontTier,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerSurfaceSolid,
} from '../styles/ledger-tokens'
import type { LensChip, LensKind } from '../types/lens'
import { startYearOf } from '../lib/group-utils'
import type { HistoricalEvent } from '@/entities/event/model'

interface Props {
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]
  countries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  onAdd: (chip: LensChip) => void
  onClose: () => void
}

type Tab = 'category' | 'country' | 'hcountry' | 'decade' | 'quality'

const COUNTRY_RESULT_LIMIT = 50

const TABS: Array<{ id: Tab; kind: LensKind; label: string; icon: React.ReactNode }> = [
  { id: 'category', kind: 'category', label: '카테고리', icon: <FiLayers size={12} /> },
  { id: 'country', kind: 'country', label: '국가', icon: <FiGlobe size={12} /> },
  { id: 'hcountry', kind: 'hcountry', label: '역사 국가', icon: <FiGlobe size={12} /> },
  { id: 'decade', kind: 'decade', label: '시대', icon: <FiCalendar size={12} /> },
  { id: 'quality', kind: 'quality', label: '데이터 품질', icon: <FiAlertTriangle size={12} /> },
]

const QUALITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'missing-description', label: '본문 누락' },
  { value: 'no-countries', label: '국가 미지정' },
  { value: 'no-keywords', label: '키워드 없음' },
]

export const LensAddPopover: React.FC<Props> = ({
  events,
  dbCategories,
  countries,
  historicalCountries,
  onAdd,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>('category')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [tab])

  /** 시대 옵션 — 사건이 존재하는 십년대만 노출 (없는 시대를 추가해도 결과 0) */
  const decadeOptions = useMemo(() => {
    const set = new Set<number>()
    for (const evt of events) {
      const year = startYearOf(evt)
      if (year !== null) set.add(decadeOf(year))
    }
    return Array.from(set)
      .sort((first, second) => first - second)
      .map((date) => ({ value: String(date), label: `${date}년대` }))
  }, [events])

  const items: Array<{ value: string; label: string; sub?: string }> = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filt = <T extends { label: string }>(arr: T[]) =>
      term ? arr.filter((it) => it.label.toLowerCase().includes(term)) : arr

    if (tab === 'category') {
      return filt(dbCategories.map((item) => ({ value: item.id, label: item.name })))
    }
    if (tab === 'country') {
      return filt(
        countries.map((item) => ({
          value: item.id,
          label: item.name,
          sub: item.flagEmoji,
        })),
      ).slice(0, COUNTRY_RESULT_LIMIT)
    }
    if (tab === 'hcountry') {
      return filt(
        historicalCountries.map((item) => ({ value: item.id, label: item.name })),
      ).slice(0, COUNTRY_RESULT_LIMIT)
    }
    if (tab === 'decade') {
      return filt(decadeOptions)
    }
    if (tab === 'quality') {
      return filt(QUALITY_OPTIONS)
    }
    return []
  }, [tab, query, dbCategories, countries, historicalCountries, decadeOptions])

  return (
    <Popover role="dialog" aria-label="렌즈 추가">
      <Tabs role="tablist">
        {TABS.map((option) => (
          <TabBtn
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            $active={tab === option.id}
            onClick={() => {
              setTab(option.id)
              setQuery('')
            }}
          >
            {option.icon}
            <span>{option.label}</span>
          </TabBtn>
        ))}
        <CloseBtn type="button" aria-label="닫기" onClick={onClose}>
          <FiX size={14} />
        </CloseBtn>
      </Tabs>

      <SearchRow>
        <FiSearch size={13} />
        <Input
          ref={inputRef}
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
          placeholder={`${TABS.find((option) => option.id === tab)?.label} 검색…`}
        />
      </SearchRow>

      <List>
        {items.length === 0 ? (
          <Empty>일치하는 항목 없음</Empty>
        ) : (
          items.map((it) => (
            <Item
              key={it.value}
              type="button"
              onClick={() => {
                const kind = TABS.find((option) => option.id === tab)?.kind ?? 'category'
                onAdd({ kind, value: it.value, label: it.label })
              }}
            >
              <span>{it.label}</span>
              {it.sub && <Sub>{it.sub}</Sub>}
            </Item>
          ))
        )}
      </List>
    </Popover>
  )
}

const Popover = styled.div`
  width: 320px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => ledgerSurfaceSolid(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 10px;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.18);
  overflow: hidden;

  @media (max-width: 480px) {
    width: calc(100vw - 40px);
    max-width: 320px;
  }
`

const Tabs = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const TabBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  border-radius: 6px;
  ${fontTier('LABEL')}
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CloseBtn = styled.button`
  margin-left: auto;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  ${fontTier('BODY')}
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const Item = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  ${fontTier('BODY')}
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const Sub = styled.span`
  margin-left: auto;
  font-size: 13px;
`

const Empty = styled.div`
  padding: 20px 12px;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
