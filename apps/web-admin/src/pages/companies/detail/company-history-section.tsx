import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  FiArrowDown,
  FiArrowUp,
  FiPlus,
  FiSettings,
  FiTrash2,
} from 'react-icons/fi'
import styled from 'styled-components'

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

/**
 * 종류 라벨 — `satisfies Record<CompanyHistoryType, string>`로 *모든* 종류의 라벨을 강제한다.
 * union에 값을 추가하고 여기 누락하면 tsc가 잡고, 없는 값을 적어도 tsc가 잡는다
 * (InlineSelectOption.value가 string이라 옵션 배열만으론 잡히지 않는 드리프트의 유일한 안전망).
 */
const HISTORY_TYPE_LABELS = {
  GENERAL: '일반',
  PRODUCT_LAUNCH: '제품·기술 출시',
  FINANCIAL: '재무·실적',
  MERGER_ACQUISITION: '인수·합병',
  LEADERSHIP: '경영진',
  LEGAL: '소송·법무',
  MILESTONE: '마일스톤',
  OTHER: '기타',
  CAPITAL_INVESTMENT: '설비투자·증설',
  PARTNERSHIP: '제휴·파트너십',
  CAPITAL_POLICY: '자본정책·주주환원',
  RESTRUCTURING: '구조조정·분사',
  REGULATORY: '정부·규제',
  INCIDENT: '위기·사고',
} satisfies Record<CompanyHistoryType, string>

/**
 * InlineSelect 노출 순서 — enum 정의순이 아닌 이 배열이 타임라인 표시 순서를 결정.
 * 자본 흐름(투입→조달→환원)·외부관계 지배권 이전 여부로 군집해 입력자가 고르기 쉽게 둔다.
 * (배열 타입이 CompanyHistoryType[]이라 없는 값·오타를 tsc가 잡는다.)
 */
const HISTORY_TYPE_ORDER: CompanyHistoryType[] = [
  'GENERAL',
  'PRODUCT_LAUNCH',
  'MILESTONE',
  'CAPITAL_INVESTMENT',
  'FINANCIAL',
  'CAPITAL_POLICY',
  'MERGER_ACQUISITION',
  'PARTNERSHIP',
  'RESTRUCTURING',
  'LEADERSHIP',
  'REGULATORY',
  'LEGAL',
  'INCIDENT',
  'OTHER',
]

const HISTORY_TYPE_OPTIONS: InlineSelectOption[] = HISTORY_TYPE_ORDER.map(
  (value) => ({ value, label: HISTORY_TYPE_LABELS[value] }),
)

/**
 * 발표 당시 '주가·시총' 스냅샷 입력칸을 *자동* 노출하는 종류 — 통상 주가/시총 재평가를
 * 유발해 스냅샷 기록 가치가 큰 사건. 그 외 종류는 행의 '＋ 당시 주가·시총' 토글로 수동 노출.
 */
const SHOW_FINANCE_TYPES = new Set<CompanyHistoryType>([
  'PRODUCT_LAUNCH',
  'FINANCIAL',
  'CAPITAL_INVESTMENT',
  'CAPITAL_POLICY',
  'MERGER_ACQUISITION',
])

/**
 * 발생일 오름차순 비교(미입력 null은 맨 뒤).
 * **달력 일자(YYYY-MM-DD)만 비교** — 같은 날에 date-only('2024-01-15')와 풀 ISO
 * ('2024-01-15T00:00:00.000Z') 포맷이 섞여도 동일(=0)로 보아 runInfo의 그룹핑(slice(0,10))과
 * 일치시키고, stable sort가 intra-day 수동 순서(화살표 결과)를 보존하도록 한다.
 */
