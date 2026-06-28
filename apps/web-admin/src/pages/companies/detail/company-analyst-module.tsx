import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiArrowDownRight, FiArrowUpRight, FiPlus, FiTrash2 } from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import type {
  AnalystRating,
  CompanyAnalystRatingInput,
  CompanyAnalystRatingItem,
  UpdateCompanyInput,
} from '@/shared/api/company'
import { numToStr, readGrouped, strToNum } from '@/shared/lib/number-format'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  InlineDate,
  InlineRichText,
  InlineSelect,
  type InlineSelectOption,
  InlineText,
} from '@/shared/ui/inline-edit'

import { ratingTone, toneColor } from './financial-tone'
import { TonePill, ToneTag } from './tone-pill'
import * as S from './company-detail.styles'

const RATING_OPTIONS: InlineSelectOption[] = [
  { value: 'STRONG_BUY', label: '강력매수' },
  { value: 'BUY', label: '매수' },
  { value: 'HOLD', label: '중립' },
  { value: 'SELL', label: '매도' },
  { value: 'STRONG_SELL', label: '강력매도' },
]

const RATING_LABEL: Record<AnalystRating, string> = {
  STRONG_BUY: '강력매수',
  BUY: '매수',
  HOLD: '중립',
  SELL: '매도',
  STRONG_SELL: '강력매도',
}

interface RatingRow {
  key: string
  serverId?: string
  firm: string
  analyst: string
  targetPrice: string
  priorTargetPrice: string
  currency: string
  rating: AnalystRating | ''
  publishedAt: string | null
  reportTitle: string
  sourceUrl: string
  note: string | null
}

function makeRow(item: CompanyAnalystRatingItem, key: string): RatingRow {
  return {
    key,
    serverId: item.id,
    firm: item.firm ?? '',
    analyst: item.analyst ?? '',
    targetPrice: numToStr(item.targetPrice),
    priorTargetPrice: numToStr(item.priorTargetPrice),
    currency: item.currency ?? '',
    rating: item.rating ?? '',
    publishedAt: item.publishedAt,
    reportTitle: item.reportTitle ?? '',
    sourceUrl: item.sourceUrl ?? '',
    note: item.note,
  }
}

interface CompanyAnalystModuleProps {
  analystRatings: CompanyAnalystRatingItem[]
  /** 현재가(최신 주가 시점) — 상승여력 계산용. 없으면 여력 미표시. */
  currentPrice: number | null
  onPatch: (patch: UpdateCompanyInput) => void
  /** 내용(rich text) 본문의 인물 멘션 클릭 핸들러 — 생략 시 인물 상세로 navigate. */
  onPersonClick?: (personId: string) => void
}

/**
 * 증권사 목표주가·투자의견 — 다건을 쌓고 컨센서스(평균·분포·상승여력)를 도출한다.
 * 서버 delete-and-recreate. 현재가는 주가 시계열의 최신 종가에서 받아 상승여력을 계산.
 */
