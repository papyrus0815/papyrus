import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

/**
 * 측정값의 수치 부분 — 점 추정·범위·'약'·'이상'.
 *
 * 역사 수치의 실제 모양(실측 casualties_data 10행):
 *   '약 44,700명'                         → value 44700, approx
 *   '전사 약 18,000~20,000명'              → low 18000, high 20000, approx
 *   '서방 추정 1,000명 이상'               → low 1000, atLeast
 *   '추정 22,000~30,000명 … 편차 큼'        → low/high + qualifier
 * 어느 하나도 숫자 한 칸에 들어가지 않는다. 그래서 칸을 나누고, 조합 규칙을 여기 한 곳에 둔다.
 *
 * 숫자는 **문자열로 주고받는다** — 금액(45조 달러)·소수(금리)를 JS number로 왕복시키면
 * 자릿수가 깨진다. DECIMAL(30,6)의 한도에 맞춰 정수부 24자리·소수부 6자리까지.
 */
export interface ObservationValueInput {
  value?: string | null
  low?: string | null
  high?: string | null
  approx?: boolean
  atLeast?: boolean
}

export interface ObservationValue {
  value: Prisma.Decimal | null
  low: Prisma.Decimal | null
  high: Prisma.Decimal | null
  approx: boolean
  atLeast: boolean
}

const DECIMAL_PATTERN = /^-?\d{1,24}(\.\d{1,6})?$/

function parseDecimal(raw: string | null | undefined, label: string): Prisma.Decimal | null {
  if (raw == null || raw === '') return null
  const trimmed = raw.trim().replace(/,/g, '')
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new BadRequestException(`${label}: 숫자 형식이 아닙니다 (${raw})`)
  }
  return new Prisma.Decimal(trimmed)
}

export function normalizeObservationValue(input: ObservationValueInput): ObservationValue {
  const value = parseDecimal(input.value, 'value')
  const low = parseDecimal(input.low, 'low')
  const high = parseDecimal(input.high, 'high')
  const approx = input.approx ?? false
  const atLeast = input.atLeast ?? false

  if (value == null && low == null && high == null) {
    throw new BadRequestException('값(value) 또는 범위(low·high) 중 하나는 있어야 합니다')
  }
  if (low != null && high != null && low.greaterThan(high)) {
    throw new BadRequestException('범위 하한(low)이 상한(high)보다 큽니다')
  }
  if (value != null && low != null && value.lessThan(low)) {
    throw new BadRequestException('점 추정(value)이 범위 하한(low)보다 작습니다')
  }
  if (value != null && high != null && value.greaterThan(high)) {
    throw new BadRequestException('점 추정(value)이 범위 상한(high)보다 큽니다')
  }
  if (atLeast && high != null) {
    throw new BadRequestException("'이상'(atLeast)은 상한(high)과 함께 쓸 수 없습니다")
  }
  return { value, low, high, approx, atLeast }
}

/** 응답 직렬화 — Decimal은 문자열, 끝자리 0은 걷는다('44700.000000' → '44700') */
export function decimalToString(decimal: Prisma.Decimal | null): string | null {
  if (decimal == null) return null
  return decimal.toFixed()
}
