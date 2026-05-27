/**
 * 가이드라인이 꽂혔을 때 그 시점의 행별 재임자를 한 카드 리스트로 보여주는 우측 패널.
 * 페이지 본질 가치(같은 시점에 누가 있었나) 를 한눈에 전달하기 위한 컴포넌트.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { sortSegmentsChronologically } from '../lib/sort-segments'
import type { TenureBar } from '../lib/normalize-tenures'
import { CATEGORY_TOKENS } from '../lib/category-tokens'
import type { PinnedRow } from '../model/types'
import type { RowTenuresResult } from '../api/use-all-rows-tenures'

interface Props {
  highlightYear: number
  rows: PinnedRow[]
  rowsTenures: RowTenuresResult[]
  onClose: () => void
  /** 막대 클릭 시 인물 상세로 이동 — 페이지가 핸들러 제공 */
  onSelectPerson?: (personId: string) => void
}

interface MatchEntry {
  rowId: string
  rowLabel: string
  flagEmoji: string | null
  bars: TenureBar[]
}

/** highlightYear 시점에 active한 막대만 골라 행별로 묶는다. 막대가 0개인 행은 노출 X */
function pickContemporary(
  rows: PinnedRow[],
  rowsTenures: RowTenuresResult[],
  year: number,
): MatchEntry[] {
  const tenureMap = new Map(rowsTenures.map((t) => [t.rowId, t]))
  return rows.map((row) => {
    const ordered = sortSegmentsChronologically(row.segments)
    const flag = ordered.find((s) => s.flagEmoji)?.flagEmoji ?? null
    const label = ordered.map((s) => s.name).join(' → ')
    const tenures = tenureMap.get(row.rowId)
    const bars: TenureBar[] = []
    if (tenures) {
      for (const seg of tenures.segmentResults) {
        for (const bar of seg.bars) {
          const s = bar.startJulian
          const e = bar.endJulian ?? Infinity
          if (s <= year && e >= year) bars.push(bar)
        }
      }
    }
    return { rowId: row.rowId, rowLabel: label, flagEmoji: flag, bars }
  })
}

function formatYear(y: number): string {
  return y < 0 ? `BC ${Math.abs(y)}` : String(y)
}

function categoryLabel(c: TenureBar['positionCategory']): string {
  // 동시대 패널은 '군주·왕족' 대신 짧은 '군주' 사용 — 토큰 라벨 첫 단어만
  if (c === 'MONARCH') return '군주'
  return CATEGORY_TOKENS[c].label
}

type SortMode = 'pin' | 'count' | 'name'

