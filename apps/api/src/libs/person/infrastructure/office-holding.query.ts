/**
 * 직위 보유 단일 모델 이행 2단계 — 재위(SovereignReign) 행이 재임 테이블로 옮겨진 뒤의 조회 규칙.
 *
 * 재위·재임은 이제 한 테이블(government_position_tenure)이다. 둘을 가르는 것은 **직위 정의의
 * 군주직 여부(isMonarchical) 하나**다(설계 문서 '분류 규칙'). 이 파일이 그 판정의 유일한 출처다.
 *
 * - `MONARCHICAL_TENURE` — 예전 재위 API·읽기 모델이 보던 행(군주직).
 * - `NON_MONARCHICAL_TENURE` — 예전 재임 API·읽기 모델이 보던 행. 기존 재임 조회에 이 조건을
 *   더해야 옮겨온 재위가 재임 목록에 한 번 더 나오지 않는다.
 * - `asReignRecord` — 재임 행을 예전 재위 응답 모양(regnalNumber·precision 등)으로 되돌린다.
 *   웹은 3단계 전까지 재위 응답 모양을 그대로 받는다.
 *
 * ⚠️ 관계 필터는 `is`로 쓴다. 직위 정의가 없는 재임(positionDefinitionId NULL)은 군주직이 아니다 —
 * `positionDefinition: { isMonarchical: false }`만 쓰면 NULL 행이 빠진다(Prisma 관계 필터 함정).
 */
import type { Prisma } from '@prisma/client'

export const MONARCHICAL_TENURE = {
  positionDefinition: { is: { isMonarchical: true } },
} satisfies Prisma.GovernmentPositionTenureWhereInput

export const NON_MONARCHICAL_TENURE = {
  OR: [
    { positionDefinitionId: null },
    { positionDefinition: { is: { isMonarchical: false } } },
  ],
} satisfies Prisma.GovernmentPositionTenureWhereInput

/** 기존 재위 where에 군주직 조건을 덧붙인다 (regnalNumber는 ordinal로 옮겨졌다) */
export function reignWhere(
  where: Prisma.GovernmentPositionTenureWhereInput = {},
): Prisma.GovernmentPositionTenureWhereInput {
  return { AND: [where, MONARCHICAL_TENURE] }
}

/** 기존 재임 where에 비군주직 조건을 덧붙인다 */
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
 * 재임 테이블 행 → 예전 재위 레코드 모양.
 *
 * 재위만 갖던 이름: regnalNumber(= ordinal, 재위에서는 대수), startDatePrecision·endDatePrecision
 * (구조화 칸에서 파생). 재위에는 없던 재임 칸(positionType·title·cabinet…)은 그대로 실려도 무해하다.
 */
export function asReignRecord<T extends Record<string, any>>(row: T): T & {
  regnalNumber: number | null
  termNumber: null
  startDatePrecision: Precision | null
  endDatePrecision: Precision | null
} {
  // 재위의 옛 규약: 정밀도 NULL = 일 단위. 응답이 이행 전과 같도록 'day'는 null로 돌려준다.
  const legacy = (precision: Precision | null) => (precision === 'day' ? null : precision)
  return {
    ...row,
    regnalNumber: row.ordinal ?? null,
    termNumber: null,
    // 시작 정밀도는 재임에도 칸이 있어 이전 때 그대로 옮겼다 — 저장값 우선
    startDatePrecision:
      row.startDatePrecision !== undefined
        ? (row.startDatePrecision ?? null)
        : legacy(precisionOf(row.startYear, row.startMonth, row.startDay)),
    // 종료 정밀도 칸은 재임에 없다 — 구조화 칸에서 파생
    endDatePrecision:
      row.endYear !== undefined ? legacy(precisionOf(row.endYear, row.endMonth, row.endDay)) : null,
  }
}

/**
 * 인물 include로 한꺼번에 읽은 GovernmentTenures를 예전 두 목록으로 가른다.
 * - `GovernmentTenures` ← 비군주직(예전 재임)
 * - `sovereignReigns`   ← 군주직(예전 재위), 시작일 내림차순 그대로
 *
 * 이미 `sovereignReigns`가 붙어 있으면(상세 조회가 따로 읽어 붙인 경우) 손대지 않는다.
 * 군주직 판정에 `positionDefinition.isMonarchical`이 필요하다 — select에 넣어야 한다.
 */
export function splitOfficeHoldings<T extends Record<string, any>>(person: T): T {
  const all: any[] | undefined = person?.GovernmentTenures
  if (!Array.isArray(all) || person.sovereignReigns !== undefined) return person
  const isMonarchical = (row: any) => row?.positionDefinition?.isMonarchical === true
  return {
    ...person,
    GovernmentTenures: all.filter((row) => !isMonarchical(row)),
    sovereignReigns: all.filter(isMonarchical).map(asReignRecord),
  }
}

/**
 * 재임 업적 행(부모 = 군주직 재임) → 예전 재위 업적 모양.
 * 예전 매퍼(mapSovereignReignAchievementRow)가 `sovereignReignId`·`sovereignReign`을 읽는다.
 */
export function asLegacyReignAchievement<T extends { tenureId: string; tenure?: any }>(
  row: T,
): Omit<T, 'tenure'> & { sovereignReignId: string; sovereignReign: any } {
  const { tenure, ...rest } = row
  return {
    ...rest,
    sovereignReignId: row.tenureId,
    sovereignReign: tenure ? asReignRecord(tenure) : tenure,
  }
}
