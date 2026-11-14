import type { HistoricalMembershipRole } from '@prisma/client'

import {
  structuredDateEndKey,
  structuredDateKey,
} from '../person/domain/structured-date.util'

/**
 * 복합 역사국가(동군·물적 연합, 연방, 제국 내 자치 왕관령)의 구성국 롤업 대상 역할.
 *
 * - UNION: 오스트리아-헝가리 제국 ← 헝가리 왕국·보헤미아 왕국, 스웨덴-노르웨이 연합 등
 * - CONFEDERATION_MEMBER: 독일 제국 ← 프로이센·바이에른 왕국, 소련 ← 구성 공화국, 신성로마제국 등
 * - DOMINION: 오스트리아-헝가리 제국 ← 갈리치아-로도메리아 왕국, 러시아 제국 ← 핀란드 대공국 등
 *
 * 외교 동맹(ALLY), 조공·속국(VASSAL_STATE), 해외 식민지(COLONY), 괴뢰·보호령(PROTECTORATE)은
 * 본국 중앙 내각·관직 체계의 구성국이 아니므로 롤업에서 제외한다.
 */
export const CONSTITUENT_MEMBERSHIP_ROLES: readonly HistoricalMembershipRole[] = [
  'UNION',
  'CONFEDERATION_MEMBER',
  'DOMINION',
]

export interface ConstituentPolityWindow {
  memberCountryId: string
  memberCountryName: string
  memberCountryEnName: string | null
  role: HistoricalMembershipRole
  isLeadingMember: boolean
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: string | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  /** 상위 국가와 구성국이 동시 존속·소속된 유효 하한 키 (부호 YYYYMMDD) */
  windowStartKey: number | null
  /** 상위 국가와 구성국이 동시 존속·소속된 유효 상한 키 (부호 YYYYMMDD) */
  windowEndKey: number | null
  /** 구성국 자체의 존속 상한 키 (폐지일 미기재 기관 등의 상한 보정용) */
  memberEndKey: number | null
}

/** 쿼리스트링/불리언 플래그 파싱 (`'true' | '1' | true` → `true`) */
export function parseIncludeConstituentsFlag(
  raw: string | boolean | null | undefined,
): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    return normalized === 'true' || normalized === '1'
  }
  return false
}

function dateColumnToKey(
  dateVal: Date | string | null | undefined,
  isEnd: boolean,
): number | null {
  if (!dateVal) return null
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim()
    const neg = trimmed.startsWith('-')
    const match = (neg ? trimmed.slice(1) : trimmed).match(
      /^(\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/,
    )
    if (match) {
      const year = parseInt(match[1], 10)
      const month = match[2] ? parseInt(match[2], 10) : null
      const day = match[3] ? parseInt(match[3], 10) : null
      return isEnd
        ? structuredDateEndKey(neg ? 'BC' : 'AD', year, month, day)
        : structuredDateKey(neg ? 'BC' : 'AD', year, month, day)
    }
  }
  const parsed = dateVal instanceof Date ? dateVal : new Date(dateVal)
  if (Number.isNaN(parsed.getTime())) return null
  const year = parsed.getUTCFullYear()
  const month = parsed.getUTCMonth() + 1
  const day = parsed.getUTCDate()
  return year * 10000 + month * 100 + day
}

function maxKey(...keys: Array<number | null | undefined>): number | null {
  let current: number | null = null
  for (const key of keys) {
    if (key == null) continue
    if (current == null || key > current) current = key
  }
  return current
}

function minKey(...keys: Array<number | null | undefined>): number | null {
  let current: number | null = null
  for (const key of keys) {
    if (key == null) continue
    if (current == null || key < current) current = key
  }
  return current
}

function signedYearOf(
  era: string | null | undefined,
  year: number | null | undefined,
): number | null {
  if (year == null) return null
  return era === 'BC' ? -year : year
}

/**
 * 레코드(내각·재임·부처)의 구조화 연월일 + 파생 키 + 레거시 DateTime에서 `[startKey, endKey]` 도출
 */