export function ContemporaryPanel({
  highlightYear,
  rows,
  rowsTenures,
  onClose,
  onSelectPerson,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('pin')
  const rawEntries = useMemo(
    () => pickContemporary(rows, rowsTenures, highlightYear),
    [rows, rowsTenures, highlightYear],
  )
  const entries = useMemo(() => {
    if (sortMode === 'pin') return rawEntries
    const arr = rawEntries.slice()
    if (sortMode === 'count') {
      arr.sort((a, b) => b.bars.length - a.bars.length)
    } else if (sortMode === 'name') {
      arr.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel, 'ko'))
    }
    return arr
  }, [rawEntries, sortMode])
  const totalBars = entries.reduce((acc, e) => acc + e.bars.length, 0)

  return (
    <Wrap
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      data-print-hide
      aria-label="동시대 요약 패널"
    >
      <Header>
        <HeaderTitle>
          <YearChip>{formatYear(highlightYear)}</YearChip>
          <span>년 동시대</span>
        </HeaderTitle>
        <CloseBtn type="button" onClick={onClose} aria-label="패널 닫기 (ESC)">
          <FiX size={14} />
        </CloseBtn>
      </Header>
      <Hint>
        같은 시점에 활동한 인물들 — {entries.length}행 중{' '}
        <strong>{entries.filter((e) => e.bars.length > 0).length}곳</strong>에서{' '}
        <strong>{totalBars}명</strong>
      </Hint>
      <SortRow>
        <SortLabel>정렬</SortLabel>
        <SortBtn $active={sortMode === 'pin'} onClick={() => setSortMode('pin')}>
          핀 순
        </SortBtn>
        <SortBtn $active={sortMode === 'count'} onClick={() => setSortMode('count')}>
          인물 많은 순
        </SortBtn>
        <SortBtn $active={sortMode === 'name'} onClick={() => setSortMode('name')}>
          가나다순
        </SortBtn>
      </SortRow>
      <List>
        {entries.length === 0 && (
          <EmptyHint>핀한 행이 없습니다</EmptyHint>
        )}
        {entries
          .filter((e) => e.bars.length > 0)
          .map((e) => (
            <Card key={e.rowId}>
              <CardHeader>
                {e.flagEmoji && <span>{e.flagEmoji}</span>}
                <CardTitle>{e.rowLabel || '미상 행'}</CardTitle>
              </CardHeader>
              <BarList>
                {e.bars.map((bar) => {
                  const clickable = onSelectPerson != null && bar.personId != null
                  return (
                    <BarItem
                      key={bar.id}
                      as={clickable ? 'button' : 'div'}
                      type={clickable ? 'button' : undefined}
                      $clickable={clickable}
                      onClick={
                        clickable
                          ? () => onSelectPerson!(bar.personId!)
                          : undefined
                      }
                    >
                      <BarSideAccent $category={bar.positionCategory} />
                      <BarMain>
                        <BarName>
                          {bar.regnalName ?? bar.personName ?? '미상'}
                          {bar.regnalName &&
                            bar.personName &&
                            bar.regnalName !== bar.personName && (
                              <BarNameSub> ({bar.personName})</BarNameSub>
                            )}
                        </BarName>
                        <BarMeta>
                          <CategoryBadge $category={bar.positionCategory}>
                            {categoryLabel(bar.positionCategory)}
                          </CategoryBadge>
                          {bar.positionTitle && bar.ordinal != null && (
                            <span>
                              {bar.ordinal}대 {bar.positionTitle}
                            </span>
                          )}
                          {bar.positionTitle && bar.ordinal == null && (
                            <span>{bar.positionTitle}</span>
                          )}
                        </BarMeta>
                      </BarMain>
                    </BarItem>
                  )
                })}
              </BarList>
            </Card>
          ))}
        {(() => {
          const empties = entries.filter((e) => e.bars.length === 0)
          if (empties.length === 0) return null
          return (
            <EmptyRowsSummary>
              <EmptyRowsLabel>이 시점 재임자 없음</EmptyRowsLabel>
              <EmptyRowsList>
                {empties.map((e) => (
                  <EmptyRowChip key={e.rowId}>
                    {e.flagEmoji && <span>{e.flagEmoji}</span>}
                    {e.rowLabel || '미상'}
                  </EmptyRowChip>
                ))}
              </EmptyRowsList>
            </EmptyRowsSummary>
          )
        })()}
      </List>
    </Wrap>
  )
}

const Wrap = styled(motion.aside)`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow-y: auto;
  overflow-x: hidden;
  @media (max-width: 700px) {
    position: absolute !important;
    right: 0;
    top: 0;
    bottom: 0;
    width: min(280px, 80vw) !important;
    z-index: 6;
    box-shadow: -8px 0 20px rgba(0, 0, 0, 0.15);
  }
`

const Header = styled.div`
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  position: sticky;
  top: 0;
  z-index: 1;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const YearChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.12)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`

const CloseBtn = styled.button`
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Hint = styled.div`
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const SortRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px 8px;
  flex-wrap: wrap;
`

const SortLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 4px;
`

const SortBtn = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const List = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const EmptyHint = styled.p`
  margin: 0;
  padding: 16px;
  font-size: 12px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  padding: 10px 12px;
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`

const CardTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyRowsSummary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const EmptyRowsLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyRowsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const EmptyRowChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const BarList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const BarItem = styled.li<{ $clickable: boolean }>`
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 4px 6px;
  margin: 0 -6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  text-align: left;
  width: calc(100% + 12px);
  font: inherit;
  color: inherit;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.15s;
  &:hover {
    background: ${({ $clickable, theme }) =>
      $clickable ? theme.colors.hover : 'transparent'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const BarSideAccent = styled.span<{ $category: TenureBar['positionCategory'] }>`
  flex-shrink: 0;
  width: 3px;
  border-radius: 2px;
  background: ${({ $category, theme }) =>
    CATEGORY_TOKENS[$category].bar[theme.mode === 'dark' ? 'dark' : 'light'].border};
`

const BarMain = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const BarName = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarNameSub = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BarMeta = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  align-items: center;
`

const CategoryBadge = styled.span<{ $category: TenureBar['positionCategory'] }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: ${({ $category, theme }) =>
    CATEGORY_TOKENS[$category].chip[theme.mode === 'dark' ? 'dark' : 'light'].background};
  color: ${({ $category, theme }) =>
    CATEGORY_TOKENS[$category].chip[theme.mode === 'dark' ? 'dark' : 'light'].color};
`
