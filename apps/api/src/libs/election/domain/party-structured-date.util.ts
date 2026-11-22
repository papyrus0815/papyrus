/**
 * 정당 도메인의 구조화 날짜 입력 → 저장 칸.
 *
 * 정당 본체(창당·해산)와 곁가지 표(이름 이력·법적 지위…)가 모두 같은 규약을 쓴다
 * (설계 docs/political-party-model-review.md — "정당의 모든 기간은 구조화 날짜").
 *
 * - 입력: `{ era: 'BC' | 'AD', year, month?, day? }` — year는 크기값(양수), 월 없는 일은 버린다(정밀도 사다리).
 * - 저장: `${prefix}Era/Year/Month/Day/Precision`. precision은 서버가 파생(year|month|day)한다.
 * - 정당 본체만 DATETIME 거울(foundedDate·dissolvedDate)을 함께 채운다 — AD 1000~9999에서만(드라이버 손상 방지).
 */
import { BadRequestException } from '@nestjs/common'

import {
  mapStructuredDateInput,
  structuredDateEndKey,
  structuredDateKey,
  toSignedDateString,
} from '../../person/domain/structured-date.util'

export interface StructuredDateInput {
  era: 'BC' | 'AD'
  year: number
  month?: number | null
  day?: number | null
}

export interface StructuredDateColumns {
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  day: number | null
  precision: string | null
}

const EMPTY: StructuredDateColumns = { era: null, year: null, month: null, day: null, precision: null }

/** 입력 검증 + 정규화. null이면 빈 칸(지우기). 형식이 틀리면 400 */
export function parseStructuredDateInput(
  raw: StructuredDateInput | null | undefined,
  fieldLabel: string,
): StructuredDateColumns {
  if (raw == null) return { ...EMPTY }
  if (typeof raw !== 'object') {
    throw new BadRequestException(`${fieldLabel}: { era, year, month?, day? } 형식이어야 합니다.`)
  }
  const { era, year } = raw
  const month = raw.month ?? undefined
  const day = raw.day ?? undefined
  if (era !== 'BC' && era !== 'AD') {
    throw new BadRequestException(`${fieldLabel}: 기원은 BC 또는 AD입니다.`)
  }
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new BadRequestException(`${fieldLabel}: 연도는 1~9999의 정수(기원전은 era=BC)입니다.`)
  }
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw new BadRequestException(`${fieldLabel}: 월은 1~12입니다.`)
  }
  if (day !== undefined) {
    if (month === undefined) {
      throw new BadRequestException(`${fieldLabel}: 일을 넣으려면 월이 필요합니다.`)
    }
    /* 윤년 판정은 천문 연도 기준(BC 1년 = 0년) — 그레고리력 소급 */
    const astronomicalYear = era === 'BC' ? 1 - year : year
    const isLeap =
      (astronomicalYear % 4 === 0 && astronomicalYear % 100 !== 0) || astronomicalYear % 400 === 0
    const monthLengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (!Number.isInteger(day) || day < 1 || day > monthLengths[month - 1]) {
      throw new BadRequestException(`${fieldLabel}: 없는 날짜입니다.`)
    }
  }
  const mapped = mapStructuredDateInput({ era, year, month, day }, null)
  return {
    era: mapped.era,
    year: mapped.year,
    month: mapped.month,
    day: mapped.day,
    precision: mapped.precision,
  }
}

/** 칸 묶음 → Prisma data(접두사 붙인 키) */
export function structuredDateData(
  prefix: string,
  columns: StructuredDateColumns,
): Record<string, string | number | null> {
  return {
    [`${prefix}Era`]: columns.era,
    [`${prefix}Year`]: columns.year,
    [`${prefix}Month`]: columns.month,
    [`${prefix}Day`]: columns.day,
    [`${prefix}Precision`]: columns.precision,
  }
}

/** 행에서 접두사 칸 묶음 읽기 */
export function readStructuredDate(
  row: Record<string, unknown>,
  prefix: string,
): StructuredDateColumns {
  return {
    era: (row[`${prefix}Era`] as 'BC' | 'AD' | null | undefined) ?? null,
    year: (row[`${prefix}Year`] as number | null | undefined) ?? null,
    month: (row[`${prefix}Month`] as number | null | undefined) ?? null,
    day: (row[`${prefix}Day`] as number | null | undefined) ?? null,
    precision: (row[`${prefix}Precision`] as string | null | undefined) ?? null,
  }
}

/** DATETIME 거울 — AD 1000~9999만. 그 밖은 null(구조화 칸이 유일 진실) */
export function structuredDateMirror(columns: StructuredDateColumns): Date | null {
  if (columns.era == null || columns.year == null) return null
  return mapStructuredDateInput(
    {
      era: columns.era,
      year: columns.year,
      month: columns.month ?? undefined,
      day: columns.day ?? undefined,
    },
    null,
  ).date
}

/** 레거시 ISO 입력(구 클라이언트의 foundedDate) → 칸 묶음 */
export function structuredDateFromLegacyIso(
  iso: string | null | undefined,
  fieldLabel: string,
): StructuredDateColumns {
  if (iso == null || iso === '') return { ...EMPTY }
  const mapped = mapStructuredDateInput(null, iso)
  if (mapped.year == null) {
    throw new BadRequestException(`${fieldLabel} 날짜 형식이 올바르지 않습니다.`)
  }
  return {
    era: mapped.era,
    year: mapped.year,
    month: mapped.month,
    day: mapped.day,
    precision: mapped.precision,
  }
}

/**
 * 시작–끝 역전 검사. 끝은 미상 월·일을 그 해·달의 끝으로 잡아(상한 키),
 * '1920-03-15 시작 · 1920년 끝'을 역전으로 오판하지 않는다.
 */
export function assertStructuredRangeOrder(
  start: StructuredDateColumns,
  end: StructuredDateColumns,
  message: string,
): void {
  const startKey = structuredDateKey(start.era, start.year, start.month, start.day)
  const endKey = structuredDateEndKey(end.era, end.year, end.month, end.day)
  if (startKey != null && endKey != null && endKey < startKey) {
    throw new BadRequestException(message)
  }
}

/** 응답용 부호 날짜 문자열 — 정밀도와 함께 웹이 그대로 쓴다('-0133-01-01' + 'year') */
export function structuredDateSigned(columns: StructuredDateColumns): string | null {
  return toSignedDateString(columns.era, columns.year, columns.month, columns.day)
}
