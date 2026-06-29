import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiArrowDown, FiArrowUp, FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi'

import type {
  CompanyHistoryInput,
  CompanyHistoryItem,
  CompanyHistoryType,
  UpdateCompanyInput,
} from '@/shared/api/company'
import {
  numToStr,
  readCompactKo,
  readGrouped,
  strToNum,
} from '@/shared/lib/number-format'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  InlineDate,
  InlineRichText,
  InlineSelect,
  type InlineSelectOption,
  InlineText,
} from '@/shared/ui/inline-edit'

import * as S from './company-detail.styles'

const HISTORY_TYPE_OPTIONS: InlineSelectOption[] = [
  { value: 'GENERAL', label: '일반' },
  { value: 'PRODUCT_LAUNCH', label: '제품 발표' },
  { value: 'FINANCIAL', label: '재무·실적' },
  { value: 'MERGER_ACQUISITION', label: '인수·합병' },
  { value: 'LEADERSHIP', label: '경영진' },
  { value: 'LEGAL', label: '법적' },
  { value: 'MILESTONE', label: '마일스톤' },
  { value: 'OTHER', label: '기타' },
]

interface HistoryRow {
  /** 클라이언트 임시 키 — InlineText/InlineRichText 인스턴스(자체 draft) 보존용. */
  key: string
  /** 마지막으로 매핑된 서버 row id(있다면) — race 동안 위치 join 보조 시그널. */
  serverId?: string
  type: CompanyHistoryType
  title: string
  occurredAt: string | null
  content: string
  /** 경제 맥락 스냅샷 — 입력 편의상 문자열로 보관(커밋 시 number로 변환). */
  stockPrice: string
  marketCap: string
  currency: string
  /** 입력 컨트롤 없는 보존 필드 — 기존 값을 PUT에 그대로 실어 보존. */
  note: string | null
}

function makeRow(
  history: CompanyHistoryItem,
  key: string,
): HistoryRow {
  return {
    key,
    serverId: history.id,
    type: history.type ?? 'GENERAL',
    title: history.title ?? '',
    occurredAt: history.occurredAt,
    content: history.content ?? '',
    stockPrice: numToStr(history.stockPrice),
    marketCap: numToStr(history.marketCap),
    currency: history.currency ?? '',
    note: history.note,
  }
}

interface CompanyHistorySectionProps {
  histories: CompanyHistoryItem[]
  onPatch: (patch: UpdateCompanyInput) => void
  onPersonClick?: (personId: string) => void
}

/**
 * 연혁 인라인 편집 — 사건 상세의 "전개" 섹션 패턴을 기업 연혁(CompanyHistory)에 이식.
 *
 * - 각 항목: 종류·제목(InlineText) · 발생일(InlineDate) · 본문(InlineRichText)
 * - 제품 발표·재무 항목은 *당시 주가·시가총액·통화* 스냅샷까지 기록(예: NVIDIA Blackwell 발표).
 * - 서버가 통째로 delete-and-recreate라 *어떤 변경이든* 전체 배열을 PUT한다.
 */
