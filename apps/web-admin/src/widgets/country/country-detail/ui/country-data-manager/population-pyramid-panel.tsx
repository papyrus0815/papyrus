import { useMemo, useState } from 'react'

import {
  useDemographicIndicators,
  useUpsertDemographicIndicator,
} from '@/entities/country/api.indicators'
import {
  AGE_BRACKETS,
  femaleFieldOf,
  maleFieldOf,
  pyramidTotals,
  toPyramidRows,
} from '@/entities/country/model/population-pyramid'
import type { DemographicIndicator } from '@/shared/api/country-indicators'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import * as S from './styles'

import styled from 'styled-components'

interface Props {
  countryId: string
}

const fmt = (value: number) => (value === 0 ? '—' : value.toLocaleString())

/**
 * 연령대별 성별 인구 등록 — 인구 피라미드의 입력면.
 *
 * 경제·발전 지표처럼 한 줄에 다 늘어놓을 수 없다. 9개 연령대 × 남/여 = 18칸이라
 * 평평한 표에 넣으면 20열짜리 가로 스크롤이 된다. 대신 **연령대를 행으로 세운다** —
 * 화면의 세로 배열이 곧 피라미드의 세로 배열이라 입력하면서 모양이 보인다.
 *
 * upsert는 부분 갱신이라 여기서 보내는 18칸 + 연도만 바뀐다. 같은 연도의 총인구·
 * 출생률 등 '인구' 탭 값은 건드리지 않는다.
 */
