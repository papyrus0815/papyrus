/**
 * 이벤트 유틸리티 함수들
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import type { HeadOfStateDuringEvent } from '@/shared/api/government-positions'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../create/events.types'

/**
 * 세기 계산
 */
export function getCenturyFromDate(dateString?: string): number | null {
  if (!dateString) return null

  const parts = parseIsoDateParts(dateString)
  if (!parts) return null
  return Math.ceil(parts.year / 100)
}

/**
 * 세기 레이블 포맷
 */
export function formatCenturyLabel(century: number): string {
  return `${century}세기`
}

/**
 * 세기 범위 포맷
 */
export function formatCenturyRange(century: number): string {
  const startYear = (century - 1) * 100 + 1
  const endYear = century * 100
  return `${startYear}~${endYear}`
}

/** 날짜 정밀도: year(년만), month(년·월), day(년·월·일) */
export type DatePrecision = 'year' | 'month' | 'day'

/**
 * 단일 날짜를 정밀도에 맞게 포맷 (년만 알 때, 년·월만 알 때 등)
 */
export function formatDateWithPrecision(
  dateStr: string,
  precision?: string | null,
): string {
  const parts = parseIsoDateParts(dateStr)
  if (!parts) return dateStr
  const { year: y, month: m, day: d } = parts
  const prec = precision === 'year' || precision === 'month' ? precision : 'day'
  if (prec === 'year') return `${y}년`
  if (prec === 'month') return `${y}년 ${m}월`
  return `${y}년 ${m}월 ${d}일`
}

/**
 * 날짜 범위 포맷 (정밀도 지원: 년만/년·월/년·월·일)
 */
export function formatDateRange(
  start: string,
  end?: string,
  startPrecision?: string | null,
  endPrecision?: string | null,
): string {
  const startStr = formatDateWithPrecision(start, startPrecision)
  if (!end) return startStr
  const endStr = formatDateWithPrecision(end, endPrecision)
  return `${startStr} ~ ${endStr}`
}

/**
 * 타임라인용 날짜 포맷
 */
export function formatTimelineDate(dateString: string): string {
  const parts = parseIsoDateParts(dateString)
  if (!parts) return dateString
  return `${parts.year}.${String(parts.month).padStart(2, '0')}.${String(parts.day).padStart(2, '0')}`
}

/**
 * 숫자를 간결하게 포맷 (1,234,567 → 1.2M)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * 계층 구조의 최대 깊이 계산
 */
export function hierarchyDepth(node: EventHierarchyNode): number {
  if (!node.children || node.children.length === 0) {
    return 0
  }

  return 1 + Math.max(...node.children.map((child) => hierarchyDepth(child)))
}

/**
 * ID로 이벤트 찾기 (재귀적으로 계층 구조 탐색)
 */
export function findEventById(
  events: HistoricalEvent[],
  id: string,
): HistoricalEvent | null {
  for (const event of events) {
    if (event.id === id) return event

    const findInHierarchy = (
      node: EventHierarchyNode,
    ): EventHierarchyNode | null => {
      if (node.id === id) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findInHierarchy(child)
          if (found) return found
        }
      }
      return null
    }

    const found = findInHierarchy(event.hierarchy)
    if (found) return event
  }

  return null
}

/**
 * 우선순위 기반으로 가장 중요한 국가 원수 1명 선택
 */
export function getPrimaryHeadOfState(
  headsOfState: HeadOfStateDuringEvent[],
  event: HistoricalEvent,
): HeadOfStateDuringEvent {
  if (headsOfState.length === 0) {
    throw new Error('headsOfState array is empty')
  }

  if (headsOfState.length === 1) {
    return headsOfState[0]
  }

  // 1순위: 사건 참여 국가의 원수
  const participatingCountryHead = headsOfState.find((head) =>
    event.countries.some((c) => c.id === head.country.id),
  )
  if (participatingCountryHead) return participatingCountryHead

  // 2순위: 주요 강대국 순서
  const majorPowers = [
    '미국',
    '영국',
    '프랑스',
    '독일',
    '소련',
    '러시아',
    '중국',
    '일본',
    '이탈리아',
    '스페인',
  ]

  for (const power of majorPowers) {
    const head = headsOfState.find((h) => h.country.name === power)
    if (head) return head
  }

  // 3순위: 집권 시작이 가장 빠른 원수
  return [...headsOfState].sort(
    (a, b) =>
      new Date(a.tenure.startDate).getTime() -
      new Date(b.tenure.startDate).getTime(),
  )[0]
}