export function CompanyHistorySection({
  histories,
  onPatch,
  onPersonClick,
}: CompanyHistorySectionProps) {
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `history-${Date.now()}-${++counterRef.current}`,
    [],
  )

  const serverRows = useMemo<CompanyHistoryItem[]>(
    () =>
      (histories ?? [])
        .slice()
        .sort((a, right) => (a.order ?? 0) - (right.order ?? 0)),
    [histories],
  )

  const [rows, setRows] = useState<HistoryRow[]>(() =>
    serverRows.map((history) => makeRow(history, nextKey())),
  )

  useEffect(() => {
    setRows((prev) => syncRows(prev, serverRows, nextKey))
  }, [serverRows, nextKey])

  const commitRows = (next: HistoryRow[]) => {
    setRows(next)
    /* 제목이 *반드시* 있어야 저장한다 — 서버 CompanyHistoryInputDto.title은 @IsNotEmpty라
       빈 제목 행을 보내면 전체배열 PUT이 400난다. 제목 없는 행(본문·날짜·재무만 입력)은
       PUT에서 drop하되 로컬 행은 유지(syncRows가 미매칭 tail로 보존)되어 입력은 안 사라지고,
       사용자는 제목을 채우면 저장된다. (제목 validate로 안내) */
    const cleaned: CompanyHistoryInput[] = next
      .filter((row) => row.title.trim())
      .map((row, idx) => ({
        type: row.type,
        title: row.title.trim(),
        occurredAt: row.occurredAt ?? null,
        content: isVisuallyEmptyRichText(row.content) ? null : row.content,
        note: row.note,
        stockPrice: strToNum(row.stockPrice),
        marketCap: strToNum(row.marketCap),
        currency: row.currency.trim() || null,
        order: idx,
      }))
    onPatch({ histories: cleaned })
  }

  const addRow = () => {
    setRows((arr) => [
      ...arr,
      {
        key: nextKey(),
        type: 'GENERAL',
        title: '',
        occurredAt: null,
        content: '',
        stockPrice: '',
        marketCap: '',
        currency: '',
        note: null,
      },
    ])
  }

  const updateRow = (idx: number, patch: Partial<HistoryRow>) => {
    commitRows(rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeRow = async (idx: number) => {
    const row = rows[idx]
    if (!row) return
    const hasContent =
      !!row.title.trim() ||
      !isVisuallyEmptyRichText(row.content) ||
      !!row.occurredAt ||
      !!row.stockPrice.trim() ||
      !!row.marketCap.trim() ||
      !!row.currency.trim()
    if (
      hasContent &&
      !(await confirm({
        title: '연혁 삭제',
        message: '이 연혁 항목을 삭제할까요? 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) {
      return
    }
    commitRows(rows.filter((entry) => entry.key !== row.key))
  }

  const moveRow = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= rows.length) return
    const next = rows.slice()
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    commitRows(next)
  }

  const [manageMode, setManageMode] = useState(false)

  return (
    <S.Section id="company-history">
      <S.SectionHeader>
        <S.SectionTitle>연혁</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>{rows.length}건</S.SectionSubtitle>
        )}
        {rows.length > 0 && (
          <S.SectionActions>
            <S.ManageToggle
              type="button"
              onClick={() => setManageMode((flag) => !flag)}
              $active={manageMode}
              aria-pressed={manageMode}
            >
              <FiSettings />
              {manageMode ? '관리 끝' : '관리'}
            </S.ManageToggle>
          </S.SectionActions>
        )}
      </S.SectionHeader>

      {rows.length === 0 ? (
        <S.EmptyState>
          아직 연혁이 없습니다. 아래 <strong>＋ 연혁 추가</strong>로 설립·합병·상장,
          그리고 제품 발표(예: Blackwell)와 당시 주가까지 시간순으로 적어보세요.
        </S.EmptyState>
      ) : (
        <S.RowStack>
          {rows.map((row, idx) => {
            const showFinance =
              row.type === 'PRODUCT_LAUNCH' ||
              row.type === 'FINANCIAL' ||
              !!row.stockPrice ||
              !!row.marketCap ||
              !!row.currency
            return (
              <S.Row key={row.key}>
                <S.RowHeader>
                  <S.RowIndex aria-hidden>{idx + 1}</S.RowIndex>
                  <S.RowTitleHost>
                    <InlineText
                      value={row.title}
                      onSave={(next) => updateRow(idx, { title: next })}
                      placeholder="연혁 제목 (예: Blackwell 아키텍처 발표)"
                      label="연혁 제목"
                      validate={(value) =>
                        value.trim() ? null : '제목을 입력해야 저장됩니다'
                      }
                    />
                  </S.RowTitleHost>
                  {manageMode && (
                    <S.ManageActions>
                      <S.IconBtn
                        type="button"
                        onClick={() => moveRow(idx, -1)}
                        disabled={idx === 0}
                        aria-label="위로"
                      >
                        <FiArrowUp />
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        onClick={() => moveRow(idx, 1)}
                        disabled={idx === rows.length - 1}
                        aria-label="아래로"
                      >
                        <FiArrowDown />
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        onClick={() => void removeRow(idx)}
                        aria-label="연혁 삭제"
                        $danger
                      >
                        <FiTrash2 />
                      </S.IconBtn>
                    </S.ManageActions>
                  )}
                </S.RowHeader>

                <S.RowMetaLine>
                  <span>
                    <S.RowFieldLabel>종류</S.RowFieldLabel>
                    <InlineSelect
                      value={row.type}
                      options={HISTORY_TYPE_OPTIONS}
                      onSave={(next) =>
                        updateRow(idx, {
                          type: (next || 'GENERAL') as CompanyHistoryType,
                        })
                      }
                      placeholder="종류"
                      label="연혁 종류"
                    />
                  </span>
                  <span>
                    <S.RowFieldLabel>발생</S.RowFieldLabel>
                    <InlineDate
                      value={row.occurredAt}
                      onSave={(next) => updateRow(idx, { occurredAt: next })}
                      emptyLabel="시점 미입력"
                      pickerTitle="연혁 발생일 선택"
                      blockBc
                      label="발생일"
                    />
                  </span>
                </S.RowMetaLine>

                {showFinance && (
                  <S.RowMetaLine>
                    <span>
                      <S.RowFieldLabel>당시 주가</S.RowFieldLabel>
                      <InlineText
                        value={row.stockPrice}
                        onSave={(next) => updateRow(idx, { stockPrice: next })}
                        placeholder="예: 884"
                        label="당시 주가"
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
                )}

                <InlineRichText
                  value={row.content}
                  onSave={(next) => updateRow(idx, { content: next })}
                  placeholder="배경·의의 — 인물·사건을 인라인으로 링크할 수 있습니다."
                  onPersonClick={onPersonClick}
                  stickyEditButton={false}
                  label="연혁 본문"
                />

                <S.RowNarrative>
                  <S.RowFieldLabel>메모</S.RowFieldLabel>
                  <InlineRichText
                    value={row.note ?? ''}
                    onSave={(next) =>
                      updateRow(idx, {
                        note: isVisuallyEmptyRichText(next) ? null : next,
                      })
                    }
                    placeholder="추가 메모 — 출처·후속 등"
                    onPersonClick={onPersonClick}
                    stickyEditButton={false}
                  />
                </S.RowNarrative>
              </S.Row>
            )
          })}
        </S.RowStack>
      )}

      <S.AddButton type="button" onClick={addRow}>
        <FiPlus /> 연혁 추가
      </S.AddButton>
    </S.Section>
  )
}

