/**
 * Lens Bar — 상단 칩 라인.
 *
 * 칩이 비어있으면 "모든 사건" 안내 + 추가 버튼.
 * 칩이 있으면 각 칩 옆 ✕ 로 제거, 끝에 + 로 추가.
 *
 * + 클릭 시 LensAddPopover를 자기 위치 아래에 띄움 (간단한 absolute, no portal).
 * 팝오버 외부 클릭·ESC로 닫히고, 닫히면 + 버튼으로 포커스가 복원된다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'

import type { HistoricalEvent } from '@/entities/event/model'
import {
  ledgerHairline,
  ledgerHairlineStrong,
  resolveCategory,
} from '../styles/ledger-tokens'
import { lensKey, type LensChip } from '../types/lens'

import { LensAddPopover } from './lens-add-popover'

interface Props {
  lens: LensChip[]
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]
  countries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  onAdd: (chip: LensChip) => void
  onRemove: (kind: LensChip['kind'], value: string) => void
  onClear: () => void
  resolveLabel: (chip: LensChip) => string
  /** 우측에 노출할 통계 */
  totalCount: number
  filteredCount: number
}

/**
 * 칩 색상 — kind별. 카테고리는 chip.value(id)만으로는 색을 모르므로,
 * 호출부에서 사전(dbCategories)을 통해 한국어 이름을 찾아 resolveCategory에 넘긴다.
 */
const chipColor = (
  chip: LensChip,
  categoryNameLookup: (id: string) => string | undefined,
): string => {
  if (chip.kind === 'category') {
    const name = categoryNameLookup(chip.value)
    return resolveCategory(name).color
  }
  if (chip.kind === 'quality') return '#dc2626'
  if (chip.kind === 'decade' || chip.kind === 'century') return '#0f766e'
  if (chip.kind === 'country' || chip.kind === 'hcountry') return '#1e40af'
  return '#4f46e5'
}

export const LensBar: React.FC<Props> = ({
  lens,
  events,
  dbCategories,
  countries,
  historicalCountries,
  onAdd,
  onRemove,
  onClear,
  resolveLabel,
  totalCount,
  filteredCount,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const addBtnRef = useRef<HTMLButtonElement | null>(null)
  const popoverWrapRef = useRef<HTMLSpanElement | null>(null)

  const categoryNameLookup = useCallback(
    (id: string) => dbCategories.find((cat) => cat.id === id)?.name,
    [dbCategories],
  )

  const closePopover = useCallback(() => {
    setPopoverOpen(false)
    requestAnimationFrame(() => addBtnRef.current?.focus())
  }, [])

  // 팝오버 외부 클릭·ESC로 닫기
  useEffect(() => {
    if (!popoverOpen) return
    const onPointer = (evt: PointerEvent) => {
      const target = evt.target as Node | null
      if (!target) return
      if (popoverWrapRef.current?.contains(target)) return
      setPopoverOpen(false)
    }
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        evt.stopPropagation()
        closePopover()
      }
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [popoverOpen, closePopover])

  return (
    <Wrap>
      <Lead>렌즈</Lead>
      <ChipsScroll>
        {lens.length === 0 ? (
          <EmptyHint>모든 사건 — 좁혀보려면 칩을 추가하세요</EmptyHint>
        ) : (
          lens.map((chip) => (
            <Chip
              key={lensKey(chip)}
              $color={chipColor(chip, categoryNameLookup)}
              title={chip.kind}
            >
              <ChipLabel>{resolveLabel(chip)}</ChipLabel>
              <ChipRemove
                type="button"
                aria-label="이 렌즈 제거"
                onClick={() => onRemove(chip.kind, chip.value)}
              >
                <FiX size={11} />
              </ChipRemove>
            </Chip>
          ))
        )}
        <AddBtnWrap ref={popoverWrapRef}>
          <AddBtn
            ref={addBtnRef}
            type="button"
            $open={popoverOpen}
            onClick={() => setPopoverOpen((open) => !open)}
            aria-expanded={popoverOpen}
            aria-haspopup="dialog"
          >
            <FiPlus size={11} />
            <span>{lens.length === 0 ? '렌즈 추가' : '추가'}</span>
          </AddBtn>
          {popoverOpen && (
            <PopoverFloat>
              <LensAddPopover
                events={events}
                dbCategories={dbCategories}
                countries={countries}
                historicalCountries={historicalCountries}
                onAdd={(chip) => {
                  onAdd(chip)
                  closePopover()
                }}
                onClose={closePopover}
              />
            </PopoverFloat>
          )}
        </AddBtnWrap>
        {lens.length > 0 && (
          <ClearBtn type="button" onClick={onClear}>
            전체 해제
          </ClearBtn>
        )}
      </ChipsScroll>
      <Stat>
        {lens.length > 0 ? (
          <>
            <StatNum>{filteredCount.toLocaleString()}</StatNum>
            <StatTotal>/ {totalCount.toLocaleString()}건</StatTotal>
          </>
        ) : (
          <>
            <StatNum>{totalCount.toLocaleString()}</StatNum>
            <StatTotal>건</StatTotal>
          </>
        )}
      </Stat>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
`

const Lead = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const ChipsScroll = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  min-width: 0;

  &::-webkit-scrollbar {
    display: none;
  }
`

const EmptyHint = styled.div`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 480px) {
    display: none;
  }
`

const Chip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 4px 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ $color }) => $color}55;
  background: ${({ $color }) => $color}10;
  color: ${({ $color }) => $color};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`

const ChipLabel = styled.span`
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ChipRemove = styled.button`
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.6;

  &:hover {
    opacity: 1;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
  }
`

const AddBtnWrap = styled.span`
  position: relative;
  display: inline-flex;
`

const AddBtn = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px dashed
    ${({ $open, theme }) =>
      $open ? '#6366f1' : ledgerHairlineStrong(theme.mode)};
  background: ${({ $open }) => ($open ? 'rgba(99,102,241,0.08)' : 'transparent')};
  color: ${({ $open, theme }) =>
    $open ? '#4f46e5' : theme.colors.text.secondary};
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
  flex-shrink: 0;

  &:hover {
    color: #4f46e5;
    border-color: rgba(99, 102, 241, 0.45);
  }
`

const PopoverFloat = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
`

const ClearBtn = styled.button`
  height: 26px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Stat = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding-left: 14px;
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  white-space: nowrap;
  flex-shrink: 0;
`

const StatNum = styled.span`
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
`

const StatTotal = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`
