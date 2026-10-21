/**
 * 직위 보유 단일 모델 이행 2단계 — 재위(SovereignReign) 행이 재임 테이블로 옮겨진 뒤의 조회 규칙.
 *
 * 재위·재임은 이제 한 테이블(government_position_tenure)이다. 둘을 가르는 것은 **직위 정의의
 * 군주직 여부(isMonarchical) 하나**다(설계 문서 '분류 규칙'). 이 파일이 그 판정의 유일한 출처다.
 *
 * - `MONARCHICAL_TENURE` — 예전 재위 API·읽기 모델이 보던 행(군주직).
 * - `NON_MONARCHICAL_TENURE` — 예전 재임 API·읽기 모델이 보던 행. 기존 재임 조회에 이 조건을
 *   더해야 옮겨온 재위가 재임 목록에 한 번 더 나오지 않는다.
 * - `asOfficeHolding` — 응답 행 모양. 재위·재임이 같은 칸 이름을 쓰고 `isMonarchical`로만 갈린다.
 *
 * 모든 재임은 직위 정의를 갖는다(필수, 맞는 카탈로그가 없으면 유형의 일반 정의) — 판정은 정의 하나로 닫힌다.
 */
import type { Prisma } from '@prisma/client'

export const MONARCHICAL_TENURE = {
  positionDefinition: { is: { isMonarchical: true } },
} satisfies Prisma.GovernmentPositionTenureWhereInput

export const NON_MONARCHICAL_TENURE = {
  positionDefinition: { is: { isMonarchical: false } },
} satisfies Prisma.GovernmentPositionTenureWhereInput

/** where에 군주직 조건을 덧붙인다 (재위 = 군주직 재임 행) */
export function reignWhere(
  where: Prisma.GovernmentPositionTenureWhereInput = {},
): Prisma.GovernmentPositionTenureWhereInput {
  return { AND: [where, MONARCHICAL_TENURE] }
}

/** where에 비군주직 조건을 덧붙인다 */
export function tenureWhere(
  where: Prisma.GovernmentPositionTenureWhereInput = {},
): Prisma.GovernmentPositionTenureWhereInput {
  return { AND: [where, NON_MONARCHICAL_TENURE] }
}

type Precision = 'year' | 'month' | 'day'

/** 정밀도는 채워진 칸에서 파생 — 월이 없으면 연, 일이 없으면 월 */
export function precisionOf(
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): Precision | null {
  if (year == null) return null
  if (month == null) return 'year'
  if (day == null) return 'month'
  return 'day'
}

/**
 * 직위 보유 행 응답 — 재위·재임 모두 같은 모양으로 내보낸다(직위 보유 단일 모델).
 *
 * - `isMonarchical`: 이 행이 재위(군주직)인가. 직위 정의의 isMonarchical이 진실이고, 군주직 조건으로
 *   골라 읽은 행처럼 호출부가 이미 아는 경우는 인자로 준다(select에 정의가 없어도 된다).
 * - `ordinal`: 대수(국가·정체 기준 통산 제N대) — 재위·재임 공통. `regnalNumber`는 '이름 속 서수'
 *   (루이 14세의 14)라 대수가 아니다.
 * - `endDatePrecision`: 재임엔 종료 정밀도 칸이 없어 구조화 종료 칸에서 파생한다. 시작 정밀도는 저장값.
 *   정밀도 규약은 옛 재위와 같다 — NULL = 일 단위.
 */
export function asOfficeHolding<T extends Record<string, any>>(
  row: T,
  isMonarchical?: boolean,
): T & { isMonarchical: boolean; endDatePrecision: Precision | null } {
  const derived = precisionOf(row.endYear, row.endMonth, row.endDay)
  return {
    ...row,
    isMonarchical: isMonarchical ?? row.positionDefinition?.isMonarchical === true,
    endDatePrecision: row.endYear !== undefined ? (derived === 'day' ? null : derived) : null,
  }
}

/**
 * 인물 include로 한꺼번에 읽은 GovernmentTenures를 화면 구획 둘로 묶는다 — 군주 재위 카드와 관직 재임 목록.
 * - `GovernmentTenures` ← 비군주직
 * - `sovereignReigns`   ← 군주직, 시작일 내림차순 그대로
 * 행 모양은 두 쪽 모두 asOfficeHolding(같은 재임 행 + isMonarchical).
 *
 * 이미 `sovereignReigns`가 붙어 있으면(상세 조회가 따로 읽어 붙인 경우) 손대지 않는다.
 * 군주직 판정에 `positionDefinition.isMonarchical`이 필요하다 — select에 넣어야 한다.
 */
export function splitOfficeHoldings<T extends Record<string, any>>(person: T): T {
  const all: any[] | undefined = person?.GovernmentTenures
  if (!Array.isArray(all) || person.sovereignReigns !== undefined) return person
  const rows = all.map((row) => asOfficeHolding(row))
  return {
    ...person,
    GovernmentTenures: rows.filter((row) => !row.isMonarchical),
    sovereignReigns: rows.filter((row) => row.isMonarchical),
  }
}
