import {
  AcademicCareerResponseDto,
  AllCareersResponseDto,
  ArtistCareerResponseDto,
  AthleteCareerResponseDto,
  BusinessCareerResponseDto,
  CreateAcademicCareerDto,
  CreateArtistCareerDto,
  CreateAthleteCareerDto,
  CreateBusinessCareerDto,
  CreateEducationDto,
  CreateGovernmentPositionDefinitionDto,
  CreateGovernmentPositionTenureDto,
  CreateLegalCareerDto,
  CreateMediaCareerDto,
  CreateMedicalCareerDto,
  CreateMilitaryCareerDto,
  CreatePersonAwardDto,
  CreatePersonLifeEventDto,
  CreateRegnalEraDto,
  CreateReligiousCareerDto,
  CreateSovereignReignDto,
  CreateTenureAchievementDto,
  LegalCareerResponseDto,
  MediaCareerResponseDto,
  MedicalCareerResponseDto,
  MilitaryCareerResponseDto,
  PersonAwardResponseDto,
  PersonEducationResponseDto,
  PersonResponseDto,
  PersonInfographicItemDto,
  ReligiousCareerResponseDto,
  UpdateGovernmentPositionDefinitionDto,
  UpdatePersonLifeEventDto,
  UpdateRegnalEraDto,
  UpdateTenureAchievementDto,
} from '../presentation/dto'

/**
 * 인물 생성 데이터
 */
export interface CreatePersonData {
  name: string
  middleName?: string
  surname?: string
  /** null·미지정이면 개인 설정 미저장(국가 기본값 폴백) */
  nameDisplayOrder?: 'korean' | 'western' | null
  originalName?: string | null
  surnameMeaning?: string | null
  nameMeaning?: string | null
  middleNameMeaning?: string | null
  /** 크기값(양수) 연도의 UTC 자정 — BC 여부는 birthEra/deathEra에 별도 기록 */
  birthDate?: Date
  deathDate?: Date
  birthEra?: 'BC' | 'AD'
  deathEra?: 'BC' | 'AD'
  isBirthDateUnknown?: boolean
  isDeathDateUnknown?: boolean
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  isAlive?: boolean
  /** 역사적 영향력 (0–100) */
  influence?: number
  gender?: string
  biography?: string
  profileImageUrl?: string
  showLifespanOnEventList?: boolean
  // 왕/군주 관련 필드
  regnalName?: string
  templeName?: string
  posthumousName?: string
  // 관계
  dynastyId?: string
  religionId?: string
  denominationId?: string
  fatherId?: string
  motherId?: string
  /** 사생아·서출 여부 — 가계도 카드 별표 마커 */
  illegitimate?: boolean
  countryId?: string
  birthCityId?: string
  deathCityId?: string
  /** 출생지 행정구역 ID — 도시 없이 행정구역만 저장 */
  birthAdminDivisionId?: string
  /** 사망지 행정구역 ID — 도시 없이 행정구역만 저장 */
  deathAdminDivisionId?: string
  /** 출생지 직접 입력 텍스트 (역사 지명 등) */
  birthPlaceText?: string | null
  /** 사망지 직접 입력 텍스트 (역사 지명 등) */
  deathPlaceText?: string | null
  /** 배우자 관계 목록 (선택) */
  spouseRelations?: Array<{
    spouseId: string
    marriageStartDate?: Date
    marriageEndDate?: Date
    note?: string
  }>
  /** 국가 소속(다중) — 주 국적 외 출생지·복무·망명·이중국적 등 */
  countryAffiliations?: Array<{
    affiliationType: string
    countryId?: string
    historicalCountryId?: string
    startDate?: string
    endDate?: string
    priority?: number
    note?: string
  }>
  /** 등록 계정 ID (개인 정보 플랫폼) */
  accountId?: string
}

/**
 * 인물 수정 데이터
 */