export function CompanyAnalystModule({
  analystRatings,
  currentPrice,
  onPatch,
  onPersonClick,
}: CompanyAnalystModuleProps) {
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `rating-${Date.now()}-${++counterRef.current}`,
    [],
  )

  const serverRows = useMemo(
    () => (analystRatings ?? []).slice(),
    [analystRatings],
  )

  const [rows, setRows] = useState<RatingRow[]>(() =>
    serverRows.map((item) => makeRow(item, nextKey())),
  )

  useEffect(() => {
    setRows((prev) => syncRows(prev, serverRows, nextKey))
  }, [serverRows, nextKey])

  const commitRows = (next: RatingRow[]) => {
    setRows(next)
    /* 증권사명 없는 행은 PUT에서 drop(서버 firm @IsNotEmpty). 로컬은 유지. */
    const cleaned: CompanyAnalystRatingInput[] = next
      .filter((row) => row.firm.trim())
      .map((row, idx) => ({
        firm: row.firm.trim(),
        analyst: row.analyst.trim() || null,
        targetPrice: strToNum(row.targetPrice),
        priorTargetPrice: strToNum(row.priorTargetPrice),
        currency: row.currency.trim() || null,
        rating: row.rating || null,
        publishedAt: row.publishedAt ?? null,
        reportTitle: row.reportTitle.trim() || null,
        sourceUrl: row.sourceUrl.trim() || null,
        note: row.note,
        order: idx,
      }))
    onPatch({ analystRatings: cleaned })
  }

  const addRow = () => {
    setRows((arr) => [
      ...arr,
      {
        key: nextKey(),
        firm: '',
        analyst: '',
        targetPrice: '',
        priorTargetPrice: '',
        currency: '',
        rating: '',
        publishedAt: null,
        reportTitle: '',
        sourceUrl: '',
        note: null,
      },
    ])
  }

  const updateRow = (idx: number, patch: Partial<RatingRow>) => {
    commitRows(rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeRow = async (idx: number) => {
    const row = rows[idx]
    if (!row) return
    const hasContent =
      !!row.firm.trim() || !!row.targetPrice.trim() || !!row.rating
    if (
      hasContent &&
      !(await confirm({
        title: '목표주가 삭제',
        message: '이 증권사 의견을 삭제할까요? 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) {
      return
    }
    commitRows(rows.filter((entry) => entry.key !== row.key))
  }

  const dark = useTheme().mode === 'dark'

  /* 컨센서스 — 목표가가 있는 행 기준. */
  const consensus = useMemo(() => {
    const targets = rows
      .map((row) => strToNum(row.targetPrice))
      .filter((value): value is number => value != null)
    const dist: Record<AnalystRating, number> = {
      STRONG_BUY: 0,
      BUY: 0,
      HOLD: 0,
      SELL: 0,
      STRONG_SELL: 0,
    }
    for (const row of rows) if (row.rating) dist[row.rating] += 1
    if (targets.length === 0) {
      return { count: 0, avg: null, min: null, max: null, upside: null, dist }
    }
    const avg = targets.reduce((sum, value) => sum + value, 0) / targets.length
    const min = Math.min(...targets)
    const max = Math.max(...targets)
    const upside =
      currentPrice && currentPrice > 0
        ? ((avg - currentPrice) / currentPrice) * 100
        : null
    return { count: targets.length, avg, min, max, upside, dist }
  }, [rows, currentPrice])

  const fmt = (value: number | null) =>
    value == null
      ? '—'
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <S.Section id="company-analyst">
      <S.SectionHeader>
        <S.SectionTitle>증권사 목표주가</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>{rows.length}건</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {consensus.count > 0 && (
        <Consensus>
          <ConsCell>
            <ConsLabel>평균 목표가</ConsLabel>
            <ConsValue>{fmt(consensus.avg)}</ConsValue>
          </ConsCell>
          <ConsCell>
            <ConsLabel>최저 · 최고</ConsLabel>
            <ConsValue>
              {fmt(consensus.min)} · {fmt(consensus.max)}
            </ConsValue>
          </ConsCell>
          {consensus.upside != null && (
            <ConsCell>
              <ConsLabel>현재가 대비</ConsLabel>
              <ConsValue
                $tone={toneColor(
                  consensus.upside >= 0 ? 'positive' : 'negative',
                  dark,
                )}
              >
                {consensus.upside >= 0 ? '+' : ''}
                {consensus.upside.toFixed(1)}%
              </ConsValue>
            </ConsCell>
          )}
          <ConsCell>
            <ConsLabel>의견 분포</ConsLabel>
            <DistRow>
              {(
                ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'] as const
              ).map((key) =>
                consensus.dist[key] > 0 ? (
                  <TonePill key={key} $tone={ratingTone(key)}>
                    {RATING_LABEL[key]} {consensus.dist[key]}
                  </TonePill>
                ) : null,
              )}
            </DistRow>
          </ConsCell>
        </Consensus>
      )}

      {rows.length === 0 ? (
        <S.EmptyState>
          증권사·애널리스트의 목표주가와 투자의견을 모으면 평균 목표가·의견 분포·현재가
          대비 상승여력이 자동 집계됩니다.
        </S.EmptyState>
      ) : (
        <S.RowStack>
          {rows.map((row, idx) => {
            const target = strToNum(row.targetPrice)
            const prior = strToNum(row.priorTargetPrice)
            const revision =
              target != null && prior != null && prior !== 0
                ? target - prior
                : null
            return (
              <S.Row key={row.key}>
                <S.RowHeader>
                  <S.RowTitleHost>
                    <InlineText
                      value={row.firm}
                      onSave={(next) => updateRow(idx, { firm: next })}
                      placeholder="증권사 (예: 미래에셋증권)"
                      label="증권사"
                      validate={(value) =>
                        value.trim() ? null : '증권사명을 입력해야 저장됩니다'
                      }
                    />
                  </S.RowTitleHost>
                  {row.rating && (
                    <TonePill $tone={ratingTone(row.rating)}>
                      {RATING_LABEL[row.rating]}
                    </TonePill>
                  )}
                  <S.ManageActions>
                    <S.IconBtn
                      type="button"
                      onClick={() => void removeRow(idx)}
                      aria-label="목표주가 삭제"
                      $danger
                    >
                      <FiTrash2 />
                    </S.IconBtn>
                  </S.ManageActions>
                </S.RowHeader>

                <S.RowMetaLine>
                  <span>
                    <S.RowFieldLabel>목표주가</S.RowFieldLabel>
                    <InlineText
                      value={row.targetPrice}
                      onSave={(next) => updateRow(idx, { targetPrice: next })}
                      placeholder="예: 250000"
                      label="목표주가"
                      formatRead={readGrouped}
                      numeric
                    />
                  </span>
                  {revision != null && revision !== 0 && (
                    <ToneTag $tone={revision > 0 ? 'positive' : 'negative'}>
                      {revision > 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                      {revision > 0 ? '상향' : '하향'}
                    </ToneTag>
                  )}
                  <span>
                    <S.RowFieldLabel>통화</S.RowFieldLabel>
                    <InlineText
                      value={row.currency}
                      onSave={(next) => updateRow(idx, { currency: next })}
                      placeholder="KRW"
                      label="통화"
                    />
                  </span>
                  <span>
                    <S.RowFieldLabel>투자의견</S.RowFieldLabel>
                    <InlineSelect
                      value={row.rating}
                      options={RATING_OPTIONS}
                      onSave={(next) =>
                        updateRow(idx, { rating: next as AnalystRating | '' })
                      }
                      placeholder="선택"
                      label="투자의견"
                    />
                  </span>
                </S.RowMetaLine>

                <S.RowMetaLine>
                  <span>
                    <S.RowFieldLabel>직전 목표가</S.RowFieldLabel>
                    <InlineText
                      value={row.priorTargetPrice}
                      onSave={(next) =>
                        updateRow(idx, { priorTargetPrice: next })
                      }
                      placeholder="(선택)"
                      label="직전 목표가"
                      formatRead={readGrouped}
                      numeric
                    />
                  </span>
                  <span>
                    <S.RowFieldLabel>애널리스트</S.RowFieldLabel>
                    <InlineText
                      value={row.analyst}
                      onSave={(next) => updateRow(idx, { analyst: next })}
                      placeholder="(선택)"
                      label="애널리스트"
                    />
                  </span>
                  <span>
                    <S.RowFieldLabel>제시일</S.RowFieldLabel>
                    <InlineDate
                      value={row.publishedAt}
                      onSave={(next) => updateRow(idx, { publishedAt: next })}
                      emptyLabel="제시일 선택"
                      pickerTitle="제시일 선택"
                      blockBc
                      label="제시일"
                    />
                  </span>
                </S.RowMetaLine>

                <S.RowMetaLine>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <S.RowFieldLabel>리포트</S.RowFieldLabel>
                    <InlineText
                      value={row.reportTitle}
                      onSave={(next) => updateRow(idx, { reportTitle: next })}
                      placeholder="리포트 제목 (선택)"
                      label="리포트 제목"
                    />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <S.RowFieldLabel>링크</S.RowFieldLabel>
                    <InlineText
                      value={row.sourceUrl}
                      onSave={(next) => updateRow(idx, { sourceUrl: next })}
                      placeholder="https:// (선택)"
                      label="리포트 링크"
                      validate={(value) =>
                        !value.trim() || /^https?:\/\//i.test(value.trim())
                          ? null
                          : 'http:// 또는 https:// 로 시작해야 합니다'
                      }
                    />
                  </span>
                </S.RowMetaLine>

                <S.RowNarrative>
                  <S.RowFieldLabel>내용</S.RowFieldLabel>
                  <InlineRichText
                    value={row.note ?? ''}
                    onSave={(next) =>
                      updateRow(idx, {
                        note: isVisuallyEmptyRichText(next) ? null : next,
                      })
                    }
                    placeholder="투자의견 근거·리포트 요약 — 인물·사건을 인라인으로 링크할 수 있습니다."
                    onPersonClick={onPersonClick}
                    stickyEditButton={false}
                    label="내용"
                  />
                </S.RowNarrative>
              </S.Row>
            )
          })}
        </S.RowStack>
      )}

      <S.AddButton type="button" onClick={addRow}>
        <FiPlus /> 의견 추가
      </S.AddButton>
    </S.Section>
  )
}

const Consensus = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 0.85rem 1rem;
  margin-bottom: 0.85rem;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const ConsCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const ConsLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ConsValue = styled.span<{ $tone?: string }>`
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) => $tone ?? theme.colors.text.primary};
`

const DistRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

/** server↔로컬 키 보존 동기화(serverId 우선, 없으면 위치). */
function syncRows(
  prev: RatingRow[],
  server: CompanyAnalystRatingItem[],
  nextKey: () => string,
): RatingRow[] {
  if (prev.length === server.length) {
    return server.map((srv, i) => {
      const p = prev[i]
      const prevIsAhead = p.serverId === undefined && p.firm.trim() !== ''
      if (prevIsAhead) return p
      return makeRow(srv, p.key)
    })
  }
  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: RatingRow[] = []
  for (const srv of server) {
    const matchedIdx = prev.findIndex(
      (p, i) => !prevUsed[i] && p.serverId === srv.id,
    )
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