function compareDateAscNullLast(
  left: string | null,
  right: string | null,
): number {
  const leftKey = left ? left.slice(0, 10) : null
  const rightKey = right ? right.slice(0, 10) : null
  if (leftKey === rightKey) return 0
  if (leftKey == null) return 1
  if (rightKey == null) return -1
  return leftKey < rightKey ? -1 : 1
}

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
        // 발생일 오름차순(미입력은 맨 뒤)이 정렬 권위. 같은 날짜는 저장된 order로 intra-day 순서 유지.
        .sort((left, right) => {
          const byDate = compareDateAscNullLast(left.occurredAt, right.occurredAt)
          if (byDate !== 0) return byDate
          return (left.order ?? 0) - (right.order ?? 0)
        }),
    [histories],
  )

  const [rows, setRows] = useState<HistoryRow[]>(() =>
    serverRows.map((history) => makeRow(history, nextKey())),
  )

  useEffect(() => {
    setRows((prev) =>
      // syncRows는 미매칭(제목 없는·로컬 신규) 행을 배열 끝에 append하므로, 날짜 정렬 불변을 위해
      // 병합 결과를 한 번 더 발생일순(stable)으로 정렬한다 — 제목 없는 '날짜만 입력' 행이 맨 아래로
      // 튀는 스냅백 방지. null(미입력) 행은 여전히 맨 뒤.
      syncRows(prev, serverRows, nextKey)
        .slice()
        .sort((left, right) =>
          compareDateAscNullLast(left.occurredAt, right.occurredAt),
        ),
    )
  }, [serverRows, nextKey])

  const commitRows = (next: HistoryRow[]) => {
    /* 항상 발생일 오름차순으로 정렬(미입력 맨 뒤). 같은 날짜는 stable sort라 현재 순서가 유지돼
       intra-day 수동 순서(화살표 결과)를 보존한다. order는 정렬된 위치로 재부여돼 tiebreaker가 된다. */
    const sorted = next
      .slice()
      .sort((left, right) =>
        compareDateAscNullLast(left.occurredAt, right.occurredAt),
      )
    setRows(sorted)
    /* 제목이 *반드시* 있어야 저장한다 — 서버 CompanyHistoryInputDto.title은 @IsNotEmpty라
       빈 제목 행을 보내면 전체배열 PUT이 400난다. 제목 없는 행(본문·날짜·재무만 입력)은
       PUT에서 drop하되 로컬 행은 유지(syncRows가 미매칭 tail로 보존)되어 입력은 안 사라지고,
       사용자는 제목을 채우면 저장된다. (제목 validate로 안내) */
    const cleaned: CompanyHistoryInput[] = sorted
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

  /* 자동노출 종류가 아닌 행에서 '당시 주가·시총' 패널을 수동으로 펼친 행들(클라이언트 key 기준).
     key는 syncRows가 보존하므로 편집 중에도 유지된다. */
  const [snapshotKeys, setSnapshotKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const openSnapshot = (key: string) =>
    setSnapshotKeys((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })

  /* 인접 동일 날짜 run — 같은 날짜가 *연속*한 구간을 한 날짜 노드로 묶는다(전역 그룹핑이 아니라
     인접만; 수동 order와 충돌 안 함). isStart=run 첫 행(날짜+N건 배지), isSub=후속 행(날짜 숨김·작은 틱).
     null(미입력) 날짜는 병합하지 않음(각자 단일). */
  const runInfo = useMemo(() => {
    const info = rows.map(() => ({
      isStart: true,
      isSub: false,
      isEnd: true,
      count: 1,
    }))
    let start = 0
    while (start < rows.length) {
      const firstDate = rows[start].occurredAt
      const key = firstDate ? firstDate.slice(0, 10) : null
      let end = start + 1
      if (key != null) {
        while (end < rows.length && rows[end].occurredAt?.slice(0, 10) === key)
          end++
      }
      const count = end - start
      info[start] = { isStart: true, isSub: false, isEnd: count === 1, count }
      for (let pos = start + 1; pos < end; pos++)
        info[pos] = {
          isStart: false,
          isSub: true,
          isEnd: pos === end - 1,
          count,
        }
      start = end
    }
    return info
  }, [rows])

  /* run(같은 날짜 묶음) 전체 행의 발생일을 한 번에 변경 — 날짜 노드에서 일괄. */
  const setRunDate = (startIdx: number, count: number, next: string | null) => {
    commitRows(
      rows.map((row, position) =>
        position >= startIdx && position < startIdx + count
          ? { ...row, occurredAt: next }
          : row,
      ),
    )
  }

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
        <Timeline>
          {rows.map((row, idx) => {
            const showFinance =
              SHOW_FINANCE_TYPES.has(row.type) ||
              !!row.stockPrice ||
              !!row.marketCap ||
              !!row.currency ||
              snapshotKeys.has(row.key)
            const run = runInfo[idx]
            return (
              <TLItem key={row.key} $sub={run.isSub}>
                {!run.isSub && (
                  <TLDate>
                    <InlineDate
                      value={row.occurredAt}
                      onSave={(next) =>
                        run.count > 1
                          ? setRunDate(idx, run.count, next)
                          : updateRow(idx, { occurredAt: next })
                      }
                      emptyLabel="시점 미입력"
                      pickerTitle={
                        run.count > 1
                          ? '발생일 선택 (이 날짜 전체 일괄)'
                          : '연혁 발생일 선택'
                      }
                      blockBc
                      label={
                        run.count > 1 ? `발생일 (${run.count}건 일괄)` : '발생일'
                      }
                    />
                    {run.count > 1 && <CountBadge>{run.count}건</CountBadge>}
                  </TLDate>
                )}
                {manageMode && run.count > 1 && (
                  <SubDateEdit>
                    <S.RowFieldLabel>이 항목 날짜</S.RowFieldLabel>
                    <InlineDate
                      value={row.occurredAt}
                      onSave={(next) => updateRow(idx, { occurredAt: next })}
                      emptyLabel="시점 미입력"
                      pickerTitle="이 항목만 다른 날로"
                      blockBc
                      label="이 항목 발생일"
                    />
                  </SubDateEdit>
                )}
                <S.RowHeader>
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
                      {/* 같은 날짜 묶음 안에서만 순서 조정(자동 날짜정렬이라 날짜 경계 넘는 이동은 무의미). */}
                      {run.count > 1 && (
                        <>
                          <S.IconBtn
                            type="button"
                            onClick={() => moveRow(idx, -1)}
                            disabled={run.isStart}
                            aria-label="위로 (같은 날 안에서)"
                          >
                            <FiArrowUp />
                          </S.IconBtn>
                          <S.IconBtn
                            type="button"
                            onClick={() => moveRow(idx, 1)}
                            disabled={run.isEnd}
                            aria-label="아래로 (같은 날 안에서)"
                          >
                            <FiArrowDown />
                          </S.IconBtn>
                        </>
                      )}
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
                </S.RowMetaLine>

                {!showFinance && (
                  <S.RowMetaLine>
                    <S.SnapshotAddBtn
                      type="button"
                      onClick={() => openSnapshot(row.key)}
                    >
                      <FiPlus /> 당시 주가·시총 기록
                    </S.SnapshotAddBtn>
                  </S.RowMetaLine>
                )}

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
              </TLItem>
            )
          })}
        </Timeline>
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

const Timeline = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 26px;
  margin-left: 4px;
`

/**
 * 타임라인 항목 — 좌측 세로선(::before) + 날짜 노드(::after), 콘텐츠는 우측 들여쓰기.
 * $sub: 같은 날짜 묶음의 후속 행(날짜 숨김) — 큰 점 대신 작은 회색 틱 + 위 간격을 좁혀 그룹임을 시각화.
 */
const TLItem = styled.div<{ $sub?: boolean }>`
  position: relative;
  padding-left: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: ${({ $sub }) => ($sub ? '-12px' : '0')};

  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 14px;
    bottom: -26px;
    width: 2px;
    background: ${({ theme }) => theme.colors.border.default};
  }
  &:last-child::before {
    display: none;
  }
  &::after {
    content: '';
    position: absolute;
    left: ${({ $sub }) => ($sub ? '2px' : '0')};
    top: 6px;
    width: ${({ $sub }) => ($sub ? '6px' : '10px')};
    height: ${({ $sub }) => ($sub ? '6px' : '10px')};
    border-radius: 50%;
    background: ${({ theme, $sub }) =>
      $sub ? theme.colors.border.default : theme.colors.primary};
    box-shadow: ${({ theme, $sub }) =>
      $sub ? 'none' : `0 0 0 3px ${theme.colors.background.secondary}`};
  }
`

const TLDate = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`

/** 같은 날짜 묶음 헤더의 '이 날 N건' 배지. */
const CountBadge = styled.span`
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

/** 관리 모드에서 묶음 내 한 항목만 다른 날로 분리하는 항목별 날짜 편집 줄. */
const SubDateEdit = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

