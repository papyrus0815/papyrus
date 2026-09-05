import { useState } from 'react'

import {
  useExportImports,
  useUpsertExportImport,
  useDeleteExportImport,
  type ExportImport,
  type TradeDirection,
  type UpsertExportImportItem,
} from '@/entities/country/api.trade'
import { useCountries } from '@/entities/country/api'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import * as S from './styles'

interface Props {
  countryId: string
}

/** 편집 중인 품목 한 줄 — 서버 id는 들고 다니지 않는다(배열 통째 교체) */
interface ItemDraft {
  key: string
  direction: TradeDirection
  name: string
  value: string
  sharePct: string
  hsCode: string
  partnerCountryId: string
}

const emptyDraft = (direction: TradeDirection): ItemDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  direction,
  name: '',
  value: '',
  sharePct: '',
  hsCode: '',
  partnerCountryId: '',
})

function parseNum(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

export function TradePanel({ countryId }: Props) {
  const { data: rows = [], isLoading } = useExportImports(countryId)
  const { data: countries = [] } = useCountries()
  const upsertMut = useUpsertExportImport(countryId)
  const deleteMut = useDeleteExportImport(countryId)

  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [yearInput, setYearInput] = useState('')
  const [exportValue, setExportValue] = useState('')
  const [importValue, setImportValue] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([])
  /*
   * 품목을 손대지 않은 저장은 items를 **보내지 않는다**(서버가 undefined면 건드리지 않음).
   * 매번 보내면 내용이 같아도 delete-and-recreate라 행 id가 계속 갈린다.
   */
  const [itemsDirty, setItemsDirty] = useState(false)

  const reset = () => {
    setEditingYear(null)
    setYearInput('')
    setExportValue('')
    setImportValue('')
    setItems([])
    setItemsDirty(false)
  }

  const startEdit = (row: ExportImport) => {
    setEditingYear(row.year)
    setYearInput(String(row.year))
    setExportValue(row.exportValue == null ? '' : String(row.exportValue))
    setImportValue(row.importValue == null ? '' : String(row.importValue))
    setItems(
      (row.items ?? []).map((item, index) => ({
        key: `${item.id}-${index}`,
        direction: item.direction,
        name: item.name,
        value: item.value == null ? '' : String(item.value),
        sharePct: item.sharePct == null ? '' : String(item.sharePct),
        hsCode: item.hsCode ?? '',
        partnerCountryId: item.partnerCountryId ?? '',
      })),
    )
    setItemsDirty(false)
  }

  const patchItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
    setItemsDirty(true)
  }

  const addItem = (direction: TradeDirection) => {
    setItems((prev) => [...prev, emptyDraft(direction)])
    setItemsDirty(true)
  }

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
    setItemsDirty(true)
  }

  const handleSave = async () => {
    const year = parseInt(yearInput, 10)
    if (!Number.isInteger(year)) {
      notify.error('연도를 정확히 입력하세요')
      return
    }
    // 이름 없는 품목은 저장할 것이 없다 — 빈 줄로 남기지 말고 조용히 버린다
    const named = items.filter((item) => item.name.trim() !== '')
    if (itemsDirty && named.length !== items.length) {
      notify.info('품목명이 빈 줄은 저장하지 않았습니다')
    }
    const payloadItems: UpsertExportImportItem[] = named.map((item, index) => ({
      direction: item.direction,
      name: item.name.trim(),
      hsCode: item.hsCode.trim() || null,
      value: parseNum(item.value),
      sharePct: parseNum(item.sharePct),
      partnerCountryId: item.partnerCountryId || null,
      sortOrder: index,
    }))
    try {
      await upsertMut.mutateAsync({
        year,
        exportValue: parseNum(exportValue),
        importValue: parseNum(importValue),
        ...(itemsDirty ? { items: payloadItems } : {}),
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
        message: `${year}년 교역 데이터를 삭제할까요? 그 해 품목도 함께 지워집니다.`,
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

  const sorted = rows.slice().sort((left, right) => right.year - left.year)
  const fmt = (value: number | null) =>
    value == null ? '—' : value.toLocaleString()

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
              <th>품목</th>
              <th aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6}>
                  <S.EmptyHint>불러오는 중…</S.EmptyHint>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <S.EmptyHint>등록된 교역 데이터가 없습니다.</S.EmptyHint>
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{fmt(row.exportValue)}</td>
                  <td>{fmt(row.importValue)}</td>
                  <td>
                    {row.exportValue != null && row.importValue != null
                      ? (row.exportValue - row.importValue).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    {(row.items ?? []).length > 0
                      ? `${row.items.length}개`
                      : '—'}
                  </td>
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

      <S.FormGrid style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
          수출액
          <S.Input
            type="number"
            value={exportValue}
            onChange={(event) => setExportValue(event.target.value)}
          />
        </S.Field>
        <S.Field>
          수입액
          <S.Input
            type="number"
            value={importValue}
            onChange={(event) => setImportValue(event.target.value)}
          />
        </S.Field>
      </S.FormGrid>

      {/*
        품목 — 총액만으로는 "얼마나"에만 답한다. 무엇을 수출·수입했는지는 여기서 채운다.
        금액과 비중은 둘 중 하나만 아는 자료가 흔해 모두 선택 항목이다.
      */}
      <S.ItemSectionTitle>
        품목
        <S.ItemSectionHint>
          무엇을 수출·수입했는지 · 금액과 비중은 아는 것만 넣어도 된다
        </S.ItemSectionHint>
      </S.ItemSectionTitle>

      {items.length > 0 && (
        <>
          <S.ItemHeadRow>
            <span>방향</span>
            <span>품목명</span>
            <span>금액</span>
            <span>비중 %</span>
            <span>HS 코드</span>
            <span>상대국</span>
            <span />
          </S.ItemHeadRow>
          <S.ItemRows>
            {items.map((item) => (
              <S.ItemRow key={item.key}>
                <S.ItemSelect
                  value={item.direction}
                  aria-label="교역 방향"
                  onChange={(event) =>
                    patchItem(item.key, {
                      direction: event.target.value as TradeDirection,
                    })
                  }
                >
                  <option value="EXPORT">수출</option>
                  <option value="IMPORT">수입</option>
                </S.ItemSelect>
                <S.Input
                  value={item.name}
                  placeholder="반도체"
                  aria-label="품목명"
                  onChange={(event) =>
                    patchItem(item.key, { name: event.target.value })
                  }
                />
                <S.Input
                  type="number"
                  value={item.value}
                  aria-label="금액"
                  onChange={(event) =>
                    patchItem(item.key, { value: event.target.value })
                  }
                />
                <S.Input
                  type="number"
                  value={item.sharePct}
                  aria-label="비중(%)"
                  onChange={(event) =>
                    patchItem(item.key, { sharePct: event.target.value })
                  }
                />
                <S.Input
                  value={item.hsCode}
                  placeholder="8542"
                  aria-label="HS 코드"
                  onChange={(event) =>
                    patchItem(item.key, { hsCode: event.target.value })
                  }
                />
                <S.ItemSelect
                  value={item.partnerCountryId}
                  aria-label="교역 상대국"
                  onChange={(event) =>
                    patchItem(item.key, {
                      partnerCountryId: event.target.value,
                    })
                  }
                >
                  <option value="">상대국 없음</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </S.ItemSelect>
                <S.IconBtn
                  type="button"
                  $danger
                  aria-label={`${item.name || '빈'} 품목 삭제`}
                  onClick={() => removeItem(item.key)}
                >
                  ✕
                </S.IconBtn>
              </S.ItemRow>
            ))}
          </S.ItemRows>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <S.GhostButton type="button" onClick={() => addItem('EXPORT')}>
          + 수출 품목
        </S.GhostButton>
        <S.GhostButton type="button" onClick={() => addItem('IMPORT')}>
          + 수입 품목
        </S.GhostButton>
      </div>

      <S.FormBar>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {editingYear != null
            ? `${editingYear}년 수정 중${itemsDirty ? ' · 품목 변경됨' : ''}`
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
