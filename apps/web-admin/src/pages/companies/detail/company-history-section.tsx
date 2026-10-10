import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  FiArrowDown,
  FiArrowUp,
  FiPlus,
  FiSettings,
  FiTrash2,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import type {
  CompanyHistoryInput,
  CompanyHistoryItem,
  CompanyHistoryType,
  DatePrecision,
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

import { ClampedBlock } from './company-clamped-block'
import * as S from './company-detail.styles'

/**
 * 종류 라벨 — `satisfies Record<CompanyHistoryType, string>`로 *모든* 종류의 라벨을 강제한다.
 * union에 값을 추가하고 여기 누락하면 tsc가 잡고, 없는 값을 적어도 tsc가 잡는다
 * (InlineSelectOption.value가 string이라 옵션 배열만으론 잡히지 않는 드리프트의 유일한 안전망).
 */
export const HISTORY_TYPE_LABELS = {
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
 * 종류 색 — 타임라인 노드·종류 배지·필터 칩이 같은 색을 쓴다. 군집(자본 흐름 / 외부 관계 /
 * 위기·규제)끼리 색상환에서 가깝게 두어, 색만 봐도 대강의 성격이 읽히게 한다.
 */
export const HISTORY_TYPE_TONES = {
  GENERAL: '#64748b',
  PRODUCT_LAUNCH: '#2563eb',
  MILESTONE: '#7c3aed',
  CAPITAL_INVESTMENT: '#0891b2',
  FINANCIAL: '#0d9488',
  CAPITAL_POLICY: '#059669',
  MERGER_ACQUISITION: '#c026d3',
  PARTNERSHIP: '#db2777',
  RESTRUCTURING: '#ea580c',
  LEADERSHIP: '#4f46e5',
  REGULATORY: '#ca8a04',
  LEGAL: '#b45309',
  INCIDENT: '#dc2626',
  OTHER: '#94a3b8',
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

/** 'day'는 NULL과 같은 뜻 — 저장은 year·month만 남긴다(서버 규약과 동일) */
const toStoredPrecision = (precision: DatePrecision): DatePrecision | null =>
  precision === 'day' ? null : precision

/**
 * 같은 날짜 묶음 키 — 정밀도까지 같아야 한 묶음이다. 년만 기록한 '1989'와
 * 실제 1989-01-01 기록은 저장값이 같아도 다른 사실이라 묶지 않는다.
 */
function dateGroupKey(row: {
  occurredAt: string | null
  occurredAtPrecision: DatePrecision | null
}): string | null {
  if (!row.occurredAt) return null
  if (row.occurredAtPrecision === 'year') return `y:${row.occurredAt.slice(0, 4)}`
  if (row.occurredAtPrecision === 'month') return `m:${row.occurredAt.slice(0, 7)}`
  return `d:${row.occurredAt.slice(0, 10)}`
}

interface HistoryRow {
  /** 클라이언트 임시 키 — InlineText/InlineRichText 인스턴스(자체 draft) 보존용. */
  key: string
  /** 마지막으로 매핑된 서버 row id(있다면) — race 동안 위치 join 보조 시그널. */
  serverId?: string
  type: CompanyHistoryType
  title: string
  occurredAt: string | null
  /** 발생일 정밀도 — null이면 day. 년만이면 occurredAt은 그해 1월 1일 */
  occurredAtPrecision: DatePrecision | null
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
    occurredAtPrecision: history.occurredAtPrecision ?? null,
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
        occurredAtPrecision: row.occurredAt ? (row.occurredAtPrecision ?? null) : null,
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
        occurredAtPrecision: null,
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
  /** 표시 순서 — 저장 순서(발생일 오름차순)는 그대로, 보기만 뒤집는다 */
  const [newestFirst, setNewestFirst] = useState(false)
  /** 종류 필터 — null이면 전체 */
  const [typeFilter, setTypeFilter] = useState<CompanyHistoryType | null>(null)

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

  /* 있는 종류만 필터 칩으로 — 14종을 다 늘어놓으면 대부분 0건이다 */
  const typeCounts = useMemo(() => {
    const counts = new Map<CompanyHistoryType, number>()
    for (const row of rows) counts.set(row.type, (counts.get(row.type) ?? 0) + 1)
    return HISTORY_TYPE_ORDER.filter((type) => counts.has(type)).map((type) => ({
      type,
      count: counts.get(type) ?? 0,
    }))
  }, [rows])

  // 고른 종류가 마지막 한 건까지 지워지면 필터를 풀어 빈 화면에 갇히지 않게 한다
  useEffect(() => {
    if (typeFilter && !typeCounts.some((entry) => entry.type === typeFilter)) {
      setTypeFilter(null)
    }
  }, [typeCounts, typeFilter])

  /**
   * 화면에 그릴 목록 — 원본 인덱스(idx)를 들고 다닌다. 갱신·삭제·이동은 모두 원본 배열 기준이라
   * 필터·역순과 무관하게 같은 행을 가리켜야 한다.
   */
  const view = useMemo(() => {
    const indexed = rows.map((row, idx) => ({ row, idx }))
    const filtered = typeFilter
      ? indexed.filter((entry) => entry.row.type === typeFilter)
      : indexed
    if (!newestFirst) return filtered
    // 최신순이어도 날짜 미상은 맨 뒤 — 뒤집으면 맨 앞으로 와 '가장 최근'처럼 보인다
    const dated = filtered.filter((entry) => entry.row.occurredAt)
    const undated = filtered.filter((entry) => !entry.row.occurredAt)
    return [...dated.reverse(), ...undated]
  }, [rows, typeFilter, newestFirst])

  /* 인접 동일 날짜 run — **화면 순서 기준**으로 같은 날짜가 연속한 구간을 한 날짜 노드로 묶는다.
     isStart=run 첫 행(날짜+N건 배지), isSub=후속 행(날짜 숨김·작은 틱). null 날짜는 병합하지 않는다. */
  const runInfo = useMemo(() => {
    const info = view.map(() => ({
      isStart: true,
      isSub: false,
      isEnd: true,
      count: 1,
      members: [] as number[],
    }))
    let start = 0
    while (start < view.length) {
      const key = dateGroupKey(view[start].row)
      let end = start + 1
      if (key != null) {
        while (end < view.length && dateGroupKey(view[end].row) === key) end++
      }
      const count = end - start
      const members = view.slice(start, end).map((entry) => entry.idx)
      info[start] = { isStart: true, isSub: false, isEnd: count === 1, count, members }
      for (let pos = start + 1; pos < end; pos++)
        info[pos] = { isStart: false, isSub: true, isEnd: pos === end - 1, count, members }
      start = end
    }
    return info
  }, [view])

  /* run(같은 날짜 묶음) 전체 행의 발생일을 한 번에 변경 — 날짜 노드에서 일괄. */
  const setRunDate = (
    members: number[],
    next: string | null,
    precision: DatePrecision | null,
  ) => {
    const memberSet = new Set(members)
    commitRows(
      rows.map((row, position) =>
        memberSet.has(position)
          ? { ...row, occurredAt: next, occurredAtPrecision: precision }
          : row,
      ),
    )
  }

  /** 기간 요약 — '1983 – 2026' */
  const spanLabel = useMemo(() => {
    const years = rows
      .map((row) => (row.occurredAt ? Number(row.occurredAt.slice(0, 4)) : NaN))
      .filter((year) => Number.isFinite(year))
    if (years.length === 0) return null
    const first = Math.min(...years)
    const last = Math.max(...years)
    return first === last ? `${first}` : `${first} – ${last}`
  }, [rows])

  /** 위쪽 '추가' — 새 행은 날짜가 없어 맨 아래에 붙으므로 그 자리로 데려간다 */
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const addRowAndReveal = () => {
    setTypeFilter(null)
    addRow()
    requestAnimationFrame(() =>
      addButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  // 같은 날 안 순서 조정은 필터 중엔 막는다 — 가려진 같은 날 행과 자리를 바꿀 수 있다
  const canReorder = manageMode && !typeFilter

  return (
    <S.Section id="company-history">
      <S.SectionHeader>
        <S.SectionTitle>연혁</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>
            {rows.length}건{spanLabel ? ` · ${spanLabel}` : ''}
          </S.SectionSubtitle>
        )}
        <S.SectionActions>
          {rows.length > 0 && (
            <S.ManageToggle
              type="button"
              onClick={() => setManageMode((flag) => !flag)}
              $active={manageMode}
              aria-pressed={manageMode}
            >
              <FiSettings />
              {manageMode ? '관리 끝' : '관리'}
            </S.ManageToggle>
          )}
          <S.ManageToggle type="button" onClick={addRowAndReveal}>
            <FiPlus /> 추가
          </S.ManageToggle>
        </S.SectionActions>
      </S.SectionHeader>

      {rows.length > 1 && (
        <Toolbar>
          <FilterChips role="group" aria-label="연혁 종류 필터">
            <FilterChip
              type="button"
              $active={typeFilter === null}
              aria-pressed={typeFilter === null}
              onClick={() => setTypeFilter(null)}
            >
              전체 <ChipCount>{rows.length}</ChipCount>
            </FilterChip>
            {typeCounts.map(({ type, count }) => (
              <FilterChip
                key={type}
                type="button"
                $active={typeFilter === type}
                $tone={HISTORY_TYPE_TONES[type]}
                aria-pressed={typeFilter === type}
                onClick={() => setTypeFilter((prev) => (prev === type ? null : type))}
              >
                {HISTORY_TYPE_LABELS[type]} <ChipCount>{count}</ChipCount>
              </FilterChip>
            ))}
          </FilterChips>
          <SortToggle
            type="button"
            onClick={() => setNewestFirst((flag) => !flag)}
            aria-label={newestFirst ? '오래된순으로 보기' : '최신순으로 보기'}
          >
            {newestFirst ? <FiArrowUp aria-hidden /> : <FiArrowDown aria-hidden />}
            {newestFirst ? '최신순' : '오래된순'}
          </SortToggle>
        </Toolbar>
      )}

      {rows.length === 0 ? (
        <S.EmptyState>
          아직 연혁이 없습니다. <strong>＋ 연혁 추가</strong>로 설립·합병·상장,
          그리고 제품 발표(예: Blackwell)와 당시 주가까지 시간순으로 적어보세요.
        </S.EmptyState>
      ) : (
        <Timeline>
          {view.map(({ row, idx }, position) => {
            const showFinance =
              SHOW_FINANCE_TYPES.has(row.type) ||
              !!row.stockPrice ||
              !!row.marketCap ||
              !!row.currency ||
              snapshotKeys.has(row.key)
            const run = runInfo[position]
            const year = row.occurredAt ? row.occurredAt.slice(0, 4) : null
            const prevYear =
              position > 0 && view[position - 1].row.occurredAt
                ? view[position - 1].row.occurredAt!.slice(0, 4)
                : position > 0
                  ? 'none'
                  : undefined
            // 연도가 바뀌는 첫 행 앞에 연도 표지 — 같은 날 묶음 중간에는 생기지 않는다
            const yearMarker =
              !run.isSub && (year ?? 'none') !== prevYear ? (year ?? '날짜 미상') : null
            // 최신순 화면에서 '위'는 원본 배열의 뒤쪽이다
            const step = (direction: -1 | 1) => (newestFirst ? -direction : direction) as -1 | 1
            return (
              <Fragment key={row.key}>
                {yearMarker && (
                  <YearMarker>{yearMarker}</YearMarker>
                )}
                <TLItem $sub={run.isSub} $tone={HISTORY_TYPE_TONES[row.type]}>
                  {!run.isSub && (
                    <TLDate>
                      <InlineDate
                        value={row.occurredAt}
                        precision={row.occurredAtPrecision}
                        allowPartial
                        onSave={(next, precision) =>
                          run.count > 1
                            ? setRunDate(run.members, next, toStoredPrecision(precision))
                            : updateRow(idx, {
                                occurredAt: next,
                                occurredAtPrecision: toStoredPrecision(precision),
                              })
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
                        precision={row.occurredAtPrecision}
                        allowPartial
                        onSave={(next, precision) =>
                          updateRow(idx, {
                            occurredAt: next,
                            occurredAtPrecision: toStoredPrecision(precision),
                          })
                        }
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
                        {canReorder && run.count > 1 && (
                          <>
                            <S.IconBtn
                              type="button"
                              onClick={() => moveRow(idx, step(-1))}
                              disabled={run.isStart}
                              aria-label="위로 (같은 날 안에서)"
                            >
                              <FiArrowUp />
                            </S.IconBtn>
                            <S.IconBtn
                              type="button"
                              onClick={() => moveRow(idx, step(1))}
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
                    {/* 종류는 색 배지 — '종류' 라벨 줄을 따로 두던 것을 접는다 */}
                    <TypeChip $tone={HISTORY_TYPE_TONES[row.type]}>
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
                    </TypeChip>
                    {!showFinance && (
                      <RevealOnRow>
                        <S.SnapshotAddBtn
                          type="button"
                          onClick={() => openSnapshot(row.key)}
                        >
                          <FiPlus /> 당시 주가·시총
                        </S.SnapshotAddBtn>
                      </RevealOnRow>
                    )}
                  </S.RowMetaLine>

                  {showFinance && (
                    <FinanceLine>
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
                    </FinanceLine>
                  )}

                  <ClampedBlock label="연혁 본문">
                    <InlineRichText
                      value={row.content}
                      onSave={(next) => updateRow(idx, { content: next })}
                      placeholder="배경·의의 — 인물·사건을 인라인으로 링크할 수 있습니다."
                      onPersonClick={onPersonClick}
                      stickyEditButton={false}
                      label="연혁 본문"
                    />
                  </ClampedBlock>

                  {/* 메모는 값이 있거나 관리 중일 때만 — 빈 '메모' 칸이 모든 행에 서 있었다 */}
                  {(row.note || manageMode) && (
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
                  )}
                </TLItem>
              </Fragment>
            )
          })}
        </Timeline>
      )}

      <S.AddButton ref={addButtonRef} type="button" onClick={addRow}>
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

const Toolbar = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 16px;
  flex-wrap: wrap;
  padding-bottom: 4px;
`

const FilterChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const FilterChip = styled.button<{ $active: boolean; $tone?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
  border: 1px solid
    ${({ theme, $active, $tone }) =>
      $active ? ($tone ?? theme.colors.text.primary) : theme.colors.border.default};
  background: ${({ $active, $tone, theme }) =>
    $active ? `${$tone ?? theme.colors.text.primary}14` : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};

  ${({ $tone }) =>
    $tone &&
    css`
      &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${$tone};
      }
    `}

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme, $tone }) => $tone ?? theme.colors.border.medium};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SortToggle = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  svg {
    width: 13px;
    height: 13px;
  }
`

/**
 * 연도 표지 — 타임라인 선 위에 얹는 큰 숫자. 긴 연혁을 해 단위로 훑게 한다.
 * 선(::before)이 표지 뒤로 이어지도록 표지 자체에 지면색 바탕을 깐다.
 */
const YearMarker = styled.div`
  position: relative;
  margin: 8px 0 -10px;
  padding-left: 26px;
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};

  /* 선 위의 연도 눈금 — 짧은 가로 막대 */
  &::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 50%;
    width: 12px;
    height: 2px;
    border-radius: 1px;
    background: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:first-child {
    margin-top: 0;
  }
`

/** 행에 올리거나 안을 포커스할 때만 보이는 보조 동작 — 모든 행에 늘 서 있으면 시끄럽다 */
const RevealOnRow = styled.span`
  opacity: 0;
  transition: opacity 0.12s;

  @media (hover: none) {
    opacity: 1;
  }
`

/** 종류 배지 — 색 점 + 옅은 틴트. 안쪽은 InlineSelect(눌러서 바꾼다). */
const TypeChip = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 1px 4px 1px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $tone }) => `${$tone}17`};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $tone }) => $tone};
  }
`

/** 당시 주가·시총 — 옅은 상자로 묶어 본문과 구분 */
const FinanceLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 20px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)'};
`

/**
 * 세로선은 타임라인 전체에 **한 줄**로 긋는다. 예전엔 항목마다 ::before로 다음 항목까지
 * 이었는데, 사이에 연도 표지가 끼면서 선이 해마다 끊겼다.
 */
const Timeline = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 26px;
  margin-left: 4px;

  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 10px;
    bottom: 10px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => theme.colors.border.default};
  }
`

/**
 * 타임라인 항목 — 좌측 세로선(::before) + 날짜 노드(::after, 종류 색), 콘텐츠는 우측 들여쓰기.
 * $sub: 같은 날짜 묶음의 후속 행(날짜 숨김) — 큰 점 대신 작은 틱 + 위 간격을 좁혀 그룹임을 시각화.
 */
const TLItem = styled.div<{ $sub?: boolean; $tone: string }>`
  position: relative;
  padding-left: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: ${({ $sub }) => ($sub ? '-12px' : '0')};

  &:hover ${RevealOnRow}, &:focus-within ${RevealOnRow} {
    opacity: 1;
  }

  &::after {
    content: '';
    position: absolute;
    left: ${({ $sub }) => ($sub ? '2px' : '0')};
    top: 6px;
    width: ${({ $sub }) => ($sub ? '6px' : '10px')};
    height: ${({ $sub }) => ($sub ? '6px' : '10px')};
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
    box-shadow: ${({ theme, $sub }) =>
      $sub ? 'none' : `0 0 0 3px ${theme.colors.background.primary}`};
  }
`

const TLDate = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
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
