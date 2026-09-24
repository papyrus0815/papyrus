import { useState } from 'react'

import styled from 'styled-components'

import type { BondMaturity, BondYield } from '@/entities/country/api.indicators'
import {
  useBondYields,
  useDeleteBondYield,
  useUpsertBondYield,
} from '@/entities/country/api.indicators'
import {
  BOND_MATURITIES,
  compareBondMaturity,
  formatYield,
} from '@/entities/country/lib/bond-maturity'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import * as S from './styles'

interface Props {
  countryId: string
}

/** 한 해의 곡선 — 편집 폼이 다루는 단위 */
interface YearGroup {
  year: number
  rows: BondYield[]
  currencyCode: string
  source: string
  isInflationLinked: boolean
}

/**
 * 국채 금리 편집 — **한 해의 곡선을 통째로** 다룬다.
 *
 * 다른 지표 표처럼 한 행씩 넣게 하면 한 해를 채우는 데 저장을 여덟 번 해야 한다
 * (만기마다 한 번). 자료도 원래 "1913년: 3개월 3.2 / 1년 3.4 / 10년 3.9…" 꼴로
 * 한 해가 한 덩어리라 입력 단위를 그 덩어리에 맞춘다.
 *
 * 빈 칸은 '값 없음'이 아니라 **그 만기를 지운다**는 뜻이다(원래 있던 행이면 삭제).
 * 통화·출처·물가연동은 그 해 곡선 전체에 함께 적용된다.
 */
