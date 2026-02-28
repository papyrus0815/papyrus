/**
 * 역대 수반 가계도 — 1대 좌측, 왕명 메인, 같은 부모(형제)는 같은 행에 배치
 */
import React, { useMemo } from 'react'

import { FiUser } from 'react-icons/fi'
import styled from 'styled-components'

const TIMELINE_WIDTH = 72
/** 타임라인 막대와 카드 영역 사이 여백(px) */
const TIMELINE_TO_CARD_GAP = 40
const CARD_WIDTH = 320
const CARD_HEIGHT = 240
const CONNECTOR_GAP = 20
const ROW_HEIGHT = CARD_HEIGHT + CONNECTOR_GAP
const COL_STEP = CARD_WIDTH + 28
/** 직책 구간 구분선과 카드 사이 여백(px). 구분선과 카드 겹침 방지 */
const POSITION_GROUP_GAP_PX = 44
/** 직책 그룹 사이 추가 간격(px). 세 그룹 간격 균일·넓게 */
const BETWEEN_GROUP_GAP_PX = 28
/** 구분선과 이전 열 카드 끝 사이 간격(px). 선·카드 간격 통일 */
const SEPARATOR_OFFSET_PX = 24
/** 구분선과 다음 열 카드 시작 사이 간격(px). 모든 직책 열에서 선-카드 간격 동일하게 */
const SEPARATOR_TO_CARD_GAP = 24
/** 같은 열에서 카드 겹침 방지 시 카드 사이 최소 간격(px). 정이대장군 등 같은 열 다수 카드 겹침 방지 */
const CARD_STACK_GAP_PX = 20
/** 연도 기준 레이아웃 최대 높이(px). 범위가 크면 스크롤 없이 보이도록 상한 */
const MAX_YEAR_BASED_HEIGHT = 900
/** 세그먼트 하나당 높이 상한(px). 한 구간이 과도하게 늘어나 빈 공간 폭증 방지 */
const MAX_SEGMENT_HEIGHT_PX = 1100
/** 데이터 있는 구간(세그먼트) 사이 갭(px). 세기 구간을 넓게 느끼도록 */
const SEGMENT_GAP_PX = 32
/** 타임라인 세기/연도 라벨 블록 최소 높이(px). 짧은 구간에서도 연도가 보이도록 */
const TIMELINE_LABEL_MIN_HEIGHT_PX = 24
/** 연도 기준 시 카드 높이: 재임 연수당 px. 세기 구간을 넓게 */
const CARD_HEIGHT_PX_PER_YEAR = 14
const CARD_HEIGHT_MIN_YEAR_BASED = 200
/** 긴 재임(예: 쇼와 63년)이 짧은 재임(예: 3년)보다 확실히 길어 보이도록 상한 확대 */
const CARD_HEIGHT_MAX_YEAR_BASED = 720

interface LineageTreeProps {
  /** 세대별 재임 배열 (row 0 = 루트, row 1 = 그 자식들, ...) */
  rows: any[][]
  /** tenure id -> { row, col } */
  placement: Map<string, { row: number; col: number }>
  /** 부모 tenure id -> 자식 tenure id[] (같은 직책끼리만 연결됨) */
  parentToChildren: Map<string, string[]>
  getPersonName: (p: any) => string
  formatDate: (d: string) => string
  getRegnalNameFromNotes: (notes: string | null | undefined) => string | null
  /** 전체 보기일 때 카드에 직책명 표시. 있으면 카드 상단에 직책 뱃지 노출 */
  getPositionLabel?: (tenure: any) => string
  /** 직책 구간 구분선을 그을 열 인덱스(0 기준). 해당 열 왼쪽에 세로 구분선 표시 */
  separatorBeforeCols?: number[]
  /** 전체 보기 시 각 열 영역이 어떤 직책인지 표시할 헤더. 있으면 트리 상단에 직책 라벨 행 표시 */
  positionHeaders?: { label: string; startCol: number; colCount: number }[]
  /** true면 재임 기간에 비례해 카드 높이 적용 (전체 보기용) */
  variableCardHeight?: boolean
  /** 전체 보기에서 막대·카드를 실제 연도에 맞출 때 사용 (minYear~maxYear) */
  yearRange?: { minYear: number; maxYear: number }
  /** 재임(tenure)에 대한 가문명 반환. 없으면 t.person?.dynasty?.name 사용 */
  getDynastyNameForTenure?: (tenure: any) => string | null
  onCardClick: (tenureId: string) => void
}

