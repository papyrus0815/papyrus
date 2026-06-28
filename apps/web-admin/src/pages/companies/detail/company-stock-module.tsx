import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiPlus, FiTrash2 } from 'react-icons/fi'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styled, { useTheme } from 'styled-components'

import type {
  CompanyStockPointInput,
  CompanyStockPointItem,
  OutlookStance,
  UpdateCompanyInput,
} from '@/shared/api/company'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import {
  formatCompactKo,
  formatGrouped,
  numToStr,
  readCompactKo,
  readGrouped,
  strToNum,
} from '@/shared/lib/number-format'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { InlineDate, InlineRichText, InlineText } from '@/shared/ui/inline-edit'

import { changeTone, stanceTone, toneColor } from './financial-tone'
import { TonePill, ToneTag } from './tone-pill'
import * as S from './company-detail.styles'

interface StockRow {
  key: string
  serverId?: string
  date: string | null
  price: string
  marketCap: string
  currency: string
  source: string
  /* 입력 컨트롤 없는 보존 필드. */
  note: string | null
  revenue: number | null
}

function makeRow(point: CompanyStockPointItem, key: string): StockRow {
  return {
    key,
    serverId: point.id,
    date: point.date,
    price: numToStr(point.price),
    marketCap: numToStr(point.marketCap),
    currency: point.currency ?? '',
    source: point.source ?? '',
    note: point.note,
    revenue: point.revenue,
  }
}

/** 최신 전망의 예상범위 — 주가 차트에 가로 밴드+목표선으로 오버레이. */
export interface ForecastBand {
  low: number | null
  high: number | null
  target: number | null
  stance: OutlookStance | null
}

interface CompanyStockModuleProps {
  stockPoints: CompanyStockPointItem[]
  /** 재무·주가 분석 코멘터리(리치텍스트). 섹션 단위 서술. */
  financialCommentary: string | null
  /** 최신 전망 밴드(차트 오버레이용). 없으면 미표시. */
  forecastBand?: ForecastBand | null
  onPatch: (patch: UpdateCompanyInput) => void
  onPersonClick?: (personId: string) => void
}

/**
 * 주가·재무 시계열 편집 — 날짜별 주가·시가총액 스냅샷을 기록하고 차트로 본다.
 * 상단에 재무 코멘터리(리치텍스트), 각 행에 직전 시점 대비 등락(▲/▼·%)을 자동 계산해 표시.
 * 서버 delete-and-recreate(date unique). 연혁의 "당시 주가"와 함께 발표↔주가 상관 파악.
 */
