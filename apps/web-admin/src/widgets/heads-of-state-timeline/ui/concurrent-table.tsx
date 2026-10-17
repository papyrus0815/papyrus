/**
 * 동시 재위 비교표 — 가이드 연도에 재임 중인 수장을 한 표에 나란히.
 *
 * 우측 동시대 패널이 "그 해 한 일"(카드)을 보여준다면, 이 표는 **비교 수치**를 맞대어 본다:
 * 재위 기간 · 즉위 N년차 · 진행률 · 그해 새로 즉위. 연도 스크러버로 넘기면 함께 바뀐다.
 * 행 클릭 = 막대 클릭과 같은 업적 빠른보기.
 */
import { useMemo, useState } from 'react'

import { FiX } from 'react-icons/fi'
import styled, { css, useTheme } from 'styled-components'

import type { RowTenuresResult } from '../api/use-all-rows-tenures'
import { CATEGORY_TOKENS } from '../lib/category-tokens'
import type { TenureBar } from '../lib/normalize-tenures'
import { pickContemporary } from '../lib/pick-contemporary'
import {
  tenureProgressAt,
  tenureTotalYears,
  tenureYearAt,
} from '../lib/tenure-year'
import type { PinnedRow } from '../model/types'

interface Props {
  year: number
  rows: PinnedRow[]
  rowsTenures: RowTenuresResult[]
  isCategoryEnabled: (category: TenureBar['positionCategory']) => boolean
  onSelectBar: (bar: TenureBar) => void
  onClose: () => void
}

type SortMode = 'pin' | 'tenure' | 'accession'

interface TableRow {
  key: string
  rowLabel: string
  flagEmoji: string | null
  pinOrder: number
  bar: TenureBar
  tenureYear: number
  totalYears: number | null
  progress: number | null
}

function formatYear(year: number): string {
  return year < 0 ? `BC ${Math.abs(year)}` : String(year)
}

function headName(bar: TenureBar): string {
  return bar.regnalName ?? bar.personName ?? '미상'
}

function periodLabel(bar: TenureBar): string {
  const start = formatYear(Math.floor(bar.startJulian))
  if (bar.endJulian == null) return `${start} ~ 재임 중`
  return `${start} ~ ${formatYear(Math.floor(bar.endJulian))}`
}

