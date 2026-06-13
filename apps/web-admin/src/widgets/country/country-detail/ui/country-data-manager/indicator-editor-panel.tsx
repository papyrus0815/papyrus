import { useState } from 'react'

import {
  useEconomicIndicators,
  useDemographicIndicators,
  useDevelopmentIndicators,
  useUpsertEconomicIndicator,
  useDeleteEconomicIndicator,
  useUpsertDemographicIndicator,
  useDeleteDemographicIndicator,
  useUpsertDevelopmentIndicator,
  useDeleteDevelopmentIndicator,
} from '@/entities/country/api.indicators'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import { INDICATOR_META, type IndicatorType } from './field-configs'
import * as S from './styles'

interface Props {
  countryId: string
  type: IndicatorType
}

type Row = Record<string, unknown> & { year: number }

export function IndicatorEditorPanel({ countryId, type }: Props) {
  const econ = useEconomicIndicators(countryId)
  const demo = useDemographicIndicators(countryId)
  const dev = useDevelopmentIndicators(countryId)
  const upEcon = useUpsertEconomicIndicator(countryId)
  const delEcon = useDeleteEconomicIndicator(countryId)
  const upDemo = useUpsertDemographicIndicator(countryId)
  const delDemo = useDeleteDemographicIndicator(countryId)
  const upDev = useUpsertDevelopmentIndicator(countryId)
  const delDev = useDeleteDevelopmentIndicator(countryId)

  const query = type === 'economic' ? econ : type === 'demographic' ? demo : dev
  const isPending =
    upEcon.isPending ||
    upDemo.isPending ||
    upDev.isPending ||
    delEcon.isPending ||
    delDemo.isPending ||
    delDev.isPending

  // 유니온 호출 회피를 위해 타입별 분기 헬퍼
  const upsertFn = (dto: { year: number } & Record<string, unknown>) => {
    if (type === 'economic') return upEcon.mutateAsync(dto as never)
    if (type === 'demographic') return upDemo.mutateAsync(dto as never)
    return upDev.mutateAsync(dto as never)
  }
  const removeFn = (year: number) => {
    if (type === 'economic') return delEcon.mutateAsync(year)
    if (type === 'demographic') return delDemo.mutateAsync(year)
    return delDev.mutateAsync(year)
  }

  const meta = INDICATOR_META[type]
  const fields = meta.fields
  const rows = ((query.data ?? []) as Row[]).slice().sort((a, b) => b.year - a.year)

  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [yearInput, setYearInput] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})

  const reset = () => {
    setEditingYear(null)
    setYearInput('')
    setForm({})
  }

  const startEdit = (row: Row) => {
    setEditingYear(row.year)
    setYearInput(String(row.year))
    const next: Record<string, string> = {}
    for (const f of fields) {
      const v = row[f.key]
      next[f.key] = v == null ? '' : String(v)
    }
    setForm(next)
  }

  const handleSave = async () => {
    const year = parseInt(yearInput, 10)
    if (!Number.isInteger(year)) {
      notify.error('연도를 정확히 입력하세요')
      return
    }
    const dto: { year: number } & Record<string, unknown> = { year }
    for (const f of fields) {
      const raw = (form[f.key] ?? '').trim()
      if (raw === '') {
        dto[f.key] = null
        continue
      }
      if (f.kind === 'text') {
        dto[f.key] = raw
      } else {
        const n = Number(raw)
        if (Number.isNaN(n)) {
          notify.error(`${f.label}: 숫자를 입력하세요`)
          return
        }
        dto[f.key] = n
      }
    }
    try {
      await upsertFn(dto)
      notify.success(`${year}년 ${meta.label} 지표 저장됨`)
      reset()
    } catch {
      notify.error('저장 실패')
    }
  }

  const handleDelete = async (year: number) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `${year}년 ${meta.label} 지표를 삭제할까요?`,
        danger: true,
      }))
    )
      return
    try {
      await removeFn(year)
      notify.success('삭제됨')
      if (editingYear === year) reset()
    } catch {
      notify.error('삭제 실패')
    }
  }

  const fmt = (v: unknown) =>
    v == null || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v)

  return (
    <div>
      <S.TableScroll>
        <S.Table>
          <thead>
            <tr>
              <th>연도</th>
              {fields.map((f) => (
                <th key={f.key}>
                  {f.label}
                  {f.unit ? ` (${f.unit})` : ''}
                </th>
              ))}
              <th aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={fields.length + 2}>
                  <S.EmptyHint>
                    등록된 {meta.label} 지표가 없습니다. 아래에서 연도별로
                    추가하세요.
                  </S.EmptyHint>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  {fields.map((f) => (
                    <td key={f.key}>{fmt(row[f.key])}</td>
                  ))}
                  <td>
                    <S.RowActions>
                      <S.IconBtn type="button" onClick={() => startEdit(row)}>
                        수정
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        $danger
                        onClick={() => handleDelete(row.year)}
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
            onChange={(e) => setYearInput(e.target.value)}
            placeholder="2024"
            disabled={editingYear != null}
          />
        </S.Field>
        {fields.map((f) => (
          <S.Field key={f.key}>
            {f.label}
            {f.unit ? ` (${f.unit})` : ''}
            <S.Input
              type={f.kind === 'text' ? 'text' : 'number'}
              value={form[f.key] ?? ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
            />
          </S.Field>
        ))}
      </S.FormGrid>

      <S.FormBar>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {editingYear != null
            ? `${editingYear}년 수정 중 — 빈 칸은 값 삭제(null)로 저장됩니다`
            : '연도+값을 입력해 추가하세요 (같은 연도면 갱신)'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {editingYear != null && (
            <S.GhostButton type="button" onClick={reset}>
              취소
            </S.GhostButton>
          )}
          <S.PrimaryButton type="button" onClick={handleSave} disabled={isPending}>
            {editingYear != null ? '수정 저장' : '추가'}
          </S.PrimaryButton>
        </div>
      </S.FormBar>
    </div>
  )
}