export function LineageTree({
  rows,
  placement,
  parentToChildren,
  getPersonName,
  formatDate,
  getRegnalNameFromNotes,
  getPositionLabel,
  separatorBeforeCols = [],
  positionHeaders = [],
  variableCardHeight = false,
  yearRange,
  getDynastyNameForTenure,
  onCardClick,
}: LineageTreeProps) {
  const resolveDynastyName = (t: any): string | null => {
    if (getDynastyNameForTenure) return getDynastyNameForTenure(t)
    return (t.person as { dynasty?: { name: string } } | undefined)?.dynasty?.name ?? null
  }
  const totalRows = rows.length
  const totalCols =
    placement.size > 0
      ? Math.max(...Array.from(placement.values()).map((p) => p.col)) + 1
      : totalRows > 0
        ? Math.max(...rows.map((r) => r.length))
        : 0

  /** 열 인덱스 → 카드 left(px). 구분선과 카드 간격을 모든 열에서 동일하게 맞춤 */
  const getCardLeft = useMemo(() => {
    const lefts: number[] = []
    for (let c = 0; c < totalCols; c++) {
      if (c === 0) {
        lefts[0] = 0
        continue
      }
      const prevEnd = lefts[c - 1] + CARD_WIDTH
      if (separatorBeforeCols.includes(c)) {
        lefts[c] = prevEnd + SEPARATOR_OFFSET_PX + SEPARATOR_TO_CARD_GAP
      } else {
        lefts[c] = lefts[c - 1] + COL_STEP
      }
    }
    return (col: number) => lefts[col] ?? col * COL_STEP
  }, [totalCols, separatorBeforeCols])

  const treeWidth =
    totalCols > 0
      ? getCardLeft(totalCols - 1) + CARD_WIDTH
      : totalCols * COL_STEP

  /** 연도 기준 배치 사용 여부 (전체 보기 + yearRange 있음) */
  const useYearBasedLayout =
    variableCardHeight &&
    yearRange != null &&
    yearRange.maxYear > yearRange.minYear

  const yearBasedTotalHeight = useMemo(() => {
    if (!useYearBasedLayout || !yearRange) return 0
    const range = yearRange.maxYear - yearRange.minYear
    return Math.min(MAX_YEAR_BASED_HEIGHT, Math.max(400, range * 12))
  }, [useYearBasedLayout, yearRange])

  /** 재임 기간–막대 연도 일치: 날짜 문자열에서 연도만 추출(타임존 영향 제거) */
  const getYearFromDate = (s: string | null | undefined): number | null => {
    if (!s) return null
    const y = parseInt(String(s).slice(0, 4), 10)
    return Number.isNaN(y) ? null : y
  }

  /**
   * 연도 기준 레이아웃 — 데이터가 있는 구간만 세그먼트로 쪼개서 높이 배분.
   * 데이터 없는 기간(예: 1400~1800)은 픽셀을 쓰지 않고 세그먼트 갭만 둠.
   * 픽셀 = 세그먼트 내 (연도 - seg.start) / seg.range * seg.heightPx (카드·세기 라벨 동일).
   */
  const yearBasedLayout = useMemo(() => {
    if (!useYearBasedLayout || !yearRange || !placement) {
      return {
        positionByYear: null as Map<
          string,
          { topPx: number; heightPx: number }
        > | null,
        totalHeight: 0,
        minYear: 0,
        maxYear: 0,
        range: 0,
        segments: [] as {
          start: number
          end: number
          topPx: number
          heightPx: number
        }[],
      }
    }
    const flat = rows.flat() as any[]
    const intervals: { start: number; end: number }[] = []
    flat.forEach((t: any) => {
      const start = getYearFromDate(t.startDate)
      if (start == null) return
      const end = getYearFromDate(t.endDate) ?? new Date().getFullYear()
      intervals.push({ start, end })
    })
    if (intervals.length === 0) {
      return {
        positionByYear: null as Map<
          string,
          { topPx: number; heightPx: number }
        > | null,
        totalHeight: 0,
        minYear: yearRange.minYear,
        maxYear: yearRange.maxYear,
        range: Math.max(1, yearRange.maxYear - yearRange.minYear),
        segments: [],
      }
    }
    intervals.sort((a, b) => a.start - b.start)
    const merged: { start: number; end: number }[] = []
    let [curStart, curEnd] = [intervals[0].start, intervals[0].end]
    for (let i = 1; i < intervals.length; i++) {
      const { start, end } = intervals[i]
      if (start <= curEnd + 1) {
        curEnd = Math.max(curEnd, end)
      } else {
        merged.push({ start: curStart, end: curEnd })
        curStart = start
        curEnd = end
      }
    }
    merged.push({ start: curStart, end: curEnd })

    /* 이어지는 재임(예: 4대 1294~1347, 5대 1347~1361)이 다른 세그먼트에 떨어지지 않도록,
     * 어떤 재임이 두 인접 세그먼트 사이를 잇는 경우(span) 해당 세그먼트를 병합 */
    const spanMerge = (list: { start: number; end: number }[]) => {
      if (list.length <= 1) return list
      const out: { start: number; end: number }[] = []
      let [s, e] = [list[0].start, list[0].end]
      for (let i = 1; i < list.length; i++) {
        const seg = list[i]
        const spanned = flat.some((t: any) => {
          const start = getYearFromDate(t.startDate)
          if (start == null) return false
          const end = getYearFromDate(t.endDate) ?? new Date().getFullYear()
          return start <= e && end >= seg.start
        })
        if (spanned || seg.start <= e + 1) {
          e = Math.max(e, seg.end)
        } else {
          out.push({ start: s, end: e })
          s = seg.start
          e = seg.end
        }
      }
      out.push({ start: s, end: e })
      return out
    }
    const mergedSpanned = spanMerge(merged)

    const totalDataYears = mergedSpanned.reduce(
      (s, seg) => s + (seg.end - seg.start),
      0,
    )
    const nSeg = mergedSpanned.length
    const gapTotal = (nSeg - 1) * SEGMENT_GAP_PX
    const available = Math.min(
      MAX_YEAR_BASED_HEIGHT - gapTotal,
      Math.max(500 - gapTotal, totalDataYears * 14),
    )
    let segmentBaseHeights = mergedSpanned.map(
      (seg) => ((seg.end - seg.start) / totalDataYears) * available,
    )
    /* 긴 재임(예: 쇼와 63년)이 있는 세그먼트는 재임 기간에 비례해 최소 높이 보장 */
    const maxDurationBySeg = mergedSpanned.map((seg, i) => {
      const list = flat.filter((t: any) => {
        const start = getYearFromDate(t.startDate)
        if (start == null) return false
        const end = getYearFromDate(t.endDate) ?? new Date().getFullYear()
        return start <= seg.end && end >= seg.start
      })
      return Math.max(
        0,
        ...list.map((t: any) => {
          const start = getYearFromDate(t.startDate)!
          const end = getYearFromDate(t.endDate) ?? new Date().getFullYear()
          return end - start
        }),
        0,
      )
    })
    segmentBaseHeights = segmentBaseHeights.map((h, i) => {
      const minH = Math.min(
        CARD_HEIGHT_MAX_YEAR_BASED,
        Math.max(0, maxDurationBySeg[i]) * CARD_HEIGHT_PX_PER_YEAR,
      )
      return Math.max(h, minH)
    })

    const tenuresBySeg = mergedSpanned.map((seg) => {
      const list: { id: string; start: number; end: number; col: number }[] = []
      flat.forEach((t: any) => {
        const start = getYearFromDate(t.startDate)
        if (start == null) return
        const end = getYearFromDate(t.endDate) ?? new Date().getFullYear()
        if (start > seg.end || end < seg.start) return
        const col = placement.get(t.id)?.col ?? 0
        list.push({ id: t.id, start, end, col })
      })
      return list
    })

    const segmentMinScales = segmentBaseHeights.map((baseH, segIdx) => {
      const list = tenuresBySeg[segIdx]
      const seg = mergedSpanned[segIdx]
      const range = seg.end - seg.start
      const byCol = new Map<
        number,
        { id: string; start: number; end: number }[]
      >()
      list.forEach(({ id, start, end, col }) => {
        const arr = byCol.get(col) ?? []
        arr.push({ id, start, end })
        byCol.set(col, arr)
      })
      let minScale = 1
      byCol.forEach((colList) => {
        colList.sort((a, b) => a.start - b.start)
        /* 1년 재임 등 짧은 카드가 많을 때: 열 전체가 n*최소높이+(n-1)*갭 이상 필요 */
        const n = colList.length
        const totalNeededPx =
          n * CARD_HEIGHT_MIN_YEAR_BASED +
          Math.max(0, n - 1) * CARD_STACK_GAP_PX
        if (totalNeededPx > baseH) {
          minScale = Math.max(minScale, totalNeededPx / baseH)
        }
        for (let i = 1; i < colList.length; i++) {
          const prev = colList[i - 1]
          const curr = colList[i]
          const yearGap = curr.start - prev.start
          const prevDuration = Math.max(1, prev.end - prev.start)
          /* 재임이 세그먼트 대부분이면 카드가 세그먼트 전체 높이를 쓰므로 baseH로 계산 */
          const prevHeightPx =
            prevDuration >= range * 0.95
              ? baseH
              : Math.max(
                  CARD_HEIGHT_MIN_YEAR_BASED,
                  Math.min(
                    CARD_HEIGHT_MAX_YEAR_BASED,
                    (prevDuration / range) * baseH,
                  ),
                )
          const needPx = prevHeightPx + CARD_STACK_GAP_PX
          /* 같은 연도 시작(yearGap<=0)이어도 최소 1년분 픽셀 간격으로 겹침 방지 */
          const gapPx = (Math.max(yearGap, 1) / range) * baseH
          if (gapPx < needPx) minScale = Math.max(minScale, needPx / gapPx)
        }
      })
      return minScale
    })

    /* minScale 적용. 상한 초과 시 세그먼트 높이 캡으로 빈 공간 폭증 방지 */
    let segmentHeights = segmentBaseHeights.map(
      (h, i) => Math.min(h * segmentMinScales[i], MAX_SEGMENT_HEIGHT_PX),
    )

    let accTop = 0
    const segments = mergedSpanned.map((seg, i) => {
      const topPx = accTop
      const heightPx = segmentHeights[i]
      accTop += heightPx + SEGMENT_GAP_PX
      return { start: seg.start, end: seg.end, topPx, heightPx }
    })

    const positionByYear = new Map<
      string,
      { topPx: number; heightPx: number }
    >()
    flat.forEach((t: any) => {
      const start = getYearFromDate(t.startDate)
      if (start == null) return
      const end = getYearFromDate(t.endDate) ?? new Date().getFullYear()
      const segIdx = mergedSpanned.findIndex(
        (seg) => start >= seg.start && start <= seg.end,
      )
      if (segIdx < 0) return
      const seg = mergedSpanned[segIdx]
      const segTop = segments[segIdx].topPx
      const segH = segments[segIdx].heightPx
      const range = seg.end - seg.start
      const durationYears = Math.max(1, (end ?? start) - start)
      const topPx = segTop + ((start - seg.start) / range) * segH
      /* 재임이 세그먼트 전체(또는 거의 전체)를 차지하면 카드가 세그먼트 높이를 채우도록 (예: 메이지 1868~1912) */
      const proportionalHeight = (durationYears / range) * segH
      const heightPx =
        durationYears >= range * 0.95
          ? segH
          : Math.max(
              CARD_HEIGHT_MIN_YEAR_BASED,
              Math.min(CARD_HEIGHT_MAX_YEAR_BASED, proportionalHeight),
            )
      positionByYear.set(t.id, { topPx, heightPx })
    })

    /* 같은 열·같은 세그먼트에서 겹치는 카드는 아래로 쌓기 */
    const oldAccTop = segments.map((s) => s.topPx)
    mergedSpanned.forEach((seg, segIdx) => {
      const list = tenuresBySeg[segIdx]
        .slice()
        .sort((a, b) => a.start - b.start || a.end - b.end)
      const byCol = new Map<number, typeof list>()
      list.forEach((item) => {
        const arr = byCol.get(item.col) ?? []
        arr.push(item)
        byCol.set(item.col, arr)
      })
      byCol.forEach((colList) => {
        for (let i = 1; i < colList.length; i++) {
          const prev = positionByYear.get(colList[i - 1].id)!
          const curr = positionByYear.get(colList[i].id)!
          const needTop = prev.topPx + prev.heightPx + CARD_STACK_GAP_PX
          if (curr.topPx < needTop) {
            curr.topPx = needTop
          }
        }
      })
    })

    /* 쌓인 카드가 세그먼트 밖으로 나가면 세그먼트 높이 확대 */
    segments.forEach((seg, segIdx) => {
      let maxBottom = seg.topPx + seg.heightPx
      tenuresBySeg[segIdx].forEach(({ id }) => {
        const pos = positionByYear.get(id)
        if (pos) maxBottom = Math.max(maxBottom, pos.topPx + pos.heightPx)
      })
      const needH = maxBottom - seg.topPx
      if (needH > seg.heightPx) {
        seg.heightPx = needH
        segmentHeights[segIdx] = needH
      }
    })
    const totalHeight = segmentHeights.reduce((a, b) => a + b, 0) + gapTotal

    /* 세그먼트 높이 변경으로 다음 세그먼트 top이 밀리면 해당 열 카드 top 보정 */
    let accTopNew = 0
    segments.forEach((seg, i) => {
      const newTop = accTopNew
      const delta = newTop - oldAccTop[i]
      if (delta !== 0) {
        tenuresBySeg[i].forEach(({ id }) => {
          const pos = positionByYear.get(id)
          if (pos) pos.topPx += delta
        })
      }
      seg.topPx = newTop
      accTopNew += seg.heightPx + SEGMENT_GAP_PX
    })

    /* 세그먼트를 넘어서도 같은 열에서 이어지는 재임(prev.end ≈ curr.start)은 바로 아래로 붙이기 */
    const flatWithYear = flat
      .map((t: any) => {
        const start = getYearFromDate(t.startDate)
        if (start == null) return null
        const end = getYearFromDate(t.endDate) ?? new Date().getFullYear()
        const col = placement.get(t.id)?.col ?? 0
        return { id: t.id, start, end, col }
      })
      .filter(Boolean) as { id: string; start: number; end: number; col: number }[]
    const byColAll = new Map<number, typeof flatWithYear>()
    flatWithYear.forEach((item) => {
      const arr = byColAll.get(item.col) ?? []
      arr.push(item)
      byColAll.set(item.col, arr)
    })
    byColAll.forEach((colList) => {
      colList.sort((a, b) => a.start - b.start || a.end - b.end)
      for (let i = 1; i < colList.length; i++) {
        const prev = colList[i - 1]
        const curr = colList[i]
        const prevPos = positionByYear.get(prev.id)
        const currPos = positionByYear.get(curr.id)
        if (!prevPos || !currPos) continue
        const needTop = prevPos.topPx + prevPos.heightPx + CARD_STACK_GAP_PX
        if (curr.start <= prev.end + 1 && currPos.topPx > needTop) {
          currPos.topPx = needTop
        }
      }
    })

    return {
      positionByYear,
      totalHeight,
      minYear: yearRange.minYear,
      maxYear: yearRange.maxYear,
      range: Math.max(1, yearRange.maxYear - yearRange.minYear),
      segments,
    }
  }, [useYearBasedLayout, yearRange, rows, placement])

  /** 재임 기간(년) → 카드 높이(px). 전체 보기에서만 사용. 연도 기준이면 yearBasedLayout 사용 */
  const tenureIdToCardHeight = useMemo(() => {
    if (!variableCardHeight) return null
    const posMap = yearBasedLayout?.positionByYear
    if (posMap) {
      const map = new Map<string, number>()
      posMap.forEach((v, id) => map.set(id, Math.round(v.heightPx)))
      return map
    }
    const MIN_H = CARD_HEIGHT
    const MAX_H = 380
    const BASE_H = CARD_HEIGHT
    const PX_PER_YEAR = 5
    const map = new Map<string, number>()
    rows.flat().forEach((t: any) => {
      const start = t.startDate ? new Date(t.startDate).getFullYear() : null
      const end = t.endDate ? new Date(t.endDate).getFullYear() : null
      const endYear = end ?? (start != null ? new Date().getFullYear() : null)
      const years =
        start != null && endYear != null ? Math.max(0, endYear - start) : 0
      const h = Math.round(
        Math.min(MAX_H, Math.max(MIN_H, BASE_H + years * PX_PER_YEAR)),
      )
      map.set(t.id, h)
    })
    return map
  }, [variableCardHeight, rows, yearBasedLayout?.positionByYear])

  /** 행별 높이. variableCardHeight면 행 내 최대 카드높이 + 갭, 아니면 고정 ROW_HEIGHT */
  const rowHeights = useMemo(() => {
    if (!tenureIdToCardHeight) {
      return Array(totalRows).fill(ROW_HEIGHT) as number[]
    }
    return rows.map((row) => {
      const maxCard = Math.max(
        ...row.map((t: any) => tenureIdToCardHeight.get(t.id) ?? CARD_HEIGHT),
      )
      return maxCard + CONNECTOR_GAP
    })
  }, [totalRows, rows, tenureIdToCardHeight])

  const svgHeight =
    useYearBasedLayout && yearBasedLayout.totalHeight > 0
      ? yearBasedLayout.totalHeight
      : rowHeights.reduce((a, b) => a + b, 0)

  const round = (n: number) => Math.round(n)
  const colCenter = (col: number) =>
    round(
      TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP + col * COL_STEP + CARD_WIDTH / 2,
    )
  const cardTopByRow = (row: number) =>
    rowHeights.slice(0, row).reduce((a, b) => a + b, 0) + CONNECTOR_GAP / 2
  const cardTop = (row: number) =>
    tenureIdToCardHeight
      ? cardTopByRow(row)
      : round(row * ROW_HEIGHT + CONNECTOR_GAP / 2)
  const cardBottom = (row: number) =>
    tenureIdToCardHeight
      ? cardTopByRow(row) + (rowHeights[row] ?? ROW_HEIGHT) - CONNECTOR_GAP
      : round(row * ROW_HEIGHT + CONNECTOR_GAP / 2 + CARD_HEIGHT)
  const separatorColsSet = useMemo(
    () => new Set(separatorBeforeCols),
    [separatorBeforeCols],
  )

  /** 막대바 라벨: 1400, 1800, 1900 등 세기(100년 단위)만 표시. 현재 연도는 "현재"로 표시 */
  const centurySpans = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const getYearLabel = (year: number) =>
      year >= 0 ? String(year) : `BC ${Math.abs(year)}`
    const getDisplayLabel = (year: number) =>
      year === currentYear ? '현재' : getYearLabel(year)
    const segs = yearBasedLayout?.segments
    if (
      useYearBasedLayout &&
      yearBasedLayout?.totalHeight > 0 &&
      segs &&
      segs.length > 0
    ) {
      const spans: {
        label: string
        startRow: number
        endRow: number
        top: number
        height: number
      }[] = []
      const centuryStep = 100
      const addedYears = new Set<number>()
      segs.forEach((seg) => {
        const { start, end, topPx, heightPx } = seg
        const range = seg.end - seg.start
        /* 세그먼트 실제 시작 연도(예: 1868) — 100년 단위가 아니면 맨 위에 표시 */
        if (start % centuryStep !== 0 && !addedYears.has(start)) {
          addedYears.add(start)
          const nextY = Math.floor(start / centuryStep) * centuryStep + centuryStep
          const segTop = topPx
          const segBottom =
            topPx + ((Math.min(nextY, end + 1) - start) / range) * heightPx
          const rawHeight = Math.max(0, segBottom - segTop)
          const height =
            rawHeight > 0
              ? Math.max(TIMELINE_LABEL_MIN_HEIGHT_PX, rawHeight)
              : 0
          if (height > 0) {
            spans.push({
              label: getDisplayLabel(start),
              startRow: 0,
              endRow: 0,
              top: segTop,
              height,
            })
          }
        }
        /* 세기 라벨(1900 등) — 세그먼트 실제 구간 안에 있는 연도만 표시 (1800은 1868~1912 구간에 없으므로 제외) */
        let y = Math.floor(start / centuryStep) * centuryStep
        while (y <= end) {
          if (y >= start && !addedYears.has(y)) {
            addedYears.add(y)
            const nextY = y + centuryStep
            const top =
              topPx + ((Math.max(y, start) - start) / range) * heightPx
            const bottom =
              topPx + ((Math.min(nextY, end + 1) - start) / range) * heightPx
            const rawHeight = Math.max(0, bottom - top)
            const height =
              rawHeight > 0
                ? Math.max(TIMELINE_LABEL_MIN_HEIGHT_PX, rawHeight)
                : 0
            if (height > 0) {
              spans.push({
                label: getDisplayLabel(y),
                startRow: 0,
                endRow: 0,
                top,
                height,
              })
            }
          }
          y += centuryStep
        }
      })
      return spans
    }
    if (
      useYearBasedLayout &&
      yearBasedLayout?.totalHeight > 0 &&
      yearBasedLayout?.range > 0
    ) {
      const { totalHeight: totalH, minYear, maxYear, range } = yearBasedLayout
      const spans: {
        label: string
        startRow: number
        endRow: number
        top: number
        height: number
      }[] = []
      const centuryStep = 100
      let y = Math.floor(minYear / centuryStep) * centuryStep
      while (y <= maxYear) {
        const nextY = y + centuryStep
        const top = Math.max(
          0,
          ((Math.max(y, minYear) - minYear) / range) * totalH,
        )
        const bottom = Math.min(
          totalH,
          ((Math.min(nextY, maxYear + 1) - minYear) / range) * totalH,
        )
        const height = Math.max(0, bottom - top)
        if (height > 0) {
          spans.push({
            label: getDisplayLabel(y),
            startRow: 0,
            endRow: 0,
            top,
            height,
          })
        }
        y = nextY
      }
      return spans
    }
    /* 그리드 모드 또는 연도 기준인데 layout 미준비: 행 기준 세기 구간 */
    const spans: {
      label: string
      startRow: number
      endRow: number
      top?: number
      height?: number
    }[] = []
    let current: { century: number; startRow: number } | null = null
    rows.forEach((row, idx) => {
      const t = row[0]
      if (!t?.startDate) return
      const yr = new Date(t.startDate).getFullYear()
      const century = Math.floor(yr / 100) + (yr >= 0 ? 1 : 0)
      if (current?.century === century) return
      if (current)
        spans.push({
          label: getDisplayLabel((current.century - 1) * 100),
          startRow: current.startRow,
          endRow: idx - 1,
        })
      current = { century, startRow: idx }
    })
    type RowSpan = { century: number; startRow: number }
    if (current) {
      const c = current as RowSpan
      spans.push({
        label: getDisplayLabel((c.century - 1) * 100),
        startRow: c.startRow,
        endRow: rows.length - 1,
      })
    }
    return spans
  }, [rows, useYearBasedLayout, yearBasedLayout])

  /** tenure id → tenure (선 끝 뱃지 라벨/색상용) */
  const tenureById = useMemo(() => {
    const m = new Map<string, any>()
    rows.flat().forEach((t: any) => m.set(t.id, t))
    return m
  }, [rows])

  /** SVG 연결선: 부모 카드 하단 중앙 → 세로 → 가로 → 각 자식 카드 상단 중앙. 꼭지점·끝점(뱃지) 포함 */
  const connectorPaths = useMemo(() => {
    const paths: {
      d: string
      key: string
      vertices: { x: number; y: number }[]
      endpoints: { childId: string; x: number; y: number; label: string; bg: string; color: string; border: string }[]
    }[] = []
    parentToChildren.forEach((childIds, parentId) => {
      const parent = placement.get(parentId)
      if (!parent || childIds.length === 0) return
      const children = childIds
        .map((id) => ({ id, pos: placement.get(id) }))
        .filter(
          (c): c is { id: string; pos: { row: number; col: number } } =>
            c.pos != null,
        )
      if (children.length === 0) return

      const parentBottomX = colCenter(parent.col)
      const parentBottomY = cardBottom(parent.row)
      const childRow = parent.row + 1
      const childTopY = cardTop(childRow)
      const connectorY = round(parentBottomY + (childTopY - parentBottomY) / 2)

      const minCol = Math.min(...children.map((c) => c.pos.col))
      const maxCol = Math.max(...children.map((c) => c.pos.col))
      const leftX = colCenter(minCol)
      const rightX = colCenter(maxCol)

      const vertices: { x: number; y: number }[] = [
        { x: parentBottomX, y: parentBottomY },
        { x: parentBottomX, y: connectorY },
        { x: leftX, y: connectorY },
        { x: rightX, y: connectorY },
      ]

      let d = `M ${parentBottomX} ${parentBottomY} L ${parentBottomX} ${connectorY}`
      d += ` L ${leftX} ${connectorY} L ${rightX} ${connectorY}`
      const endpoints: { childId: string; x: number; y: number; label: string; bg: string; color: string; border: string }[] = []
      children.forEach((c) => {
        const cx = colCenter(c.pos.col)
        vertices.push({ x: cx, y: connectorY }, { x: cx, y: childTopY })
        d += ` M ${cx} ${connectorY} L ${cx} ${childTopY}`
        const tenure = tenureById.get(c.id)
        const label = getPositionLabel?.(tenure) ?? ''
        if (label) {
          const colors = getBadgeColorsForLabel(label)
          endpoints.push({
            childId: c.id,
            x: cx,
            y: childTopY,
            label,
            bg: colors.bg,
            color: colors.color,
            border: colors.border,
          })
        }
      })
      paths.push({ d, key: parentId, vertices, endpoints })
    })
    return paths
  }, [placement, parentToChildren, tenureById, getPositionLabel])

  /** 자식 tenure id → 부모 tenure (카드에 "↑ 부/이전" 표시용) */
  const childToParentTenure = useMemo(() => {
    const tenureById = new Map<string, any>()
    rows.flat().forEach((t: any) => tenureById.set(t.id, t))
    const childToParentId = new Map<string, string>()
    parentToChildren.forEach((childIds, parentId) =>
      childIds.forEach((cid) => childToParentId.set(cid, parentId)),
    )
    const map = new Map<string, any>()
    childToParentId.forEach((parentId, childId) => {
      const parent = tenureById.get(parentId)
      if (parent) map.set(childId, parent)
    })
    return map
  }, [rows, parentToChildren])

  /** 재위 연도·기간 문자열 "YYYY~YYYY, N년" (연도 먼저, 재임 년수는 뒤에) */
  const getReignLabel = (t: any) => {
    const start = t.startDate ? new Date(t.startDate).getFullYear() : null
    const end = t.endDate ? new Date(t.endDate).getFullYear() : null
    const endYear = end ?? (start != null ? new Date().getFullYear() : null)
    const years =
      start != null && endYear != null ? Math.max(0, endYear - start) : null
    if (start == null && endYear == null) return '재위 기간 미상'
    const range = end == null ? `${start}~현재` : `${start}~${endYear}`
    return years != null ? `(${range}, ${years}년)` : `(${range})`
  }

  return (
    <TreeOuter>
      <ScrollContainer>
        {positionHeaders.length > 0 && (
          <PositionHeaderRow
            style={{ width: TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP + treeWidth }}
          >
            {positionHeaders.map(({ label, startCol, colCount }) => (
              <PositionHeaderCell
                key={label}
                style={{
                  left:
                    TIMELINE_WIDTH +
                    TIMELINE_TO_CARD_GAP +
                    getCardLeft(startCol),
                  width:
                    getCardLeft(startCol + colCount - 1) +
                    CARD_WIDTH -
                    getCardLeft(startCol),
                }}
              >
                {label}
              </PositionHeaderCell>
            ))}
          </PositionHeaderRow>
        )}
        <TreeWrap
          style={{
            width: TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP + treeWidth,
            minHeight: svgHeight,
          }}
        >
          {useYearBasedLayout &&
          yearBasedLayout.totalHeight > 0 &&
          yearBasedLayout.positionByYear &&
          yearBasedLayout.positionByYear.size > 0 ? (
            /* 연도 기준: 타임라인과 카드를 한 컨테이너에 넣어 같은 top 좌표계 사용. 스크롤은 ScrollContainer에서 */
            <UnifiedYearBasedContainer
              style={{
                position: 'relative',
                width: TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP + treeWidth,
                height: svgHeight,
              }}
            >
              <TimelineColumnAbsolute style={{ height: svgHeight }}>
                <TimelineBar />
                {centurySpans.map((span, i) => {
                  const top =
                    'top' in span && span.top != null
                      ? span.top
                      : cardTop(span.startRow)
                  const height =
                    'height' in span && span.height != null
                      ? span.height
                      : cardBottom(span.endRow) - cardTop(span.startRow)
                  return (
                    <CenturySpanBlock
                      key={`${span.label}-${i}`}
                      style={{ top, height }}
                    >
                      <TimelineNode />
                      <TimelineLabelWrap>
                        <TimelineLabel>{span.label}</TimelineLabel>
                      </TimelineLabelWrap>
                    </CenturySpanBlock>
                  )
                })}
              </TimelineColumnAbsolute>
              <TreeAreaAbsolute
                style={{
                  left: TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP,
                  width: treeWidth,
                  height: svgHeight,
                }}
              >
                {rows.flat().map((t: any) => {
                  const positionByYear = yearBasedLayout.positionByYear!
                  const pos = placement.get(t.id)
                  const col = pos?.col ?? 0
                  const posYear = positionByYear.get(t.id)
                  if (!posYear) return null
                  const left = getCardLeft(col)
                  const cardHeightPx = Math.round(posYear.heightPx)
                  const titleText = t.title || t.position?.title || '—'
                  const regnalName = getRegnalNameFromNotes(t.notes)
                  const personName = getPersonName(t.person)
                  const mainLabel = regnalName || personName
                  const subLabel = regnalName ? personName : null
                  /** 메인은 몇 대(초대/제N대). termNumber 없을 때만 N세 표시 */
                  const orderLabel =
                    t.termNumber != null
                      ? t.termNumber === 1
                        ? '초대'
                        : `제${t.termNumber}대`
                      : t.regnalNumber != null
                        ? `${t.regnalNumber}세`
                        : '—'
                  const reignLabel = getReignLabel(t)
                  const parentTenure = childToParentTenure.get(t.id)
                  const parentOrderLabel = parentTenure
                    ? parentTenure.termNumber != null
                      ? parentTenure.termNumber === 1
                        ? '초대'
                        : `제${parentTenure.termNumber}대`
                      : parentTenure.regnalNumber != null
                        ? `${parentTenure.regnalNumber}세`
                        : ''
                    : ''
                  const parentRegnal =
                    parentTenure && getRegnalNameFromNotes(parentTenure.notes)
                  const parentDisplay =
                    parentRegnal ||
                    (parentTenure ? getPersonName(parentTenure.person) : '')

                  return (
                    <TreeCardYearBased
                      key={t.id}
                      style={{
                        left,
                        top: posYear.topPx,
                        minHeight: cardHeightPx,
                        height: cardHeightPx,
                      }}
                      onClick={() => onCardClick(t.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onCardClick(t.id)
                        }
                      }}
                    >
                      <TreeCardOrder>{orderLabel}</TreeCardOrder>
                      <TreeCardReign>{reignLabel}</TreeCardReign>
                      <TreeCardHead>
                        {getPositionLabel?.(t) && (() => {
                          const label = getPositionLabel(t)
                          const c = getBadgeColorsForLabel(label)
                          return (
                            <TreeCardPositionBadge $badgeBg={c.bg} $badgeColor={c.color} $badgeBorder={c.border}>
                              {label}
                            </TreeCardPositionBadge>
                          )
                        })()}
                      </TreeCardHead>
                      <TreeCardMainName>{mainLabel}</TreeCardMainName>
                      {subLabel && (
                        <TreeCardSubName>{subLabel}</TreeCardSubName>
                      )}
                      {resolveDynastyName(t) && (
                        <TreeCardDynasty>가문: {resolveDynastyName(t)}</TreeCardDynasty>
                      )}
                      {parentTenure && parentDisplay && (
                        <TreeCardRelation>
                          ↑ 이전: {parentDisplay} ({parentOrderLabel})
                        </TreeCardRelation>
                      )}
                      {titleText && titleText !== '—' && (
                        <TreeCardTitle>{titleText}</TreeCardTitle>
                      )}
                      <TreeCardAvatar $hasImage={!!t.person?.profileImageUrl}>
                        {t.person?.profileImageUrl ? (
                          <img src={t.person.profileImageUrl} alt="" />
                        ) : (
                          <FiUser size={28} />
                        )}
                      </TreeCardAvatar>
                    </TreeCardYearBased>
                  )
                })}
              </TreeAreaAbsolute>
              {/* 직책별 섹션 사이 구분선 비표시 (레이아웃은 separatorBeforeCols로 유지) */}
            </UnifiedYearBasedContainer>
          ) : (
            <>
              <TimelineColumn
                style={useYearBasedLayout ? { height: svgHeight } : undefined}
              >
                <TimelineBar />
                {centurySpans.map((span, i) => {
                  const top =
                    'top' in span && span.top != null
                      ? span.top
                      : cardTop(span.startRow)
                  const height =
                    'height' in span && span.height != null
                      ? span.height
                      : cardBottom(span.endRow) - cardTop(span.startRow)
                  return (
                    <CenturySpanBlock
                      key={`${span.label}-${i}`}
                      style={{ top, height }}
                    >
                      <TimelineNode />
                      <TimelineLabelWrap>
                        <TimelineLabel>{span.label}</TimelineLabel>
                      </TimelineLabelWrap>
                    </CenturySpanBlock>
                  )
                })}
              </TimelineColumn>
              <TreeArea style={{ width: treeWidth, height: svgHeight }}>
                <TreeGrid
                  style={
                    {
                      '--tree-cols': totalCols,
                      '--tree-rows': totalRows,
                      '--tree-area-width': `${treeWidth}px`,
                      '--tree-area-height': `${svgHeight}px`,
                      ...(variableCardHeight && rowHeights.length > 0
                        ? {
                            gridTemplateRows: rowHeights
                              .map((h) => `${h}px`)
                              .join(' '),
                          }
                        : {}),
                    } as React.CSSProperties
                  }
                >
                  {rows.map((row, rowIdx) =>
                    row.map((t: any, colIdx: number) => {
                      const pos = placement.get(t.id)
                      const gridCol = (pos?.col ?? colIdx) + 1
                      const gridRow = (pos?.row ?? rowIdx) + 1
                      const cardHeightPx =
                        variableCardHeight && tenureIdToCardHeight
                          ? (tenureIdToCardHeight.get(t.id) ?? CARD_HEIGHT)
                          : undefined
                      const titleText = t.title || t.position?.title || '—'
                      const regnalName = getRegnalNameFromNotes(t.notes)
                      const personName = getPersonName(t.person)
                      const mainLabel = regnalName || personName
                      const subLabel = regnalName ? personName : null
                      /** 메인은 몇 대(초대/제N대). termNumber 없을 때만 N세 표시 */
                      const orderLabel =
                        t.termNumber != null
                          ? t.termNumber === 1
                            ? '초대'
                            : `제${t.termNumber}대`
                          : t.regnalNumber != null
                            ? `${t.regnalNumber}세`
                            : '—'
                      const reignLabel = getReignLabel(t)
                      const parentTenure = childToParentTenure.get(t.id)
                      const parentOrderLabel = parentTenure
                        ? parentTenure.termNumber != null
                          ? parentTenure.termNumber === 1
                            ? '초대'
                            : `제${parentTenure.termNumber}대`
                          : parentTenure.regnalNumber != null
                            ? `${parentTenure.regnalNumber}세`
                            : ''
                        : ''
                      const parentRegnal =
                        parentTenure &&
                        getRegnalNameFromNotes(parentTenure.notes)
                      const parentDisplay =
                        parentRegnal ||
                        (parentTenure ? getPersonName(parentTenure.person) : '')

                      const isFirstColOfGroup =
                        pos != null && separatorColsSet.has(pos.col)
                      return (
                        <TreeCardWrap
                          key={t.id}
                          style={{
                            gridColumn: gridCol,
                            gridRow,
                            ...(isFirstColOfGroup && {
                              marginLeft: POSITION_GROUP_GAP_PX,
                            }),
                          }}
                        >
                          <TreeCard
                            style={
                              cardHeightPx != null
                                ? {
                                    minHeight: cardHeightPx,
                                    height: cardHeightPx,
                                  }
                                : undefined
                            }
                            onClick={() => onCardClick(t.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onCardClick(t.id)
                              }
                            }}
                          >
                            <TreeCardOrder>{orderLabel}</TreeCardOrder>
                            <TreeCardReign>{reignLabel}</TreeCardReign>
                            <TreeCardHead>
                              {getPositionLabel?.(t) && (() => {
                                const label = getPositionLabel(t)
                                const c = getBadgeColorsForLabel(label)
                                return (
                                  <TreeCardPositionBadge $badgeBg={c.bg} $badgeColor={c.color} $badgeBorder={c.border}>
                                    {label}
                                  </TreeCardPositionBadge>
                                )
                              })()}
                            </TreeCardHead>
                            <TreeCardMainName>{mainLabel}</TreeCardMainName>
                            {subLabel && (
                              <TreeCardSubName>{subLabel}</TreeCardSubName>
                            )}
                            {resolveDynastyName(t) && (
                              <TreeCardDynasty>가문: {resolveDynastyName(t)}</TreeCardDynasty>
                            )}
                            {parentTenure && parentDisplay && (
                              <TreeCardRelation>
                                ↑ 이전: {parentDisplay} ({parentOrderLabel})
                              </TreeCardRelation>
                            )}
                            {titleText && titleText !== '—' && (
                              <TreeCardTitle>{titleText}</TreeCardTitle>
                            )}
                            <TreeCardAvatar
                              $hasImage={!!t.person?.profileImageUrl}
                            >
                              {t.person?.profileImageUrl ? (
                                <img src={t.person.profileImageUrl} alt="" />
                              ) : (
                                <FiUser size={28} />
                              )}
                            </TreeCardAvatar>
                          </TreeCard>
                        </TreeCardWrap>
                      )
                    }),
                  )}
                </TreeGrid>
                {/* 직책별 섹션 사이 구분선 비표시 */}
                {connectorPaths.length > 0 && !useYearBasedLayout && (
                  <>
                    <TreeSvg
                      width={TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP + treeWidth}
                      height={svgHeight}
                      style={{
                        position: 'absolute',
                        left: -(TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP),
                        top: 0,
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}
                    >
                      {connectorPaths.map(({ d, key }) => (
                        <path
                          key={key}
                          d={d}
                          fill="none"
                          stroke="rgba(99, 102, 241, 0.28)"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </TreeSvg>
                    <ConnectorBadgesLayer
                      style={{
                        position: 'absolute',
                        left: -(TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP),
                        top: 0,
                        width: TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP + treeWidth,
                        height: svgHeight,
                        pointerEvents: 'none',
                        zIndex: 6,
                      }}
                    >
                      {connectorPaths.flatMap((p) =>
                        p.endpoints.map((ep) => (
                          <ConnectorEndBadge
                            key={ep.childId}
                            $bg={ep.bg}
                            $color={ep.color}
                            $border={ep.border}
                            style={{
                              left: ep.x,
                              top: ep.y,
                            }}
                          >
                            {ep.label}
                          </ConnectorEndBadge>
                        )),
                      )}
                    </ConnectorBadgesLayer>
                  </>
                )}
              </TreeArea>
            </>
          )}
        </TreeWrap>
        {connectorPaths.length > 0 && !useYearBasedLayout && (
          <Legend>↑ 이전 = 직전 재임 또는 부모 관계</Legend>
        )}
      </ScrollContainer>
    </TreeOuter>
  )
}

/* ─── 디자인: 깔끔·트렌디 (미니멀, 여백, 소프트 섀도우) ─── */
const BORDER_SUBTLE = '#e5e7eb'
const SHADOW_SOFT = '0 1px 3px rgba(0, 0, 0, 0.04)'
const SHADOW_CARD = '0 2px 12px rgba(0, 0, 0, 0.04)'
const SHADOW_CARD_HOVER = '0 8px 24px rgba(99, 102, 241, 0.12)'
const ACCENT = '#6366f1'

/** 전체 블록 — 여백만 강조 */
const TreeOuter = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 40px 48px 56px;
  background: #fff;
  border-radius: 0;
`

const ScrollContainer = styled.div`
  overflow: visible;
`

/** 직책 헤더 — 미니멀, 좌측 악센트만 */
const PositionHeaderRow = styled.div`
  position: relative;
  height: 48px;
  margin-bottom: 32px;
  display: flex;
  align-items: stretch;
  padding-left: ${TIMELINE_WIDTH}px;
`

const PositionHeaderCell = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.03em;
  box-sizing: border-box;
  padding: 0 24px 0 18px;
  background: #fafbfc;
  border-left: 3px solid ${ACCENT};
  border-radius: 0 10px 10px 0;
`

const TreeWrap = styled.div`
  position: relative;
  display: flex;
  margin: 0;
  margin-right: auto;
  padding: 0 0 56px;
`

const Legend = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 28px;
  padding-left: ${TIMELINE_WIDTH + TIMELINE_TO_CARD_GAP}px;
  font-weight: 400;
  max-width: 420px;
`

/** 타임라인 열 — 미니멀 */
const TimelineColumn = styled.div`
  width: ${TIMELINE_WIDTH}px;
  margin-right: ${TIMELINE_TO_CARD_GAP}px;
  flex-shrink: 0;
  position: relative;
`

/** 세로 라인 — 아주 조금 굵게 */
const TimelineBar = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 3px;
  margin-left: -1.5px;
  background: linear-gradient(180deg, #c7d2fe 0%, #a5b4fc 50%, #818cf8 100%);
  border-radius: 3px;
`

/** 연도 노드 — 작은 도트 */
const TimelineNode = styled.span`
  position: absolute;
  left: 50%;
  top: 6px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background: ${ACCENT};
  box-shadow: 0 0 0 3px #fff;
  flex-shrink: 0;
`

const CenturySpanBlock = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  pointer-events: none;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
`

const TimelineLabelWrap = styled.span`
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const TimelineLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  padding: 5px 12px;
  background: #fff;
  border: 1px solid ${BORDER_SUBTLE};
  border-radius: 8px;
  display: inline-block;
  box-shadow: ${SHADOW_SOFT};
`

const TreeArea = styled.div`
  position: relative;
  flex-shrink: 0;
  overflow: visible;
  isolation: isolate;
`

/** 연도 기준 시 타임라인+카드 단일 좌표계용 컨테이너 */
const UnifiedYearBasedContainer = styled.div`
  position: relative;
  flex-shrink: 0;
`

/** 연도 기준 시 타임라인 열: 같은 컨테이너 안에서 absolute로 top=0 공유 */
const TimelineColumnAbsolute = styled(TimelineColumn)`
  position: absolute;
  left: 0;
  top: 0;
`

/** 연도 기준 시 카드 영역: 같은 컨테이너 안에서 absolute, left로 타임라인 오른쪽에 배치 */
const TreeAreaAbsolute = styled(TreeArea)`
  position: absolute;
  top: 0;
`

const PositionSeparatorWrap = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 2;
`

const PositionSeparatorLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  margin-left: -1px;
  border-left: 1px dashed #94a3b8;
  opacity: 0.85;
`

const TreeSvg = styled.svg`
  display: block;
  overflow: visible;
  pointer-events: none;
`

/** 선 끝 뱃지 컨테이너 — SVG와 동일 좌표계 */
const ConnectorBadgesLayer = styled.div`
  position: absolute;
  box-sizing: border-box;
`

/** 연결선 끝지점에 놓는 직책 뱃지 — 선 끝에 가깝게, 작은 필 */
const ConnectorEndBadge = styled.span<{
  $bg: string
  $color: string
  $border: string
}>`
  position: absolute;
  transform: translate(-50%, -100%);
  margin-bottom: -4px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $border }) => $border};
  line-height: 1.2;