export interface UpdatePersonData {
  name?: string
  middleName?: string
  surname?: string
  /** null = 개인 설정 해제(국가 기본값 폴백), undefined = 변경 없음 */
  nameDisplayOrder?: 'korean' | 'western' | null
  originalName?: string | null
  surnameMeaning?: string | null
  nameMeaning?: string | null
  middleNameMeaning?: string | null
  /** 크기값(양수) 연도의 UTC 자정 — BC 여부는 birthEra/deathEra에 별도 기록. null = 해제 */
  birthDate?: Date | null
  deathDate?: Date | null
  birthEra?: 'BC' | 'AD' | null
  deathEra?: 'BC' | 'AD' | null
  isBirthDateUnknown?: boolean
  isDeathDateUnknown?: boolean
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  isAlive?: boolean
  /** 역사적 영향력 (0–100) */
  influence?: number | null
  gender?: string
  biography?: string
  profileImageUrl?: string | null
  showLifespanOnEventList?: boolean
  // 왕/군주 관련 필드
  regnalName?: string
  templeName?: string
  posthumousName?: string
  // 관계 — null = 명시적 해제, undefined = 변경 없음
  dynastyId?: string | null
  religionId?: string | null
  denominationId?: string
  fatherId?: string | null
  motherId?: string | null
  /** 사생아·서출 여부 — 가계도 카드 별표 마커 */
  illegitimate?: boolean
  countryId?: string
  birthCityId?: string | null
  deathCityId?: string | null
  /** 출생지 행정구역 ID — 도시 없이 행정구역만 저장 */
  birthAdminDivisionId?: string
  /** 사망지 행정구역 ID — 도시 없이 행정구역만 저장 */
  deathAdminDivisionId?: string
  /** 출생지 직접 입력 텍스트 (역사 지명 등) */
  birthPlaceText?: string | null
  /** 사망지 직접 입력 텍스트 (역사 지명 등) */
  deathPlaceText?: string | null
  /** 배우자 관계 목록 (선택, 있으면 기존 삭제 후 일괄 반영) */
  spouseRelations?: Array<{
    spouseId: string
    marriageStartDate?: Date
    marriageEndDate?: Date
    note?: string
  }>
  /** 국가 소속(다중) — 주 국적 외 소속. 있으면 주 국적 외 전체 교체 */
  countryAffiliations?: Array<{
    affiliationType: string
    countryId?: string
    historicalCountryId?: string
    startDate?: string
    endDate?: string
    priority?: number
    note?: string
  }>
  /** 전기(생애 서술) 섹션 — 있으면 기존 전체 삭제 후 일괄 재생성(delete-and-recreate) */
  sections?: Array<{
    title: string
    content: string
    order?: number
    sectionType?: string | null
  }>
}

/**
 * 인물 Repository 인터페이스
 */

/** 하위 항목 삭제 결과 — 소속 인물 ID와 삭제된 항목 식별 라벨(알림 preview용) */
export interface DeletedSubResource {
  personId: string
  itemLabel: string | null
}

export interface IPersonRepository {
  /**
   * 인물 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  findAll(accountId?: string): Promise<PersonResponseDto[]>

  /**
   * 인물 인포그래픽 목록(경량) 조회 — adapt가 쓰는 최소 필드만 (accountId 있으면 해당 계정 소유만)
   */
  findAllForInfographic(
    accountId?: string,
  ): Promise<PersonInfographicItemDto[]>

  /**
   * 국가별 인물 목록 조회 (countryId 소속 전체, accountId 무관 — 국가 페이지 인물 리스트용)
   */
  findPersonsByCountryId(countryId: string): Promise<PersonResponseDto[]>

  /**
   * 가문별 인물 목록 (person.dynastyId = dynastyId, accountId 무관)
   */
  findPersonsByDynastyId(dynastyId: string): Promise<PersonResponseDto[]>

  /**
   * 인물 ID 집합으로 인물 카드 목록 조회 (묶음 멤버 표시 등)
   */
  findPersonsByIds(ids: string[]): Promise<PersonResponseDto[]>

  /**
   * 해당 현대 국가 또는 연결된 역사적 국가에 소속(affiliation)이 있는 인물 조회
   * (PersonCountryAffiliation: 출생지·시민권·봉사국 등)
   */
  findPersonsByAffiliationInCountry(
    countryId: string,
  ): Promise<PersonResponseDto[]>

  /**
   * 현대 국가별 연결 인물 수 (Person.countryId·재임·소속 합집합 — 국가 상세「전체 인물」과 동일)
   */
  findModernCountryPersonCounts(): Promise<
    Array<{ countryId: string; count: number }>
  >

  /**
   * ID로 인물 조회 (accountId 있으면 해당 계정 소유만 반환)
   */
  findById(id: string, accountId?: string): Promise<PersonResponseDto | null>

  /**
   * 인물 생성
   */
  create(data: CreatePersonData): Promise<PersonResponseDto>

  /**
   * 인물 수정
   */
  update(id: string, data: UpdatePersonData): Promise<PersonResponseDto>