export function extractRecordPeriodKeys(record: {
  startKey?: number | null
  endKey?: number | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  startDate?: Date | string | null
  endDate?: Date | string | null
}): { startKey: number | null; endKey: number | null } {
  const startKey =
    record.startKey ??
    structuredDateKey(
      record.startEra,
      record.startYear,
      record.startMonth,
      record.startDay,
    ) ??
    dateColumnToKey(record.startDate, false)

  const endKey =
    record.endKey ??
    structuredDateEndKey(
      record.endEra ?? record.startEra,
      record.endYear,
      record.endMonth,
      record.endDay,
    ) ??
    dateColumnToKey(record.endDate, true)

  return { startKey, endKey }
}

/**
 * 구성국 소속 레코드의 기간이 상위 복합국가와의 동시 소속 구간(`windows`)과 겹치는지 판정한다.
 *
 * - 날짜가 전혀 없는 초안/무기한 항목(`startKey == null && endKey == null`)은 숨기지 않고 포함한다.
 * - `endKey`가 비어 있는 경우:
 *   · 기관(`institution`): 폐지 전까지 존속하므로 구성국 소멸 시점(`memberEndKey`)까지 유효.
 *   · 인물 재임·내각(`person_or_cabinet`): 과거 시대 인물에 종료일만 누락된 경우(예: 1458년 즉위, 종료 미기재)가
 *     수백 년 뒤 제국(1867~1918)으로 새어 나오지 않도록 `startKey + 25년`과 구성국 종료 시점 중 빠른 값을 상한으로 삼는다.
 */
export function doesIntervalOverlapConstituentWindows(
  startKey: number | null,
  endKey: number | null,
  windows: readonly ConstituentPolityWindow[],
  kind: 'person_or_cabinet' | 'institution',
): boolean {
  if (windows.length === 0) return false
  if (startKey == null && endKey == null) return true

  return windows.some((win) => {
    if (win.windowStartKey == null && win.windowEndKey == null) return true

    const effectiveStart = startKey ?? endKey!
    let effectiveEnd: number
    if (endKey != null) {
      effectiveEnd = endKey
    } else if (kind === 'institution') {
      effectiveEnd = win.memberEndKey ?? Number.MAX_SAFE_INTEGER
    } else {
      const cappedSpanEnd = effectiveStart + 250000
      effectiveEnd =
        win.memberEndKey != null
          ? Math.min(win.memberEndKey, cappedSpanEnd)
          : cappedSpanEnd
    }

    if (win.windowStartKey != null && effectiveEnd < win.windowStartKey) {
      return false
    }
    if (win.windowEndKey != null && effectiveStart > win.windowEndKey) {
      return false
    }
    return true
  })
}

/**
 * 상위 역사국가(`parentHistoricalCountryId`)에 속한 동시대 구성국 목록과 유효 기간 창을 계산한다.
 *
 * 제외 규칙:
 * - 합방으로 소멸하며 상위 국가로 전환(`HistoricalCountryTransition: member -> parent`)된 전신 국가
 *   (예: 잉글랜드 왕국(~1707) → 그레이트브리튼 왕국(1707~))가 연도 경계(1707)만 맞닿은 경우는
 *   동시 존속 구성국이 아니므로 제외한다.
 */