`

const TreeGrid = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  grid-template-columns: repeat(var(--tree-cols, 1), ${COL_STEP}px);
  grid-template-rows: repeat(var(--tree-rows, 1), ${ROW_HEIGHT}px);
  justify-content: start;
  justify-items: start;
  align-items: start;
  width: var(--tree-area-width, 0px);
  height: var(--tree-area-height, 0px);
  box-sizing: border-box;
`

const TreeYearBasedWrap = styled.div`
  position: relative;
  box-sizing: border-box;
`

/** 연도 기준 카드 — 넓은 카드, 얇은 테두리, 글자 넘침 방지 */
const TreeCardYearBased = styled.div`
  box-sizing: border-box;
  position: absolute;
  width: ${CARD_WIDTH}px;
  min-height: ${CARD_HEIGHT}px;
  padding: 20px 22px;
  background: #fff;
  border: 1px solid ${BORDER_SUBTLE};
  border-radius: 10px;
  box-shadow: ${SHADOW_CARD};
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  overflow: hidden;
  word-break: break-word;

  &:hover {
    box-shadow: ${SHADOW_CARD_HOVER};
    transform: translateY(-2px);
  }
`

const TreeCardWrap = styled.div`
  box-sizing: border-box;
  padding-top: ${CONNECTOR_GAP / 2}px;
  width: ${COL_STEP}px;
  min-height: ${ROW_HEIGHT}px;
`

