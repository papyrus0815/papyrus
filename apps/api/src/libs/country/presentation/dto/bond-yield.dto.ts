/**
 * 국채 금리(CountryBondYield) DTO.
 *
 * 경제 지표와 달리 한 해에 행이 여럿이다 — 만기마다 하나씩. 그래서 키가
 * (연도 + 만기)이고, 삭제도 그 둘을 함께 받는다.
 */

/** 국채 만기. Prisma `BondMaturity`와 같은 값이어야 한다. */
export type BondMaturityDto =
  | 'M1'
  | 'M3'
  | 'M6'
  | 'Y1'
  | 'Y2'
  | 'Y3'
  | 'Y5'
  | 'Y7'
  | 'Y10'
  | 'Y15'
  | 'Y20'
  | 'Y30'
  | 'Y50'
  | 'PERPETUAL'

export interface BondYieldResponse {
  id: string
  countryId: string
  year: number
  maturity: BondMaturityDto
  /** 연 수익률 (%) */
  yieldRate: number
  /** 표면금리 (%) */
  couponRate: number | null
  /** 발행 통화 (ISO 4217) */
  currencyCode: string | null
  /** 물가연동채면 yieldRate는 실질금리다 */
  isInflationLinked: boolean
  source: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * 국채 금리 upsert 입력 — (countryId, year, maturity) 기준 생성/갱신.
 *
 * year·maturity·yieldRate만 필수다. 나머지를 생략하면 기존 값이 보존된다(부분 갱신).
 */
export interface UpsertBondYieldDto {
  year: number
  maturity: BondMaturityDto
  yieldRate: number
  couponRate?: number | null
  currencyCode?: string | null
  isInflationLinked?: boolean
  source?: string | null
  note?: string | null
}
