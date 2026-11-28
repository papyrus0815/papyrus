/**
 * 선전포고 · 개전 원장(WarDeclaration) DTO.
 *
 * 국가 주권 행위 정본: "[선포국 1곳] ──▶ [대상국 1곳]" 단방향 개전·참전·단교 행위.
 * 외교 비화·연설·전달 경위 등 상세 서사는 보조 사건(`narrativeEventId`)에 선택 연결한다.
 */

export type EraDto = 'BC' | 'AD'

export type WarDeclarationKindDto =
  | 'FORMAL_DECLARATION'
  | 'ULTIMATUM_EXPIRY'
  | 'ALLIANCE_ENTRY'
  | 'UNDECLARED_HOSTILITIES'
  | 'CO_BELLIGERENCY'
  | 'DIPLOMATIC_SEVERANCE'

export type WarTerminationKindDto =
  | 'PEACE_TREATY'
  | 'ARMISTICE'
  | 'SURRENDER'
  | 'STATE_EXTINCTION'
  | 'UNILATERAL_DECLARATION'
  | 'ONGOING'

export type WarDeclarationDirectionFilterDto = 'ALL' | 'ISSUED' | 'RECEIVED'

export interface WarDeclarationCountryRefDto {
  id: string
  name: string
  flagEmoji?: string | null
  thumbnailUrl?: string | null
}

export interface WarDeclarationPersonRefDto {
  id: string
  name: string | null
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  profileImageUrl: string | null
  defaultNameDisplayOrder: string | null
}

export interface WarDeclarationTenureRefDto {
  id: string
  title: string | null
  rankTitle: string | null
  positionType: string
  positionDefinition: {
    id: string
    title: string
    positionType: string
  } | null
}

export interface WarDeclarationCabinetRefDto {
  id: string
  name: string | null
}

export interface WarDeclarationChamberRefDto {
  id: string
  name: string
  shortName: string | null
  localName: string | null
  role: string
}

export interface WarDeclarationEventRefDto {
  id: string
  title: string
  description?: string | null
  domain?: string
  type?: string | null
  startDate: string | null
  startEra: EraDto | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endDate?: string | null
  endEra?: EraDto | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}

export interface WarDeclarationTreatyRefDto {
  id: string
  name: string
  alias: string | null
  type: string
  signDate: string
  effectiveDate: string | null
}

export interface WarDeclarationResponseDto {
  id: string

  declaringCountryId: string | null
  declaringCountry: WarDeclarationCountryRefDto | null
  declaringHistoricalCountryId: string | null
  declaringHistoricalCountry: WarDeclarationCountryRefDto | null

  targetCountryId: string | null
  targetCountry: WarDeclarationCountryRefDto | null
  targetHistoricalCountryId: string | null
  targetHistoricalCountry: WarDeclarationCountryRefDto | null

  kind: WarDeclarationKindDto
  title: string | null
  /** title이 비어 있을 때 서버가 파생한 표준 제목 ('{선포국}의 대(對){대상국} 선전포고' 등) */
  displayTitle: string
  casusBelli: string | null
  summary: string | null

  declaredDate: string | null
  declaredEra: EraDto | null
  declaredYear: number | null
  declaredMonth: number | null
  declaredDay: number | null
  declaredPrecision: string | null

  severanceEra: EraDto | null
  severanceYear: number | null
  severanceMonth: number | null
  severanceDay: number | null

  cabinetId: string | null
  cabinet: WarDeclarationCabinetRefDto | null
  decidedByPersonId: string | null
  decidedByPerson: WarDeclarationPersonRefDto | null
  decidedByTenureId: string | null
  decidedByTenure: WarDeclarationTenureRefDto | null

  approvedChamberId: string | null
  approvedChamber: WarDeclarationChamberRefDto | null
  yeas: number | null
  nays: number | null
  abstentions: number | null

  warEventId: string | null
  warEvent: WarDeclarationEventRefDto | null
  ultimatumEventId: string | null
  ultimatumEvent: WarDeclarationEventRefDto | null
  narrativeEventId: string | null
  narrativeEvent: WarDeclarationEventRefDto | null

  terminationKind: WarTerminationKindDto | null
  endedDate: string | null
  endedEra: EraDto | null
  endedYear: number | null
  endedMonth: number | null
  endedDay: number | null
  endedPrecision: string | null
  peaceTreatyId: string | null
  peaceTreaty: WarDeclarationTreatyRefDto | null
  terminationNote: string | null

  createdAt: string
  updatedAt: string
}

export interface CreateNarrativeEventInlineDto {
  title?: string | null
  description?: string | null
  background?: string | null
  aftermath?: string | null
  domain?: 'DIPLOMACY' | 'MILITARY' | 'POLITICS' | null
}

export interface CreateWarDeclarationDto {
  declaringCountryId?: string | null
  declaringHistoricalCountryId?: string | null

  targetCountryId?: string | null
  targetHistoricalCountryId?: string | null

  kind?: WarDeclarationKindDto
  title?: string | null
  casusBelli?: string | null
  summary?: string | null

  declaredEra?: EraDto | null
  declaredYear?: number | null
  declaredMonth?: number | null
  declaredDay?: number | null
  declaredPrecision?: string | null

  severanceEra?: EraDto | null
  severanceYear?: number | null
  severanceMonth?: number | null
  severanceDay?: number | null

  cabinetId?: string | null
  decidedByPersonId?: string | null
  decidedByTenureId?: string | null
  approvedChamberId?: string | null
  yeas?: number | null
  nays?: number | null
  abstentions?: number | null

  warEventId?: string | null
  ultimatumEventId?: string | null
  narrativeEventId?: string | null
  /** 보조 서술 사건을 함께 새로 생성해 바로 연결할 때 지정 */
  createNarrativeEvent?: CreateNarrativeEventInlineDto | null
  /** 상위 전쟁(warEventId)의 참여국에 선포국 가담 시점(joinYear 등)이 비어 있으면 자동 채울지 (기본 true) */
  syncWarParticipantJoin?: boolean

  terminationKind?: WarTerminationKindDto | null
  endedEra?: EraDto | null
  endedYear?: number | null
  endedMonth?: number | null
  endedDay?: number | null
  endedPrecision?: string | null
  peaceTreatyId?: string | null
  terminationNote?: string | null
}

export interface WarDeclarationPartyInputDto {
  countryId?: string | null
  historicalCountryId?: string | null
}

/** 다자 동시 선전포고·개전 일괄 생성 DTO (1 선포국 → N 대상국 또는 N 선포국 → 1 대상국 원자적 생성) */
export interface BatchCreateWarDeclarationDto
  extends Omit<
    CreateWarDeclarationDto,
    | 'declaringCountryId'
    | 'declaringHistoricalCountryId'
    | 'targetCountryId'
    | 'targetHistoricalCountryId'
  > {
  declaringParties: WarDeclarationPartyInputDto[]
  targetParties: WarDeclarationPartyInputDto[]
}

export type UpdateWarDeclarationDto = Partial<CreateWarDeclarationDto>