export function PopulationPyramidPanel({ countryId }: Props) {
  const query = useDemographicIndicators(countryId)
  const upsert = useUpsertDemographicIndicator(countryId)

  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [yearInput, setYearInput] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})

  const rows = useMemo(() => {
    const list = (query.data ?? []) as DemographicIndicator[]
    return list
      .map((indicator) => ({
        indicator,
        totals: pyramidTotals(toPyramidRows(indicator)),
      }))
      .filter((row) => row.totals.total > 0)
      .sort((left, right) => right.indicator.year - left.indicator.year)
  }, [query.data])

  const liveTotals = useMemo(() => {
    let male = 0
    let female = 0
    for (const bracket of AGE_BRACKETS) {
      male += Number(form[maleFieldOf(bracket)] || 0) || 0
      female += Number(form[femaleFieldOf(bracket)] || 0) || 0
    }
    return { male, female, total: male + female }
  }, [form])

  const reset = () => {
    setEditingYear(null)
    setYearInput('')
    setForm({})
  }

  const startEdit = (indicator: DemographicIndicator) => {
    setEditingYear(indicator.year)
    setYearInput(String(indicator.year))
    const source = indicator as unknown as Record<string, unknown>
    const next: Record<string, string> = {}
    for (const bracket of AGE_BRACKETS) {
      for (const field of [maleFieldOf(bracket), femaleFieldOf(bracket)]) {
        const value = source[field]
        next[field] = value == null ? '' : String(value)
      }
    }
    setForm(next)
  }

  /** 18칸만 담은 dto — 여기 없는 키는 서버에서 기존 값이 보존된다. */
  const buildDto = (year: number, valueOf: (field: string) => string | null) => {
    const dto: Record<string, unknown> = { year }
    for (const bracket of AGE_BRACKETS) {
      for (const field of [maleFieldOf(bracket), femaleFieldOf(bracket)]) {
        dto[field] = valueOf(field)
      }
    }
    return dto
  }

  const handleSave = async () => {
    const year = parseInt(yearInput, 10)
    if (!Number.isInteger(year)) {
      notify.error('연도를 정확히 입력하세요')
      return
    }
    for (const bracket of AGE_BRACKETS) {
      for (const [field, who] of [
        [maleFieldOf(bracket), '남성'],
        [femaleFieldOf(bracket), '여성'],
      ] as const) {
        const raw = (form[field] ?? '').trim()
        if (raw === '') continue
        const parsed = Number(raw)
        if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
          notify.error(`${bracket.formLabel} ${who}: 0 이상의 정수를 입력하세요`)
          return
        }
      }
    }
    const dto = buildDto(year, (field) => {
      const raw = (form[field] ?? '').trim()
      return raw === '' ? null : raw
    })
    try {
      await upsert.mutateAsync(dto as never)
      notify.success(`${year}년 연령대별 인구 저장됨`)
      reset()
    } catch {
      notify.error('저장 실패')
    }
  }

  /**
   * 그 해의 연령대별 인구만 지운다. 지표 행 자체를 삭제하면 같은 연도의 총인구·
   * 출생률까지 함께 날아가므로 18칸만 null로 덮는다.
   */
  const handleClear = async (year: number) => {
    if (
      !(await confirm({
        title: '연령대별 인구 지우기',
        message: `${year}년의 연령대별 성별 인구를 지울까요? 같은 해의 총인구·출생률 등 다른 인구 지표는 그대로 남습니다.`,
        danger: true,
      }))
    )
      return
    try {
      await upsert.mutateAsync(buildDto(year, () => null) as never)
      notify.success('지워짐')
      if (editingYear === year) reset()
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
              <th>남성</th>
              <th>여성</th>
              <th>합계</th>
              <th>성비</th>
              <th aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <S.EmptyHint>
                    등록된 연령대별 인구가 없습니다. 아래에서 연도를 정하고
                    연령대별 남·여 인구를 입력하세요.
                  </S.EmptyHint>
                </td>
              </tr>
            ) : (
              rows.map(({ indicator, totals }) => (
                <tr key={indicator.year}>
                  <td>{indicator.year}</td>
                  <td>{fmt(totals.male)}</td>
                  <td>{fmt(totals.female)}</td>
                  <td>{fmt(totals.total)}</td>
                  <td>
                    {totals.female > 0
                      ? ((totals.male / totals.female) * 100).toFixed(1)
                      : '—'}
                  </td>
                  <td>
                    <S.RowActions>
                      <S.IconBtn
                        type="button"
                        onClick={() => startEdit(indicator)}
                      >
                        수정
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        $danger
                        onClick={() => handleClear(indicator.year)}
                      >
                        지우기
                      </S.IconBtn>
                    </S.RowActions>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </S.Table>
      </S.TableScroll>

      <S.Field style={{ maxWidth: 160, marginBottom: 14 }}>
        연도 *
        <S.Input
          type="number"
          value={yearInput}
          onChange={(event) => setYearInput(event.target.value)}
          placeholder="2024"
          disabled={editingYear != null}
        />
      </S.Field>

      <BracketTable>
        <thead>
          <tr>
            <th>연령대</th>
            <th>남성</th>
            <th>여성</th>
          </tr>
        </thead>
        <tbody>
          {AGE_BRACKETS.map((bracket) => (
            <tr key={bracket.key}>
              <th scope="row">{bracket.formLabel}</th>
              {[
                { field: maleFieldOf(bracket), who: '남성' },
                { field: femaleFieldOf(bracket), who: '여성' },
              ].map(({ field, who }) => (
                <td key={field}>
                  <S.Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    aria-label={`${bracket.formLabel} ${who} 인구`}
                    value={form[field] ?? ''}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [field]: event.target.value,
                      }))
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">합계</th>
            <td>{fmt(liveTotals.male)}</td>
            <td>{fmt(liveTotals.female)}</td>
          </tr>
        </tfoot>
      </BracketTable>

      <S.FormBar>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {editingYear != null
            ? `${editingYear}년 수정 중 — 빈 칸은 값 삭제(null)로 저장됩니다`
            : '연도와 연령대별 인구를 입력하세요 (같은 연도면 갱신)'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {editingYear != null && (
            <S.GhostButton type="button" onClick={reset}>
              취소
            </S.GhostButton>
          )}
          <S.PrimaryButton
            type="button"
            onClick={handleSave}
            disabled={upsert.isPending}
          >
            {editingYear != null ? '수정 저장' : '추가'}
          </S.PrimaryButton>
        </div>
      </S.FormBar>
    </div>
  )
}

export default PopulationPyramidPanel

/**
 * 연령대를 행으로 세운 입력표. 화면의 세로 배열이 곧 피라미드의 세로 배열이다
 * (다만 표는 위→아래가 어린 연령 순 — 차트에서 뒤집어 쌓는다).
 */
const BracketTable = styled.table`
  width: 100%;
  /* 열 너비 합(484px)까지만. fixed 레이아웃은 남는 폭을 열에 비례 배분하므로
     상한을 안 걸면 입력칸이 모달 끝까지 늘어난다 */
  max-width: 520px;
  /* 고정 레이아웃이라야 아래 열 너비가 실제로 먹는다 (auto면 내용이 이긴다) */
  table-layout: fixed;
  border-collapse: collapse;
  margin-bottom: 14px;

  th,
  td {
    padding: 4px 6px;
    text-align: left;
  }

  thead th {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    padding-bottom: 6px;
  }

  tbody th,
  tfoot th {
    width: 84px;
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;
  }

  /* 연령대 84px + 남·여 각 200px. 두 칸이 화면 끝까지 벌어지면 한 쌍으로 안 읽힌다 */
  th:first-child,
  td:first-child {
    width: 84px;
  }

  th:nth-child(2),
  td:nth-child(2),
  th:nth-child(3),
  td:nth-child(3) {
    width: 200px;
  }

  tbody input {
    width: 100%;
  }

  tfoot {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }

  tfoot th,
  tfoot td {
    padding-top: 8px;
    font-size: 12.5px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