export function ConcurrentTable({
  year,
  rows,
  rowsTenures,
  isCategoryEnabled,
  onSelectBar,
  onClose,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('pin')
  const theme = useTheme()
  const tone = theme?.mode === 'dark' ? 'dark' : 'light'

  const tableRows = useMemo(() => {
    const collected: TableRow[] = []
    pickContemporary(rows, rowsTenures, year).forEach((entry, pinOrder) => {
      for (const bar of entry.bars) {
        if (!isCategoryEnabled(bar.positionCategory)) continue
        const tenureYear = tenureYearAt(bar, year)
        if (tenureYear == null) continue
        collected.push({
          key: `${entry.rowId}:${bar.id}`,
          rowLabel: entry.rowLabel,
          flagEmoji: entry.flagEmoji,
          pinOrder,
          bar,
          tenureYear,
          totalYears: tenureTotalYears(bar),
          progress: tenureProgressAt(bar, year),
        })
      }
    })
    if (sortMode === 'tenure')
      collected.sort((left, right) => right.tenureYear - left.tenureYear)
    else if (sortMode === 'accession')
      collected.sort(
        (left, right) => left.bar.startJulian - right.bar.startJulian,
      )
    return collected
  }, [rows, rowsTenures, year, isCategoryEnabled, sortMode])

  const newlyCrowned = tableRows.filter((row) => row.tenureYear === 1).length

  return (
    <Wrap aria-label={`${formatYear(year)}년 동시 재위 비교표`} data-print-hide>
      <Head>
        <Title>
          <YearMark>{formatYear(year)}</YearMark>년 동시 재위 비교표
          <Count>
            {tableRows.length}명
            {newlyCrowned > 0 && ` · 새로 즉위 ${newlyCrowned}`}
          </Count>
        </Title>
        <HeadActions>
          <SortGroup role="radiogroup" aria-label="정렬">
            {(
              [
                ['pin', '핀 순'],
                ['tenure', '연차 긴 순'],
                ['accession', '즉위 순'],
              ] as const
            ).map(([mode, label]) => (
              <SortChip
                key={mode}
                type="button"
                role="radio"
                aria-checked={sortMode === mode}
                $active={sortMode === mode}
                onClick={() => setSortMode(mode)}
              >
                {label}
              </SortChip>
            ))}
          </SortGroup>
          <CloseButton type="button" onClick={onClose} aria-label="비교표 닫기">
            <FiX size={14} />
          </CloseButton>
        </HeadActions>
      </Head>

      <Scroll>
        {tableRows.length === 0 ? (
          <Empty>이 해에 재임 중인 수장이 핀한 행에 없습니다.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th scope="col">국가</th>
                <th scope="col">구분</th>
                <th scope="col">수장</th>
                <th scope="col">재위·재임 기간</th>
                <th scope="col">이 해 기준</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const token = CATEGORY_TOKENS[row.bar.positionCategory]
                const chip = token.chip[tone]
                const barTone = token.bar[tone]
                return (
                  <BodyRow
                    key={row.key}
                    tabIndex={0}
                    onClick={() => onSelectBar(row.bar)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectBar(row.bar)
                      }
                    }}
                  >
                    <td>
                      <CountryCell>
                        {row.flagEmoji && (
                          <span aria-hidden>{row.flagEmoji}</span>
                        )}
                        <span>{row.rowLabel}</span>
                      </CountryCell>
                    </td>
                    <td>
                      <CategoryPill
                        style={{
                          color: chip.color,
                          background: chip.background,
                        }}
                      >
                        {row.bar.positionTitle ?? token.label}
                      </CategoryPill>
                    </td>
                    <td>
                      <HeadCell>
                        <strong>
                          {row.bar.ordinal != null && `${row.bar.ordinal}대 `}
                          {headName(row.bar)}
                        </strong>
                        {row.tenureYear === 1 && <NewBadge>즉위</NewBadge>}
                      </HeadCell>
                      {row.bar.regnalName &&
                        row.bar.personName &&
                        row.bar.regnalName !== row.bar.personName && (
                          <SubName>{row.bar.personName}</SubName>
                        )}
                    </td>
                    <td>
                      <Period>{periodLabel(row.bar)}</Period>
                      {row.totalYears != null && (
                        <SubName>{row.totalYears}년</SubName>
                      )}
                    </td>
                    <td>
                      <ProgressCell>
                        <Track aria-hidden>
                          {row.progress != null && (
                            <Fill
                              style={{
                                width: `${Math.round(row.progress * 100)}%`,
                                background: barTone.border,
                              }}
                            />
                          )}
                        </Track>
                        <span>
                          <b>{row.tenureYear}년차</b>
                          {row.totalYears != null && ` / ${row.totalYears}년`}
                        </span>
                      </ProgressCell>
                    </td>
                  </BodyRow>
                )
              })}
            </tbody>
          </Table>
        )}
      </Scroll>
    </Wrap>
  )
}

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 280px;
  min-height: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 20px 8px;
`

const Title = styled.h2`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const YearMark = styled.span`
  color: #ef4444;
  font-variant-numeric: tabular-nums;
`

const Count = styled.span`
  margin-left: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeadActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const SortGroup = styled.div`
  display: inline-flex;
  gap: 2px;
`

const SortChip = styled.button<{ $active: boolean }>`
  padding: 3px 9px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.primary};
    `}
`

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 20px 12px;
`

const Empty = styled.p`
  margin: 24px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 10px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) => theme.colors.background.primary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.medium};
    white-space: nowrap;
  }
  td {
    padding: 7px 10px;
    vertical-align: middle;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const BodyRow = styled.tr`
  cursor: pointer;
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.activeLight};
    outline: none;
  }
`

const CountryCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CategoryPill = styled.span`
  display: inline-block;
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`

const HeadCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const NewBadge = styled.span`
  padding: 0 5px;
  border-radius: 4px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  line-height: 15px;
`

const SubName = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Period = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const ProgressCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 170px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Track = styled.span`
  position: relative;
  flex: 0 0 80px;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.border.light};
`

const Fill = styled.span`
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
`