const TreeCard = styled.div`
  box-sizing: border-box;
  width: ${CARD_WIDTH}px;
  min-height: ${CARD_HEIGHT}px;
  padding: 20px 22px;
  background: #fff;
  border: 1px solid ${BORDER_SUBTLE};
  border-radius: 10px;
  box-shadow: ${SHADOW_CARD};
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  position: relative;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  overflow: hidden;
  word-break: break-word;

  &:hover {
    box-shadow: ${SHADOW_CARD_HOVER};
    transform: translateY(-2px);
  }
`

const TreeCardHead = styled.div`
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

/** 직책별 뱃지 색 — 라벨 문자열로 일관된 색 부여 */
const BADGE_PALETTE = [
  { bg: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: 'rgba(99, 102, 241, 0.25)' },
  { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857', border: 'rgba(16, 185, 129, 0.25)' },
  { bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309', border: 'rgba(245, 158, 11, 0.25)' },
  { bg: 'rgba(236, 72, 153, 0.12)', color: '#be185d', border: 'rgba(236, 72, 153, 0.25)' },
  { bg: 'rgba(139, 92, 246, 0.12)', color: '#6d28d9', border: 'rgba(139, 92, 246, 0.25)' },
  { bg: 'rgba(14, 165, 233, 0.12)', color: '#0369a1', border: 'rgba(14, 165, 233, 0.25)' },
] as const

function getBadgeColorsForLabel(label: string): (typeof BADGE_PALETTE)[number] {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h << 5) - h + label.charCodeAt(i)
  const idx = Math.abs(h) % BADGE_PALETTE.length
  return BADGE_PALETTE[idx]
}

const TreeCardPositionBadge = styled.span<{
  $badgeBg?: string
  $badgeColor?: string
  $badgeBorder?: string
}>`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 6px;
  background: ${({ $badgeBg }) => $badgeBg ?? 'rgba(99, 102, 241, 0.08)'};
  color: ${({ $badgeColor }) => $badgeColor ?? ACCENT};
  ${({ $badgeBorder }) => ($badgeBorder != null ? `border: 1px solid ${$badgeBorder};` : '')}