export function CompanyStockModule({
  stockPoints,
  financialCommentary,
  forecastBand,
  onPatch,
  onPersonClick,
}: CompanyStockModuleProps) {
  const theme = useTheme()
  const dark = theme.mode === 'dark'
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `stock-${Date.now()}-${++counterRef.current}`,
    [],
  )

  const serverRows = useMemo(
    () =>
      (stockPoints ?? [])
        .slice()
        // BC 포함 안전 정렬 — 문자열 비교는 음수연도를 역순으로 깨므로 dateSortKey(숫자).
        .sort((a, right) => (dateSortKey(a.date) ?? 0) - (dateSortKey(right.date) ?? 0)),
    [stockPoints],
  )

  const [rows, setRows] = useState<StockRow[]>(() =>
    serverRows.map((point) => makeRow(point, nextKey())),
  )

  useEffect(() => {
    setRows((prev) => syncRows(prev, serverRows, nextKey))
  }, [serverRows, nextKey])

  const commitRows = (next: StockRow[]) => {
    setRows(next)
    const withDate = next.filter((row) => !!row.date)
    /* 동일 시점(같은 날짜) dedup — 마지막 값 우선. 서버도 @@unique([companyId,date])라
       같은 키로 묶이므로, 프론트에서 미리 합쳐 무경고 소실 대신 *명시 경고*한다. */
    const byInstant = new Map<string, CompanyStockPointInput>()
    for (const row of withDate) {
      byInstant.set(new Date(row.date as string).toISOString(), {
        date: row.date as string,
        price: strToNum(row.price),
        marketCap: strToNum(row.marketCap),
        revenue: row.revenue,
        currency: row.currency.trim() || null,
        source: row.source.trim() || null,
        note: row.note,
      })
    }
    const cleaned = Array.from(byInstant.values())
    if (cleaned.length < withDate.length) {
      notify.warning('같은 날짜의 시점은 마지막 값으로 합쳐집니다.')
    }
    onPatch({ stockPoints: cleaned })
  }

  const addRow = () => {
    setRows((arr) => [
      ...arr,
      {
        key: nextKey(),
        date: null,
        price: '',
        marketCap: '',
        currency: '',
        source: '',
        note: null,
        revenue: null,
      },
    ])
  }

  const updateRow = (idx: number, patch: Partial<StockRow>) => {
    commitRows(rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeRow = async (idx: number) => {
    const row = rows[idx]
    if (!row) return
    const hasContent =
      !!row.date ||
      !!row.price.trim() ||
      !!row.marketCap.trim() ||
      !!row.currency.trim() ||
      !!row.source.trim()
    if (
      hasContent &&
      !(await confirm({
        title: '시점 삭제',
        message: '이 주가·재무 시점을 삭제할까요? 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) {
      return
    }
    commitRows(rows.filter((entry) => entry.key !== row.key))
  }

  /* 차트 데이터 — 날짜+주가가 있는 행만, 날짜순. 로컬 rows 기준이라 입력 즉시 반영. */
  const chartData = useMemo(
    () =>
      rows
        .map((row) => ({
          date: row.date,
          price: strToNum(row.price),
        }))
        .filter(
          (point): point is { date: string; price: number } =>
            !!point.date && point.price != null,
        )
        .sort(
          (a, right) => (dateSortKey(a.date) ?? 0) - (dateSortKey(right.date) ?? 0),
        )
        .map((point) => ({ label: point.date.slice(0, 10), price: point.price })),
    [rows],
  )

  /* 직전 시점 대비 등락(절대·%) — 날짜+주가 있는 행을 날짜순 정렬해 인접 차분. */
  const delta = useMemo(() => {
    const priced = rows
      .filter((row) => row.date && strToNum(row.price) != null)
      .slice()
      .sort(
        (a, right) => (dateSortKey(a.date) ?? 0) - (dateSortKey(right.date) ?? 0),
      )
    const map = new Map<string, { abs: number; pct: number }>()
    for (let i = 1; i < priced.length; i++) {
      const cur = strToNum(priced[i].price) as number
      const prev = strToNum(priced[i - 1].price) as number
      if (prev !== 0)
        map.set(priced[i].key, { abs: cur - prev, pct: ((cur - prev) / prev) * 100 })
    }
    let periodPct: number | null = null
    if (priced.length >= 2) {
      const first = strToNum(priced[0].price) as number
      const last = strToNum(priced[priced.length - 1].price) as number
      if (first !== 0) periodPct = ((last - first) / first) * 100
    }
    return { map, periodPct }
  }, [rows])

  const fmtNum = (value: number) =>
    value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })

  /* 전망 밴드 오버레이 — 예상범위가 차트 데이터 범위 밖이면 Y축 도메인을 넓혀 보이게 한다. */
  const bandTone = forecastBand?.stance
    ? stanceTone(forecastBand.stance)
    : 'neutral'
  const bandValues = forecastBand
    ? [forecastBand.low, forecastBand.high, forecastBand.target].filter(
        (value): value is number => value != null,
      )
    : []
  const yDomain: [number, number] | ['auto', 'auto'] = (() => {
    if (bandValues.length === 0) return ['auto', 'auto']
    const all = [...chartData.map((point) => point.price), ...bandValues]
    const min = Math.min(...all)
    const max = Math.max(...all)
    const pad = (max - min) * 0.08 || max * 0.05 || 1
    return [Math.floor(min - pad), Math.ceil(max + pad)]
  })()

  return (
    <S.Section id="company-stock">
      <S.SectionHeader>
        <S.SectionTitle>주가 · 재무</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>{rows.length}개 시점</S.SectionSubtitle>
        )}
        {delta.periodPct != null && (
          <TonePill $tone={changeTone(delta.periodPct)}>
            {delta.periodPct >= 0 ? '▲' : '▼'} 기간{' '}
            {delta.periodPct >= 0 ? '+' : ''}
            {delta.periodPct.toFixed(1)}%
          </TonePill>
        )}
      </S.SectionHeader>

      <S.RowNarrative>
        <S.RowFieldLabel>재무 분석</S.RowFieldLabel>
        <InlineRichText
          value={financialCommentary ?? ''}
          onSave={(next) =>
            onPatch({
              financialCommentary: isVisuallyEmptyRichText(next) ? null : next,
            })
          }
          placeholder="주가·재무 분석 코멘터리 — 실적·수급·이슈 등 자유 서술"
          onPersonClick={onPersonClick}
          stickyEditButton={false}
        />
      </S.RowNarrative>

      {chartData.length === 1 && (
        <S.EmptyState>
          주가 시점을 1개 더 추가하면 추세 차트가 표시됩니다.
        </S.EmptyState>
      )}

      {chartData.length >= 2 && (
        <ChartBox
          role="img"
          aria-label={`주가 추세 차트 — ${chartData.length}개 시점, ${chartData[0].label}부터 ${chartData[chartData.length - 1].label}까지`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.colors.border.default}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: theme.colors.text.tertiary }}
                stroke={theme.colors.border.default}
                tickFormatter={(label: string) => {
                  const parts = parseIsoDateParts(label)
                  return parts
                    ? `${String(parts.year).slice(-2)}.${parts.month}`
                    : label
                }}
              />
              <YAxis
                width={52}
                tick={{ fontSize: 11, fill: theme.colors.text.tertiary }}
                stroke={theme.colors.border.default}
                domain={yDomain}
                tickFormatter={(value: number) => formatCompactKo(value)}
              />
              <Tooltip
                contentStyle={{
                  background: theme.colors.background.primary,
                  border: `1px solid ${theme.colors.border.default}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value: number) => [formatGrouped(value), '주가']}
              />
              {forecastBand?.low != null && forecastBand.high != null && (
                <ReferenceArea
                  y1={forecastBand.low}
                  y2={forecastBand.high}
                  fill={toneColor(bandTone, dark)}
                  fillOpacity={0.1}
                  stroke="none"
                  ifOverflow="extendDomain"
                />
              )}
              {forecastBand?.target != null && (
                <ReferenceLine
                  y={forecastBand.target}
                  stroke={toneColor(bandTone, dark)}
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  ifOverflow="extendDomain"
                  label={{
                    value: '전망',
                    position: 'right',
                    fontSize: 10,
                    fill: toneColor(bandTone, dark),
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="price"
                stroke={theme.colors.primary}
                strokeWidth={2}
                dot={{ ['r']: 2 }}
                activeDot={{ ['r']: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      )}

      {rows.length === 0 ? (
        <S.EmptyState>
          날짜별 주가·시가총액을 기록하면 차트로 추세를 보고, 연혁의 발표 시점과 비교할
          수 있습니다.
        </S.EmptyState>
      ) : (
        <S.RowStack>
          {rows.map((row, idx) => {
            const change = delta.map.get(row.key)
            return (
            <S.Row key={row.key}>
              <S.RowHeader>
                <S.RowTitleHost>
                  <InlineDate
                    value={row.date}
                    onSave={(next) => updateRow(idx, { date: next })}
                    emptyLabel="기준일 선택"
                    pickerTitle="기준일 선택"
                    blockBc
                    label="기준일"
                  />
                </S.RowTitleHost>
                {change && (
                  <ToneTag $tone={changeTone(change.abs)}>
                    {change.abs >= 0 ? '▲' : '▼'} {fmtNum(Math.abs(change.abs))}
                    <span>
                      ({change.pct >= 0 ? '+' : ''}
                      {change.pct.toFixed(1)}%)
                    </span>
                  </ToneTag>
                )}
                <S.ManageActions>
                  <S.IconBtn
                    type="button"
                    onClick={() => void removeRow(idx)}
                    aria-label="시점 삭제"
                    $danger
                  >
                    <FiTrash2 />
                  </S.IconBtn>
                </S.ManageActions>
              </S.RowHeader>

              <S.RowMetaLine>
                <span>
                  <S.RowFieldLabel>주가</S.RowFieldLabel>
                  <InlineText
                    value={row.price}
                    onSave={(next) => updateRow(idx, { price: next })}
                    placeholder="예: 884"
                    label="주가"
                    formatRead={readGrouped}
                    numeric
                  />
                </span>
                <span>
                  <S.RowFieldLabel>통화</S.RowFieldLabel>
                  <InlineText
                    value={row.currency}
                    onSave={(next) => updateRow(idx, { currency: next })}
                    placeholder="USD"
                    label="통화"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>시가총액</S.RowFieldLabel>
                  <InlineText
                    value={row.marketCap}
                    onSave={(next) => updateRow(idx, { marketCap: next })}
                    placeholder="원 단위 숫자"
                    label="시가총액"
                    formatRead={readCompactKo}
                    numeric
                  />
                </span>
              </S.RowMetaLine>

              <S.RowMetaLine>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <S.RowFieldLabel>출처</S.RowFieldLabel>
                  <InlineText
                    value={row.source}
                    onSave={(next) => updateRow(idx, { source: next })}
                    placeholder="출처 (선택)"
                    label="출처"
                  />
                </span>
              </S.RowMetaLine>

              {!row.date &&
                (!!row.price || !!row.marketCap || !!row.currency.trim()) && (
                  <DateWarn>⚠ 기준일을 선택해야 저장됩니다.</DateWarn>
                )}
            </S.Row>
            )
          })}
        </S.RowStack>
      )}

      <S.AddButton type="button" onClick={addRow}>
        <FiPlus /> 시점 추가
      </S.AddButton>
    </S.Section>
  )
}

const DateWarn = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => toneColor('warning', theme.mode === 'dark')};
`

const ChartBox = styled.div`
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 0.75rem 0.5rem 0.25rem;
`

/** server↔로컬 키 보존 동기화(date 기준 매칭). */
function syncRows(
  prev: StockRow[],
  server: CompanyStockPointItem[],
  nextKey: () => string,
): StockRow[] {
  if (prev.length === server.length) {
    return server.map((srv, i) => {
      const p = prev[i]
      const prevIsAhead =
        p.serverId === undefined ||
        (p.serverId !== srv.id && p.date !== srv.date)
      if (prevIsAhead) return { ...p, serverId: srv.id }
      return makeRow(srv, p.key)
    })
  }

  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: StockRow[] = []
  for (const srv of server) {
    let matchedIdx = prev.findIndex(
      (p, i) => !prevUsed[i] && p.serverId === srv.id,
    )
    if (matchedIdx < 0) {
      matchedIdx = prev.findIndex((p, i) => !prevUsed[i] && p.date === srv.date)
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push(makeRow(srv, prev[matchedIdx].key))
    } else {
      next.push(makeRow(srv, nextKey()))
    }
  }
  for (let i = 0; i < prev.length; i++) {
    if (!prevUsed[i]) next.push(prev[i])
  }
  return next
}