export function BondYieldPanel({ countryId }: Props) {
  const query = useBondYields(countryId)
  const upsert = useUpsertBondYield(countryId)
  const remove = useDeleteBondYield(countryId)
  const isPending = upsert.isPending || remove.isPending

  const groups = groupByYear(query.data ?? [])

  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [yearInput, setYearInput] = useState('')
  const [rates, setRates] = useState<Record<string, string>>({})
  const [currencyCode, setCurrencyCode] = useState('')
  const [source, setSource] = useState('')
  const [isInflationLinked, setIsInflationLinked] = useState(false)

  const reset = () => {
    setEditingYear(null)
    setYearInput('')
    setRates({})
    setCurrencyCode('')
    setSource('')
    setIsInflationLinked(false)
  }

  const startEdit = (group: YearGroup) => {
    setEditingYear(group.year)
    setYearInput(String(group.year))
    const next: Record<string, string> = {}
    for (const row of group.rows) next[row.maturity] = String(row.yieldRate)
    setRates(next)
    setCurrencyCode(group.currencyCode)
    setSource(group.source)
    setIsInflationLinked(group.isInflationLinked)
  }

  const handleSave = async () => {
    const year = parseInt(yearInput, 10)
    if (!Number.isInteger(year)) {
      notify.error('연도를 정확히 입력하세요')
      return
    }

    /* 넣을 것과 지울 것을 먼저 가른다 — 저장 도중에 판단하면 절반만 반영된다 */
    const toSave: { maturity: BondMaturity; yieldRate: number }[] = []
    for (const meta of BOND_MATURITIES) {
      const raw = (rates[meta.key] ?? '').trim()
      if (raw === '') continue
      const parsed = Number(raw)
      if (Number.isNaN(parsed)) {
        notify.error(`${meta.label}: 숫자를 입력하세요`)
        return
      }
      toSave.push({ maturity: meta.key, yieldRate: parsed })
    }
    if (toSave.length === 0) {
      notify.error('만기 하나 이상에 금리를 입력하세요')
      return
    }

    const existing = groups.find((group) => group.year === year)
    const keep = new Set(toSave.map((row) => row.maturity))
    const toDelete = (existing?.rows ?? [])
      .map((row) => row.maturity)
      .filter((maturity) => !keep.has(maturity))

    try {
      for (const row of toSave) {
        await upsert.mutateAsync({
          year,
          maturity: row.maturity,
          yieldRate: row.yieldRate,
          currencyCode: currencyCode.trim() || null,
          source: source.trim() || null,
          isInflationLinked,
        })
      }
      for (const maturity of toDelete) {
        await remove.mutateAsync({ year, maturity })
      }
      notify.success(`${year}년 국채 금리 ${toSave.length}건 저장됨`)
      reset()
    } catch {
      notify.error('저장 실패')
    }
  }

  const handleDeleteYear = async (group: YearGroup) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `${group.year}년 국채 금리 ${group.rows.length}건을 모두 삭제할까요?`,
        danger: true,
      }))
    )
      return
    try {
      for (const row of group.rows) {
        await remove.mutateAsync({ year: group.year, maturity: row.maturity })
      }
      notify.success('삭제됨')
      if (editingYear === group.year) reset()
    } catch {
      notify.error('삭제 실패')
    }
  }

  return (
    <div>
      <S.TableScroll>
        <S.Table>
          <thead>
            <tr>
              <th>연도</th>
              <th>만기별 금리</th>
              <th>통화</th>
              <th>물가연동</th>
              <th aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <S.EmptyHint>
                    등록된 국채 금리가 없습니다. 아래에서 연도별 곡선을
                    추가하세요.
                  </S.EmptyHint>
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr key={group.year}>
                  <td>{group.year}</td>
                  <td>
                    <CurveCells>
                      {group.rows.map((row) => (
                        <CurveCell key={row.maturity}>
                          <CurveCellLabel>
                            {maturityLabelOf(row.maturity)}
                          </CurveCellLabel>
                          {formatYield(Number(row.yieldRate))}
                        </CurveCell>
                      ))}
                    </CurveCells>
                  </td>
                  <td>{group.currencyCode || '—'}</td>
                  <td>{group.isInflationLinked ? '예' : '—'}</td>
                  <td>
                    <S.RowActions>
                      <S.IconBtn type="button" onClick={() => startEdit(group)}>
                        수정
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        $danger
                        onClick={() => handleDeleteYear(group)}
                      >
                        삭제
                      </S.IconBtn>
                    </S.RowActions>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </S.Table>
      </S.TableScroll>

      <S.FormGrid>
        <S.Field>
          연도 *
          <S.Input
            type="number"
            value={yearInput}
            onChange={(event) => setYearInput(event.target.value)}
            placeholder="2024"
            disabled={editingYear != null}
          />
        </S.Field>
        <S.Field>
          발행 통화
          <S.Input
            type="text"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value)}
            placeholder="USD"
          />
        </S.Field>
        <S.Field>
          출처·기준
          <S.Input
            type="text"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="연말 종가, FRED"
          />
        </S.Field>
        <S.Field>
          물가연동채
          <CheckRow>
            <input
              type="checkbox"
              checked={isInflationLinked}
              onChange={(event) => setIsInflationLinked(event.target.checked)}
            />
            <span>이 해의 값은 실질금리</span>
          </CheckRow>
        </S.Field>
      </S.FormGrid>

      <S.ItemSectionTitle>
        만기별 금리 (%)
        <S.ItemSectionHint>
          빈 칸은 저장하지 않습니다 — 수정 중에 비우면 그 만기는 삭제됩니다
        </S.ItemSectionHint>
      </S.ItemSectionTitle>
      <MaturityGrid>
        {BOND_MATURITIES.map((meta) => (
          <S.Field key={meta.key}>
            {meta.label}
            <S.Input
              type="number"
              step="0.01"
              value={rates[meta.key] ?? ''}
              onChange={(event) =>
                setRates((prev) => ({ ...prev, [meta.key]: event.target.value }))
              }
            />
          </S.Field>
        ))}
      </MaturityGrid>

      <S.FormBar>
        <S.ItemSectionHint>
          {editingYear != null
            ? `${editingYear}년 수정 중 — 같은 연도·만기면 갱신됩니다`
            : '연도와 만기별 금리를 입력해 한 해의 곡선을 저장하세요'}
        </S.ItemSectionHint>
        <ButtonRow>
          {editingYear != null && (
            <S.GhostButton type="button" onClick={reset}>
              취소
            </S.GhostButton>
          )}
          <S.PrimaryButton
            type="button"
            onClick={handleSave}
            disabled={isPending}
          >
            {editingYear != null ? '수정 저장' : '추가'}
          </S.PrimaryButton>
        </ButtonRow>
      </S.FormBar>
    </div>
  )
}

function maturityLabelOf(maturity: BondMaturity): string {
  return BOND_MATURITIES.find((meta) => meta.key === maturity)?.label ?? maturity
}

/** 서버는 연도 오름차순으로 주지만 편집표는 최근 해가 위다 */
function groupByYear(rows: BondYield[]): YearGroup[] {
  const byYear = new Map<number, BondYield[]>()
  for (const row of rows) {
    const bucket = byYear.get(row.year) ?? []
    bucket.push(row)
    byYear.set(row.year, bucket)
  }
  return [...byYear.entries()]
    .map(([year, bucket]) => {
      const sorted = [...bucket].sort((left, right) =>
        compareBondMaturity(left.maturity, right.maturity),
      )
      /* 통화·출처·물가연동은 한 해 안에서 같다고 보고 첫 행을 대표로 쓴다 */
      const head = sorted[0]
      return {
        year,
        rows: sorted,
        currencyCode: head.currencyCode ?? '',
        source: head.source ?? '',
        isInflationLinked: head.isInflationLinked,
      }
    })
    .sort((left, right) => right.year - left.year)
}

const MaturityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 10px 10px;
  margin-bottom: 14px;
`

const CurveCells = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  justify-content: flex-end;
`

const CurveCell = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;
`

const CurveCellLabel = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CheckRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
`