`

/** 몇 대(초대/제N대) — 카드에서 가장 중요 */
const TreeCardOrder = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.04em;
  line-height: 1.25;
  margin-bottom: 8px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
`

/** 재임 기간 — 두 번째로 강조, 잘 보이게 */
const TreeCardReign = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 10px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.35;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TreeCardMainName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  letter-spacing: -0.02em;
  line-height: 1.35;
  margin-bottom: 4px;
  max-width: 100%;
  overflow-wrap: break-word;
`

const TreeCardSubName = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: #64748b;
  margin-bottom: 6px;
  line-height: 1.4;
  max-width: 100%;
  overflow-wrap: break-word;
`

const TreeCardDynasty = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #7c3aed;
  margin-bottom: 6px;
  line-height: 1.4;
  max-width: 100%;
  overflow-wrap: break-word;
`

const TreeCardRelation = styled.div`
  font-size: 12px;
  color: #475569;
  font-weight: 400;
  margin-bottom: 6px;
  padding: 6px 10px;
  background: #f8fafc;
  border-radius: 8px;
  line-height: 1.4;
`

const TreeCardRegnal = styled.div`
  font-size: 12px;
  color: #64748b;
  font-style: italic;
  margin-top: 0;
`

const TreeCardTitle = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  margin-top: 4px;
  line-height: 1.4;
`

const TreeCardAvatar = styled.div<{ $hasImage?: boolean }>`
  position: absolute;
  top: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  background: ${({ $hasImage }) => ($hasImage ? '#f1f5f9' : '#e0e7ff')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${ACCENT};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const CARD_WIDTH_PX = CARD_WIDTH
export const CARD_HEIGHT_PX = CARD_HEIGHT
export const CONNECTOR_GAP_PX = CONNECTOR_GAP