export async function resolveConstituentPolityWindows(
  prisma: {
    historicalCountry: { findUnique: (args: any) => Promise<any> }
    historicalCountryTransition: { findMany: (args: any) => Promise<any[]> }
  },
  parentHistoricalCountryId: string,
): Promise<ConstituentPolityWindow[]> {
  const parent = await prisma.historicalCountry.findUnique({
    where: { id: parentHistoricalCountryId },
    select: {
      id: true,
      name: true,
      startEra: true,
      startYear: true,
      startMonth: true,
      startDay: true,
      endEra: true,
      endYear: true,
      endMonth: true,
      endDay: true,
      membershipsParent: {
        where: {
          role: { in: [...CONSTITUENT_MEMBERSHIP_ROLES] },
        },
        select: {
          memberCountryId: true,
          role: true,
          isLeadingMember: true,
          membershipStartDate: true,
          membershipEndDate: true,
          startEra: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endEra: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          memberCountry: {
            select: {
              id: true,
              name: true,
              enName: true,
              startEra: true,
              startYear: true,
              startMonth: true,
              startDay: true,
              endEra: true,
              endYear: true,
              endMonth: true,
              endDay: true,
            },
          },
        },
      },
    },
  })

  if (!parent || !Array.isArray(parent.membershipsParent) || parent.membershipsParent.length === 0) {
    return []
  }

  const candidateMemberIds = Array.from(
    new Set(
      parent.membershipsParent
        .map((membership: any) => membership.memberCountryId as string)
        .filter((memberId: string) => Boolean(memberId) && memberId !== parentHistoricalCountryId),
    ),
  )
  if (candidateMemberIds.length === 0) return []

  const predecessorTransitions = await prisma.historicalCountryTransition.findMany({
    where: {
      successorId: parentHistoricalCountryId,
      predecessorId: { in: candidateMemberIds },
    },
    select: { predecessorId: true },
  })
  const mergedPredecessorIds = new Set(
    predecessorTransitions.map((row: any) => row.predecessorId as string),
  )

  const parentStartKey = structuredDateKey(
    parent.startEra,
    parent.startYear,
    parent.startMonth,
    parent.startDay,
  )
  const parentEndKey = structuredDateEndKey(
    parent.endEra ?? parent.startEra,
    parent.endYear,
    parent.endMonth,
    parent.endDay,
  )
  const parentStartSignedYear = signedYearOf(parent.startEra, parent.startYear)

  const results: ConstituentPolityWindow[] = []

  for (const membership of parent.membershipsParent) {
    const member = membership.memberCountry
    if (!member || member.id === parentHistoricalCountryId) continue

    const hasExplicitMembershipPeriod =
      membership.startYear != null ||
      membership.endYear != null ||
      membership.membershipStartDate != null ||
      membership.membershipEndDate != null

    const memberEndSignedYear = signedYearOf(
      member.endEra ?? member.startEra,
      member.endYear,
    )

    // 합방 소멸 전신 국가 배제 (예: 잉글랜드 ~1707 → 그레이트브리튼 1707~)
    if (
      mergedPredecessorIds.has(member.id) &&
      !hasExplicitMembershipPeriod &&
      parentStartSignedYear != null &&
      memberEndSignedYear != null &&
      memberEndSignedYear <= parentStartSignedYear
    ) {
      continue
    }

    const memberStartKey = structuredDateKey(
      member.startEra,
      member.startYear,
      member.startMonth,
      member.startDay,
    )
    const memberEndKey = structuredDateEndKey(
      member.endEra ?? member.startEra,
      member.endYear,
      member.endMonth,
      member.endDay,
    )

    const relStartKey =
      structuredDateKey(
        membership.startEra,
        membership.startYear,
        membership.startMonth,
        membership.startDay,
      ) ?? dateColumnToKey(membership.membershipStartDate, false)

    const relEndKey =
      structuredDateEndKey(
        membership.endEra ?? membership.startEra,
        membership.endYear,
        membership.endMonth,
        membership.endDay,
      ) ?? dateColumnToKey(membership.membershipEndDate, true)

    const windowStartKey = maxKey(parentStartKey, memberStartKey, relStartKey)
    const windowEndKey = minKey(parentEndKey, memberEndKey, relEndKey)

    if (
      windowStartKey != null &&
      windowEndKey != null &&
      windowStartKey > windowEndKey
    ) {
      continue
    }

    results.push({
      memberCountryId: member.id,
      memberCountryName: member.name,
      memberCountryEnName: member.enName ?? null,
      role: membership.role,
      isLeadingMember: Boolean(membership.isLeadingMember),
      startEra: (member.startEra as string | null) ?? null,
      startYear: member.startYear ?? null,
      startMonth: member.startMonth ?? null,
      startDay: member.startDay ?? null,
      endEra: (member.endEra as string | null) ?? null,
      endYear: member.endYear ?? null,
      endMonth: member.endMonth ?? null,
      endDay: member.endDay ?? null,
      windowStartKey,
      windowEndKey,
      memberEndKey,
    })
  }

  const rolePriority: Record<string, number> = {
    UNION: 0,
    CONFEDERATION_MEMBER: 1,
    DOMINION: 2,
  }
  results.sort((left, right) => {
    if (left.isLeadingMember !== right.isLeadingMember) {
      return left.isLeadingMember ? -1 : 1
    }
    const leftRoleOrder = rolePriority[left.role] ?? 9
    const rightRoleOrder = rolePriority[right.role] ?? 9
    if (leftRoleOrder !== rightRoleOrder) return leftRoleOrder - rightRoleOrder
    return left.memberCountryName.localeCompare(right.memberCountryName, 'ko')
  })

  return results
}

