import { PrismaService } from '@prisma/prisma.service'

/**
 * 브리지(`HistoricalCountryModernCountry`)를 읽어 소속 스코프를 구성하는 공용 유틸.
 *
 * ## 배경 (검토서 F14)
 * 현대 국가 대시보드에서 "이 나라의 X 전부"를 물을 때, 브리지로 연결된
 * 역사국가 소속 데이터를 합산해야 한다(예: 독일 → 신성로마제국). 이 로직이
 * person 레포·election/political-party 컨트롤러·party-top-leaders 유틸에 복붙되어
 * 있었고, 사건·법령·용어·조직은 이를 빠뜨려 같은 화면의 숫자가 서로 다른 소속
 * 정의를 쓰는 비대칭이 생겼다. 이 파일이 그 단일 출처다.
 *
 * ## 필드명 규약
 * 대부분 엔티티는 소속 FK를 `countryId`(현대) / `historicalCountryId`(역사)로
 * 동일하게 노출하므로 기본값이 바로 맞는다. 다른 이름을 쓰는 도메인만
 * `options`로 재지정한다.
 */

/** {@link buildCountryScopeOr}가 사용할 필드명(엔티티별 상이 시 재지정) */
export interface CountryScopeFieldOptions {
  /** 현대 국가 FK 필드명 (기본 `countryId`) */
  countryField?: string
  /** 역사 국가 FK 필드명 (기본 `historicalCountryId`) */
  historicalField?: string
}

/**
 * `resolveLinkedHistoricalCountryIds`가 필요로 하는 최소 Prisma 표면.
 * 테스트에서 부분 목을 그대로 넘길 수 있도록 구조적 타입으로 좁혔다.
 * (실제 `PrismaService`가 이 형태를 만족한다.)
 */
export interface HistoricalCountryLinkReader {
  historicalCountryModernCountry: {
    findMany(args: {
      where: { modernCountryId: string }
      select: { historicalCountryId: true }
    }): Promise<Array<{ historicalCountryId: string }>>
  }
}

/**
 * 현대 국가에 브리지로 연결된 역사국가 id 배열을 조회한다.
 * 연결이 없으면 빈 배열.
 *
 * @example
 * const linked = await resolveLinkedHistoricalCountryIds(prisma, countryId)
 */
export async function resolveLinkedHistoricalCountryIds(
  prisma: HistoricalCountryLinkReader,
  modernCountryId: string,
): Promise<string[]> {
  const rows = await prisma.historicalCountryModernCountry.findMany({
    where: { modernCountryId },
    select: { historicalCountryId: true },
  })
  return rows.map((row) => row.historicalCountryId)
}

/**
 * 현대 국가 id와 (미리 조회한) 연결 역사국가 id들로 `where` OR 조각을 만든다.
 * 순수 함수 — prisma 접근 없음. 도메인마다 결과를 자기 `WhereInput`에 병합한다.
 *
 * - 연결 역사국가가 없으면 현대 id 단일 조건 `{ [countryField]: modernCountryId }`.
 * - 있으면 `{ OR: [현대 일치, 역사 in 목록] }`.
 * - `linkedHistoricalIds`는 중복 제거되며, 빈 배열이면 OR 없이 단일 조건.
 *
 * @example
 * const or = buildCountryScopeOr(countryId, linked)
 * const where: Prisma.EventWhereInput = { ...or, someOtherFilter }
 *
 * @example // 필드명이 다른 도메인
 * buildCountryScopeOr(id, linked, { historicalField: 'histCountryId' })
 */
export function buildCountryScopeOr(
  modernCountryId: string,
  linkedHistoricalIds: readonly string[],
  options?: CountryScopeFieldOptions,
): Record<string, unknown> {
  const countryField = options?.countryField ?? 'countryId'
  const historicalField = options?.historicalField ?? 'historicalCountryId'

  const uniqueHistoricalIds = Array.from(new Set(linkedHistoricalIds))

  if (uniqueHistoricalIds.length === 0) {
    return { [countryField]: modernCountryId }
  }

  return {
    OR: [
      { [countryField]: modernCountryId },
      { [historicalField]: { in: uniqueHistoricalIds } },
    ],
  }
}

/**
 * {@link resolveLinkedHistoricalCountryIds} + {@link buildCountryScopeOr}를
 * 한 번에 수행하는 편의 함수. 대부분의 호출부는 이걸 쓰면 된다.
 *
 * @example
 * const where: Prisma.LawWhereInput = {
 *   ...(await resolveCountryScopeOr(prisma, countryId)),
 *   isRepealed: false,
 * }
 */
export async function resolveCountryScopeOr(
  prisma: PrismaService,
  modernCountryId: string,
  options?: CountryScopeFieldOptions,
): Promise<Record<string, unknown>> {
  const linkedHistoricalIds = await resolveLinkedHistoricalCountryIds(
    prisma,
    modernCountryId,
  )
  return buildCountryScopeOr(modernCountryId, linkedHistoricalIds, options)
}
