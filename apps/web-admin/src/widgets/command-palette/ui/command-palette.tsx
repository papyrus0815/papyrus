import React, { useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { FiSearch, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { useHistoricalCountries } from '@/entities/historical-country/api'
import { useCountries } from '@/features/country/api'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { pathKeys } from '@/shared/router'

import { useCommandPaletteStore } from '../model/command-palette.store'
import { useRecentCountriesStore } from '../model/recent-countries.store'
import * as S from './command-palette.styles'

interface PaletteItem {
  id: string
  name: string
  subtitle: string
  flagEmoji?: string | null
  isHistorical: boolean
}

function toItem(
  c: CountryResponseDto | HistoricalCountryResponseDto,
  isHistorical: boolean,
): PaletteItem {
  const modern = c as CountryResponseDto
  const historical = c as HistoricalCountryResponseDto
  const subtitle = isHistorical
    ? [historical.enName, formatYearRange(historical)].filter(Boolean).join(' · ')
    : [modern.localName, modern.isoCode].filter(Boolean).join(' · ')
  return {
    id: c.id,
    name: c.name,
    subtitle,
    flagEmoji: (c as { flagEmoji?: string | null }).flagEmoji ?? null,
    isHistorical,
  }
}

function formatYearRange(hc: HistoricalCountryResponseDto): string {
  const s = (hc as { startYear?: number | null }).startYear
  const e = (hc as { endYear?: number | null }).endYear
  const se = (hc as { startEra?: string | null }).startEra
  const ee = (hc as { endEra?: string | null }).endEra
  if (!s && !e) return ''
  const sp = s ? `${se === 'BC' ? 'BC ' : ''}${s}` : '?'
  const ep = e ? `${ee === 'BC' ? 'BC ' : ''}${e}` : '현재'
  return `${sp} ~ ${ep}`
}

function matches(item: PaletteItem, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return (
    item.name.toLowerCase().includes(needle) ||
    item.subtitle.toLowerCase().includes(needle)
  )
}

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open)
  const closePalette = useCommandPaletteStore((s) => s.closePalette)
  const recentIds = useRecentCountriesStore((s) => s.recentIds)
  const clearRecent = useRecentCountriesStore((s) => s.clear)
  const pushRecent = useRecentCountriesStore((s) => s.push)

  const { data: modernCountries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const allItems = useMemo<PaletteItem[]>(() => {
    const m = modernCountries.map((c) => toItem(c, false))
    const h = (historicalCountries as HistoricalCountryResponseDto[]).map((c) =>
      toItem(c, true),
    )
    return [...m, ...h]
  }, [modernCountries, historicalCountries])

  const itemsById = useMemo(() => {
    const map = new Map<string, PaletteItem>()
    for (const item of allItems) map.set(item.id, item)
    return map
  }, [allItems])

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) {
      return recentIds
        .map((id) => itemsById.get(id))
        .filter((x): x is PaletteItem => Boolean(x))
    }
    return allItems.filter((item) => matches(item, q)).slice(0, 50)
  }, [query, recentIds, itemsById, allItems])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closePalette()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        const target = results[activeIndex]
        if (!target) return
        e.preventDefault()
        handleSelect(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, activeIndex, closePalette])

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    )
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSelect = (item: PaletteItem) => {
    pushRecent(item.id)
    closePalette()
    navigate(pathKeys.countryDetail(item.id))
  }

  if (!open) return null

  const showingRecent = query.trim().length === 0 && recentIds.length > 0
  const isEmpty = results.length === 0

  return createPortal(
    <>
      <S.Backdrop onClick={closePalette} />
      <S.Panel role="dialog" aria-label="국가 검색">
        <S.SearchRow>
          <FiSearch size={18} />
          <S.SearchInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="국가 이름·약어 검색..."
            aria-label="국가 이름 검색"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="지우기"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
              }}
            >
              <FiX size={16} />
            </button>
          )}
          <S.KeyHint>Esc</S.KeyHint>
        </S.SearchRow>

        <S.ResultList ref={listRef}>
          {showingRecent && (
            <S.SectionLabel>
              <span>최근 방문</span>
              <S.ClearRecentBtn type="button" onClick={clearRecent}>
                지우기
              </S.ClearRecentBtn>
            </S.SectionLabel>
          )}
          {!showingRecent && query.trim() && (
            <S.SectionLabel>
              <span>검색 결과 · {results.length}</span>
            </S.SectionLabel>
          )}
          {isEmpty && (
            <S.Empty>
              {query.trim()
                ? '일치하는 국가가 없습니다.'
                : '최근 방문한 국가가 없습니다. 국가를 검색해보세요.'}
            </S.Empty>
          )}
          {results.map((item, index) => (
            <S.Row
              key={item.id}
              data-index={index}
              type="button"
              $active={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelect(item)}
            >
              <S.RowLeft>
                <S.Flag>{item.flagEmoji ?? (item.isHistorical ? '🏛️' : '🌐')}</S.Flag>
                <S.RowText>
                  <S.RowTitle>{item.name}</S.RowTitle>
                  {item.subtitle && <S.RowSubtitle>{item.subtitle}</S.RowSubtitle>}
                </S.RowText>
              </S.RowLeft>
              <S.TypeChip $historical={item.isHistorical}>
                {item.isHistorical ? '역사' : '현대'}
              </S.TypeChip>
            </S.Row>
          ))}
        </S.ResultList>

        <S.Footer>
          <S.FooterHint>
            <S.KeyHint>↑</S.KeyHint>
            <S.KeyHint>↓</S.KeyHint>
            탐색
          </S.FooterHint>
          <S.FooterHint>
            <S.KeyHint>Enter</S.KeyHint>
            선택
          </S.FooterHint>
          <S.FooterHint>
            <S.KeyHint>Esc</S.KeyHint>
            닫기
          </S.FooterHint>
        </S.Footer>
      </S.Panel>
    </>,
    document.body,
  )
}