export function groupConstituentWindowsByMemberId(
  windows: readonly ConstituentPolityWindow[],
): Map<string, ConstituentPolityWindow[]> {
  const map = new Map<string, ConstituentPolityWindow[]>()
  for (const win of windows) {
    const bucket = map.get(win.memberCountryId)
    if (bucket) {
      bucket.push(win)
    } else {
      map.set(win.memberCountryId, [win])
    }
  }
  return map
}

/**
 * 특정 부호 연도(`activeAtYear`, 예: `1914`, 기원전은 `-202`)에 레코드(내각·부처)가
 * 재임/존속 중이었는지 판정한다.
 *
 * - 시작일·종료일이 모두 비어 있는 연대 미상 레코드는 특정 연도 필터에서 제외한다.
 * - 종료일이 비어 있는 레코드(`endKey == null`):
 *   · `kind === 'person_or_cabinet'`: 역사적 국가 소속이면 해당 역사국가 종료일(또는 `startKey + 25년`)까지만 유효,
 *     현대 국가 소속 현직 내각이면 현재 연도까지 유효.
 *   · `kind === 'institution'`: 역사적 국가 종료일이 있으면 그 시점까지, 없으면 현재까지 유효.
 */
export function doesRecordOverlapSignedYear(params: {
  startKey: number | null
  endKey: number | null
  activeAtYear: number
  kind: 'person_or_cabinet' | 'institution'
  polityEndKey?: number | null
  isHistoricalPolity?: boolean
}): boolean {
  const {
    startKey,
    endKey,
    activeAtYear,
    kind,
    polityEndKey = null,
    isHistoricalPolity = false,
  } = params
  if (!Number.isFinite(activeAtYear)) return true
  if (startKey == null && endKey == null) return false

  const era = activeAtYear < 0 ? 'BC' : 'AD'
  const magnitudeYear = Math.abs(Math.trunc(activeAtYear))
  const yearStartKey = structuredDateKey(era, magnitudeYear, 1, 1)
  const yearEndKey = structuredDateEndKey(era, magnitudeYear, 12, 31)
  if (yearStartKey == null || yearEndKey == null) return true

  if (startKey != null && startKey > yearEndKey) {
    return false
  }

  let effectiveEndKey = endKey
  if (effectiveEndKey == null) {
    if (kind === 'person_or_cabinet' && isHistoricalPolity) {
      const fallbackCap = startKey != null ? startKey + 250000 : null
      effectiveEndKey = minKey(polityEndKey, fallbackCap)
    } else if (isHistoricalPolity && polityEndKey != null) {
      effectiveEndKey = polityEndKey
    } else {
      const currentYear = new Date().getUTCFullYear()
      effectiveEndKey = currentYear * 10000 + 1231
    }
  }

  if (effectiveEndKey != null && effectiveEndKey < yearStartKey) {
    return false
  }
  return true
}