/**
 * server 응답과 로컬 rows를 매핑 — 핵심은 child 컴포넌트 키 보존(InlineText/
 * InlineRichText의 자체 draft·커서·IME가 끊기지 않도록).
 */
function syncRows(
  prev: HistoryRow[],
  server: CompanyHistoryItem[],
  nextKey: () => string,
): HistoryRow[] {
  if (prev.length === server.length) {
    return server.map((srv, i) => {
      const p = prev[i]
      const sTitle = srv.title ?? ''
      const sContent = srv.content ?? ''
      const prevIsAhead =
        p.serverId === undefined ||
        (p.serverId !== srv.id &&
          (p.title !== sTitle ||
            p.content !== sContent ||
            p.occurredAt !== srv.occurredAt))
      if (prevIsAhead) {
        return { ...p, serverId: srv.id }
      }
      return makeRow(srv, p.key)
    })
  }

  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: HistoryRow[] = []
  for (const srv of server) {
    const sTitle = srv.title ?? ''
    const sContent = srv.content ?? ''
    let matchedIdx = prev.findIndex(
      (p, i) => !prevUsed[i] && p.serverId === srv.id,
    )
    if (matchedIdx < 0) {
      for (let i = 0; i < prev.length; i++) {
        if (prevUsed[i]) continue
        const p = prev[i]
        if (
          p.title === sTitle &&
          p.content === sContent &&
          p.occurredAt === srv.occurredAt
        ) {
          matchedIdx = i
          break
        }
      }
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push({ ...prev[matchedIdx], serverId: srv.id, note: srv.note })
    } else {
      next.push(makeRow(srv, nextKey()))
    }
  }
  for (let i = 0; i < prev.length; i++) {
    if (!prevUsed[i]) next.push(prev[i])
  }
  return next
}
