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

export type HeadSelectionMethodDto =
  | 'DIRECT'
  | 'INDIRECT'
  | 'HEREDITARY'
  | 'APPOINTED'
  | 'COUP_OR_JUNTA'
  | 'OTHER'

export type ElectoralSystemTypeDto =
  | 'FPTP'
  | 'TWO_ROUND'
  | 'PARALLEL'
  | 'MMP'
  | 'PARTY_LIST_PR'
  | 'SNTV_MMDP'
  | 'STV'
  | 'INDIRECT_ELECTORAL'
  | 'OTHER'

export type WarPowerAuthorityDto =
  | 'MONARCH_PREROGATIVE'
  | 'MONARCH_WITH_UPPER_HOUSE'
  | 'LEGISLATURE_EXCLUSIVE'
  | 'EXECUTIVE_WITH_LEGISLATURE_CONSENT'
  | 'EXECUTIVE_EXCLUSIVE'
  | 'RENOUNCED'
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
  isMonarchical?: boolean
}

/** 소속 국가 요약 — 어느 FK가 찼는지로 현대/역사를 가른다 (선거 목록 선례 동형) */
export interface PoliticalSystemChamberRefDto {
  id: string
  name: string
  localName: string | null
  role: string
}

export interface PoliticalSystemCountryRefDto {
  id: string
  name: string
}

export interface PoliticalSystemLawRefDto {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
}

export interface PoliticalSystemEventRefDto {
  id: string
  title: string
  startEra: EraDto | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
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

  /** 원 카탈로그(B7) — 있으면 이쪽이 정본, 위 이름 칸은 표시 캐시 */
  lowerChamberId: string | null
  lowerChamber: PoliticalSystemChamberRefDto | null
  upperChamberId: string | null
  upperChamber: PoliticalSystemChamberRefDto | null

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

  /** 헌법상 선출·임기·선거제도 규칙 */
  headSelectionMethod: HeadSelectionMethodDto | null
  headOfStateTermYears: number | null
  headOfStateTermLimit: number | null
  lowerHouseTermYears: number | null
  upperHouseTermYears: number | null
  electoralSystem: ElectoralSystemTypeDto | null
  electoralThresholdPercent: number | null

  /** 헌법상 군 통수권 · 개전·선전포고 규칙 */
  warPowerAuthority: WarPowerAuthorityDto | null
  warConsentChamberId: string | null
  warConsentChamber: PoliticalSystemChamberRefDto | null
  commanderInChiefPositionId: string | null
  commanderInChiefPosition: PoliticalSystemPositionRefDto | null
  warPowerNotes: string | null

  /** 기본 헌법·헌장·기본법(Law) 연결 */
  constitutionLawId: string | null
  constitutionLaw: PoliticalSystemLawRefDto | null

  /** 체제 출범 계기 사건(Event) 연결 */
  foundingEventId: string | null
  foundingEvent: PoliticalSystemEventRefDto | null

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

  /** 원 카탈로그에서 고른 원 — 보내면 서버가 이름 칸을 그 원으로 채운다. null이면 연결만 끊는다 */
  lowerChamberId?: string | null
  upperChamberId?: string | null

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

  headSelectionMethod?: HeadSelectionMethodDto | null
  headOfStateTermYears?: number | null
  headOfStateTermLimit?: number | null
  lowerHouseTermYears?: number | null
  upperHouseTermYears?: number | null
  electoralSystem?: ElectoralSystemTypeDto | null
  electoralThresholdPercent?: number | null

  warPowerAuthority?: WarPowerAuthorityDto | null
  warConsentChamberId?: string | null
  commanderInChiefPositionId?: string | null
  warPowerNotes?: string | null

  constitutionLawId?: string | null
  foundingEventId?: string | null

  notes?: string | null
}

/** 수정 입력 — 전 필드 선택. 보내지 않은 키는 그대로 둔다. */
export type UpdatePoliticalSystemDto = Partial<CreatePoliticalSystemDto>

/**
 * 자유입력 수반 직함(`headOfStateTitle` / `headOfGovernmentTitle`)을
 * 관직 정의 카탈로그(`GovernmentPositionDefinition`) FK로 일괄 승격하는 요청 DTO.
 */
export interface PromotePoliticalSystemHeadPositionsDto {
  countryId?: string | null
  historicalCountryId?: string | null
  /** 카탈로그에 일치 직위가 없을 때 국가 전용 직위 정의를 자동 신설할지 여부 (기본 true) */
  createMissingDefinitions?: boolean
}

export interface PromotePoliticalSystemHeadPositionsResponseDto {
  updatedSystemCount: number
  createdDefinitionCount: number
  updatedSystemIds: string[]
}

