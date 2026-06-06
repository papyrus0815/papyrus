/**
 * 세기(century) 산출 — 세기별 리더보드의 표준 변환 로직.
 *
 * 부호 컨벤션(프론트 `person-infographic/model/century.ts`와 일치):
 * - 학술 기준: 1701~1800 = 18세기, BC 100~1 = 기원전 1세기
 * - 정수 표현: AD는 양수(+18), BC는 음수(-1). 단일 Int로 정렬·라벨 역변환 모두 가능.
 *
 * `PointEntry.contentCentury`에 이 값을 스냅샷으로 저장한다. 세기를 매길 수 없는
 * 콘텐츠(현대국가, 연도 미상)는 null.
 */

import { Era } from '@prisma/client'

/**
 * 연도(부호 있는 정수: BC는 음수) → 세기 정수.
 * 예) 1750 → 18, 1801 → 19, -50 → -1, -100 → -1, -101 → -2
 */
export function centuryFromSignedYear(year: number): number {
  const c = Math.floor((Math.abs(year) - 1) / 100) + 1
  return year < 0 ? -c : c
}

/**
 * 연도 + 시대(Era) → 세기 정수. year가 없거나 0이면 null(세기 미상).
 * Era 미지정은 AD로 간주(레거시 데이터 방어).
 */
export function centuryFromYearEra(
  year: number | null | undefined,
  era: Era | null | undefined,
): number | null {
  if (year == null || !Number.isFinite(year) || year === 0) return null
  const signed = era === Era.BC ? -Math.abs(year) : Math.abs(year)
  return centuryFromSignedYear(signed)
}

/**
 * Date + Era → 세기 정수. UTC 연도를 기준으로 산출(저장 컨벤션과 일치).
 * date가 없으면 null.
 */
export function centuryFromDateEra(
  date: Date | null | undefined,
  era: Era | null | undefined,
): number | null {
  if (!date) return null
  const year = date.getUTCFullYear()
  return centuryFromYearEra(year, era)
}

/** 세기 정수 → 사람이 읽는 라벨. 예) 18 → "18세기", -1 → "기원전 1세기" */
export function centuryLabel(century: number): string {
  return century < 0 ? `기원전 ${-century}세기` : `${century}세기`
}
