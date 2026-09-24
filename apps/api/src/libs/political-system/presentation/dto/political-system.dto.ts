/**
 * 정체(政體) DTO — 대통령제냐 의원내각제냐, 단원제냐 양원제냐.
 *
 * 기간을 가진 레코드라 한 국가에 여러 줄이 붙는다 (프랑스 제3·4·5공화국).
 */

export type GovernmentFormDto =
  | 'PRESIDENTIAL'
  | 'PARLIAMENTARY'
  | 'SEMI_PRESIDENTIAL'
  | 'CONSTITUTIONAL_MONARCHY'
  | 'ABSOLUTE_MONARCHY'
  | 'MILITARY'
  | 'ONE_PARTY'
  | 'THEOCRACY'
  | 'PROVISIONAL'
  | 'OTHER'

export type LegislatureTypeDto = 'UNICAMERAL' | 'BICAMERAL' | 'NONE'

export type StateStructureDto = 'FEDERAL' | 'UNITARY' | 'CONFEDERATION' | 'OTHER'

export type PartySystemDto =
  | 'ONE_PARTY'
  | 'TWO_PARTY'
  | 'MULTI_PARTY'
  | 'NON_PARTISAN'
  | 'OTHER'

export type EraDto = 'BC' | 'AD'

/**
 * 직함 요약 — 관직 정의 카탈로그(government_position_definition) 행.
 * 정체의 국가원수·정부수반 직함은 이 카탈로그가 정본이다(재임·재위와 같은 테이블).
 */
export interface PoliticalSystemPositionRefDto {
  id: string
  title: string
  titleLocal: string | null
  positionType: string
}

/** 소속 국가 요약 — 어느 FK가 찼는지로 현대/역사를 가른다 (선거 목록 선례 동형) */
export interface PoliticalSystemCountryRefDto {
  id: string
  name: string
}

export interface PoliticalSystemResponseDto {
  id: string
  countryId: string | null
  historicalCountryId: string | null
  country: PoliticalSystemCountryRefDto | null
  historicalCountry: PoliticalSystemCountryRefDto | null

  name: string | null

  startEra: EraDto | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: EraDto | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  isCurrent: boolean

  governmentForm: GovernmentFormDto | null
  legislatureType: LegislatureTypeDto | null

  lowerHouseName: string | null
  lowerHouseSeats: number | null
  upperHouseName: string | null
  upperHouseSeats: number | null

  /** 카탈로그에서 고른 국가원수 직함 — 있으면 이쪽이 표시의 정본 */
  headOfStatePositionId: string | null
  headOfStatePosition: PoliticalSystemPositionRefDto | null
  /** 카탈로그에 없는 칭호일 때만 쓰는 자유입력 */
  headOfStateTitle: string | null
  headOfStateHasPower: boolean | null

  headOfGovernmentPositionId: string | null
  headOfGovernmentPosition: PoliticalSystemPositionRefDto | null
  headOfGovernmentTitle: string | null
  headOfGovernmentHasPower: boolean | null

  stateStructure: StateStructureDto | null
  partySystem: PartySystemDto | null

  notes: string | null

  createdAt: Date
  updatedAt: Date
}

/**
 * 생성 입력. countryId·historicalCountryId 중 최소 하나는 있어야 한다
 * (둘 다 채우는 dual-fill도 허용 — 현대 국가에 붙이면서 역사 국가에도 걸 때).
 */
export interface CreatePoliticalSystemDto {
  countryId?: string | null
  historicalCountryId?: string | null

  name?: string | null

  startEra?: EraDto | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: EraDto | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  isCurrent?: boolean

  governmentForm?: GovernmentFormDto | null
  legislatureType?: LegislatureTypeDto | null

  lowerHouseName?: string | null
  lowerHouseSeats?: number | null
  upperHouseName?: string | null
  upperHouseSeats?: number | null

  /**
   * 관직 정의 id. 카탈로그에서 고른 직함은 이 필드로 보낸다 —
   * 같이 온 자유입력 title은 서버가 비운다(한 칸에 두 진실을 두지 않는다).
   */
  headOfStatePositionId?: string | null
  headOfStateTitle?: string | null
  headOfStateHasPower?: boolean | null

  headOfGovernmentPositionId?: string | null
  headOfGovernmentTitle?: string | null
  headOfGovernmentHasPower?: boolean | null

  stateStructure?: StateStructureDto | null
  partySystem?: PartySystemDto | null

  notes?: string | null
}

/** 수정 입력 — 전 필드 선택. 보내지 않은 키는 그대로 둔다. */
export type UpdatePoliticalSystemDto = Omit<
  CreatePoliticalSystemDto,
  'countryId' | 'historicalCountryId'
>
