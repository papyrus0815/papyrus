import { useState } from 'react'

import {
  useExportImports,
  useUpsertExportImport,
  useDeleteExportImport,
} from '@/entities/country/api.trade'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import * as S from './styles'

interface Props {
  countryId: string
}

export function TradePanel({ countryId }: Props) {
  const { data: rows = [], isLoading } = useExportImports(countryId)
  const upsertMut = useUpsertExportImport(countryId)
  const deleteMut = useDeleteExportImport(countryId)

  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [yearInput, setYearInput] = useState('')
  const [exportValue, setExportValue] = useState('')
  const [importValue, setImportValue] = useState('')

  const reset = () => {
    setEditingYear(null)
    setYearInput('')
    setExportValue('')
    setImportValue('')
  }

  const startEdit = (year: number, exp: number | null, imp: number | null) => {
    setEditingYear(year)
    setYearInput(String(year))
    setExportValue(exp == null ? '' : String(exp))
    setImportValue(imp == null ? '' : String(imp))
  }

  const parseNum = (raw: string): number | null => {
    const t = raw.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isNaN(n) ? null : n
  }

  const handleSave = async () => {
    const year = parseInt(yearInput, 10)
    if (!Number.isInteger(year)) {
      notify.error('연도를 정확히 입력하세요')
      return
    }
    try {
      await upsertMut.mutateAsync({
        year,
        exportValue: parseNum(exportValue),
        importValue: parseNum(importValue),
      })
      notify.success(`${year}년 교역 저장됨`)
      reset()
    } catch {
      notify.error('저장 실패')
    }
  }

  const handleDelete = async (year: number) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `${year}년 교역 데이터를 삭제할까요?`,
        danger: true,
      }))
    )
      return
    try {
      await deleteMut.mutateAsync(year)
      notify.success('삭제됨')
      if (editingYear === year) reset()
    } catch {
      notify.error('삭제 실패')
    }
  }

  const sorted = rows.slice().sort((a, b) => b.year - a.year)
  const fmt = (v: number | null) => (v == null ? '—' : v.toLocaleString())

  return (
    <div>
      <S.TableScroll>
        <S.Table>
          <thead>
            <tr>
              <th>연도</th>
              <th>수출액</th>
              <th>수입액</th>
              <th>무역수지</th>
              <th aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5}>
                  <S.EmptyHint>불러오는 중…</S.EmptyHint>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <S.EmptyHint>등록된 교역 데이터가 없습니다.</S.EmptyHint>
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>{fmt(r.exportValue)}</td>
                  <td>{fmt(r.importValue)}</td>
                  <td>
                    {r.exportValue != null && r.importValue != null
                      ? (r.exportValue - r.importValue).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <S.RowActions>
                      <S.IconBtn
                        type="button"
                        onClick={() =>
                          startEdit(r.year, r.exportValue, r.importValue)
                        }
                      >
                        수정
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        $danger
                        onClick={() => handleDelete(r.year)}
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

      <S.FormGrid style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
        <S.Field>
          수출액
          <S.Input
            type="number"
            value={exportValue}
            onChange={(e) => setExportValue(e.target.value)}
          />
        </S.Field>
        <S.Field>
          수입액
          <S.Input
            type="number"
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
          />
        </S.Field>
      </S.FormGrid>

      <S.FormBar>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {editingYear != null
            ? `${editingYear}년 수정 중`
            : '연도별 수출·수입 총액 (같은 연도면 갱신)'}
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
            disabled={upsertMut.isPending}
          >
            {editingYear != null ? '수정 저장' : '추가'}
          </S.PrimaryButton>
        </div>
      </S.FormBar>
    </div>
  )
}