  /**
   * 인물 삭제
   */
  delete(id: string): Promise<void>

  // Career 관리
  addMilitaryCareer(
    dto: CreateMilitaryCareerDto,
  ): Promise<MilitaryCareerResponseDto>
  addBusinessCareer(
    dto: CreateBusinessCareerDto,
  ): Promise<BusinessCareerResponseDto>
  addAcademicCareer(
    dto: CreateAcademicCareerDto,
  ): Promise<AcademicCareerResponseDto>
  addAthleteCareer(
    dto: CreateAthleteCareerDto,
  ): Promise<AthleteCareerResponseDto>
  addReligiousCareer(
    dto: CreateReligiousCareerDto,
  ): Promise<ReligiousCareerResponseDto>
  addArtistCareer(dto: CreateArtistCareerDto): Promise<ArtistCareerResponseDto>
  addMediaCareer(dto: CreateMediaCareerDto): Promise<MediaCareerResponseDto>
  addLegalCareer(dto: CreateLegalCareerDto): Promise<LegalCareerResponseDto>
  addMedicalCareer(
    dto: CreateMedicalCareerDto,
  ): Promise<MedicalCareerResponseDto>
  addGovernmentPositionTenure(
    dto: CreateGovernmentPositionTenureDto,
    accountId?: string,
  ): Promise<any>
  updateGovernmentPositionTenure(
    id: string,
    dto: Partial<CreateGovernmentPositionTenureDto>,
  ): Promise<any>
  deleteGovernmentPositionTenure(id: string): Promise<void>
  findTenureById(id: string): Promise<any | null>
  findTenuresByPersonId(personId: string): Promise<any[]>
  findTenuresByCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]>
  /** 인물별 선거 후보 행 — 재임에 electionCandidacyId 연결용 */
  findElectionCandidaciesForTenureLink(personId: string): Promise<any[]>
  findGlobalTenures(): Promise<any[]>
  /** 특정 수반 재임(행정부 수반) 하의 각료 목록 — headTenureId로 Cabinet 조회 후 memberTenures */
  findSubordinateTenures(headTenureId: string): Promise<any[]>
  findCabinetByHeadTenureId(headTenureId: string): Promise<any | null>
  findTenuresByCabinetId(cabinetId: string, accountId?: string): Promise<any[]>
  /** 행정부 한눈에 보기 — 수반+각료+여당을 한 번에 (인물 상세 동료 표시용) */
  findCabinetOverview(cabinetId: string, accountId?: string): Promise<any | null>
  findCabinets(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]>
  createCabinet(
    dto: { headTenureId: string; name?: string | null },
    accountId?: string,
  ): Promise<any>
  /** 행정부 수정 — name 등 */
  updateCabinet(
    cabinetId: string,
    dto: { name?: string | null },
    accountId?: string,
  ): Promise<any>
  /** 행정부 삭제 — 소속 각료 재임 삭제 후 행정부·수반 재임 삭제 (관련 데이터 모두) */
  deleteCabinet(cabinetId: string, accountId?: string): Promise<void>
  /** 두 행정부를 같은 묶음(CabinetLinkageGroup)으로 연결 */
  linkCabinetWithOther(
    cabinetId: string,
    otherCabinetId: string,
    accountId: string,
    eventId?: string | null,
  ): Promise<any>
  /** 이 행정부만 묶음에서 제거 (그룹이 비면 삭제) */
  leaveCabinetLinkageGroup(cabinetId: string, accountId: string): Promise<void>
  /** 같은 묶음의 다른 행정부 목록 */
  findLinkedCabinets(cabinetId: string, accountId: string): Promise<any[]>
  /** 특정 사건을 축으로 묶인 행정부 목록 */
  findCabinetsByLinkageEventId(eventId: string): Promise<any[]>
  /** 묶기 대상 행정부 검색 (countryId / historicalCountryId 로 해당 국가만) */
  searchCabinetsForLinkage(
    accountId: string,
    q: string,
    excludeCabinetId: string,
    limit?: number,
    filter?: { countryId?: string; historicalCountryId?: string },
  ): Promise<any[]>
  /** 조직(만철, 관동군 등) 역대 수장 — positionDefinition.organizationId 기준 */
  findTenuresByOrganizationId(organizationId: string): Promise<any[]>
  /**
   * 재임 업적·한일 추가 (사건과 별도)
   */
  createTenureAchievement(
    tenureId: string,
    dto: CreateTenureAchievementDto,
  ): Promise<any>
  /**
   * 동일 사건(eventId)에 연결된 재임 업적 전부 — 다국 행정부 연결 조회용
   */
  findTenureAchievementsByEventId(eventId: string): Promise<any[]>
  /**
   * 사건 페이지에 표시할 업적 목록 (showOnEventsPage=true)
   */
  findAchievementsForEventsPage(): Promise<any[]>
  /**
   * 재임 업적 수정
   */
  updateTenureAchievement(
    tenureId: string,
    achievementId: string,
    dto: UpdateTenureAchievementDto,
  ): Promise<any>
  /**
   * 재임 업적 삭제
   */
  deleteTenureAchievement(
    tenureId: string,
    achievementId: string,
  ): Promise<void>
  createSovereignReignAchievement(
    sovereignReignId: string,
    dto: CreateTenureAchievementDto,
  ): Promise<any>
  updateSovereignReignAchievement(
    sovereignReignId: string,
    achievementId: string,
    dto: UpdateTenureAchievementDto,
  ): Promise<any>
  deleteSovereignReignAchievement(
    sovereignReignId: string,
    achievementId: string,
  ): Promise<void>
  /** 연호·시대명 — 재임(GovernmentPositionTenure) 또는 재위(SovereignReign) 중 하나 */
  createRegnalEra(
    parent: { tenureId: string } | { sovereignReignId: string },
    dto: CreateRegnalEraDto,
  ): Promise<any>
  addSovereignReign(
    dto: CreateSovereignReignDto,
    accountId?: string,
  ): Promise<any>
  updateSovereignReign(
    id: string,
    dto: Partial<CreateSovereignReignDto>,
  ): Promise<any>
  deleteSovereignReign(id: string): Promise<void>
  findSovereignReignById(id: string): Promise<any | null>
  /**
   * 인물 연보(PersonLifeEvent) — 자유 서술형 시간축 기록
   */
  addPersonLifeEvent(
    dto: CreatePersonLifeEventDto,
    accountId?: string,
  ): Promise<any>
  updatePersonLifeEvent(
    id: string,
    dto: UpdatePersonLifeEventDto,
  ): Promise<any>
  deletePersonLifeEvent(id: string): Promise<void>
  findPersonLifeEventById(id: string): Promise<any | null>
  findPersonLifeEventsByPersonId(personId: string): Promise<any[]>
  updateRegnalEra(id: string, dto: UpdateRegnalEraDto): Promise<any>
  deleteRegnalEra(id: string): Promise<void>
  /**
   * 해당 국가(또는 연결된 역사적 국가)에 재임 기록이 있는 인물만 조회 (역대 수반 인물 선택용)
   */
  findPersonsWithTenureInCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<PersonResponseDto[]>
  findByIdWithRelations(id: string, accountId?: string): Promise<any>
  findPositionDefinitions(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]>
  findPositionDefinitionById(id: string): Promise<any | null>
  createPositionDefinition(
    dto: CreateGovernmentPositionDefinitionDto,
  ): Promise<any>
  updatePositionDefinition(
    id: string,
    dto: UpdateGovernmentPositionDefinitionDto,
  ): Promise<any>
  deletePositionDefinition(id: string): Promise<void>
  addEducation(dto: CreateEducationDto): Promise<PersonEducationResponseDto>
  addAward(dto: CreatePersonAwardDto): Promise<PersonAwardResponseDto>

  // Career·Education·Award 삭제 — 삭제된 행의 personId·항목 라벨 반환 (하위 섹션 변경 알림용)
  deleteMilitaryCareer(id: string): Promise<DeletedSubResource>
  deleteBusinessCareer(id: string): Promise<DeletedSubResource>
  deleteAcademicCareer(id: string): Promise<DeletedSubResource>
  deleteAthleteCareer(id: string): Promise<DeletedSubResource>
  deleteReligiousCareer(id: string): Promise<DeletedSubResource>
  deleteArtistCareer(id: string): Promise<DeletedSubResource>
  deleteMediaCareer(id: string): Promise<DeletedSubResource>
  deleteLegalCareer(id: string): Promise<DeletedSubResource>
  deleteMedicalCareer(id: string): Promise<DeletedSubResource>
  deleteEducation(id: string): Promise<DeletedSubResource>
  deleteAward(id: string): Promise<DeletedSubResource>
  findAllCareers(personId: string): Promise<AllCareersResponseDto>
}
