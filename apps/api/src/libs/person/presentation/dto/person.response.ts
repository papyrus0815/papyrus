import { Era, DeathType } from './create-person.dto'

/**
 * 인물 상세 응답의 군주·재위(SovereignReign) 요약.
 *
 * 이 타입은 `PersonRepository.findByIdWithRelations`의 sovereignReigns select와 1:1이다 —
 * select에 컬럼을 추가하면 여기도 함께 추가할 것(반쪽배선 방지 계약).
 */
export interface PersonSovereignReignSummaryDto {
  id: string
  /** 재위 시작일 (직렬화된 ISO 문자열) */
  startDate: string
  /** 즉위일 정밀도 — 'year'면 연도만 앎(표시·나이 파생은 완화) */
  startDatePrecision: string | null
  /** 재위 종료일 — 현직·미상이면 null */
  endDate: string | null
  /** 즉위·대관식 사건(Event 정본) 링크 */
  accessionEventId: string | null
  accessionEvent: { id: string; title: string | null; deletedAt: string | null } | null
  /** 비고 (레거시 왕명 인코딩 포함 가능) */
  notes: string | null
  /** 왕명 (정식 컬럼) */
  regnalName: string | null
  /** 왕명 서수 (예: 14세의 14) */
  regnalNumber: number | null
  /** 통산 대수 — 공식 대수 없으면 null */
  termNumber: number | null
  /** 본인 회차 (기) */
  subTermNumber: number | null
  /** 왕조 내 서수 (왕조 n대) */
  dynastyOrdinal: number | null
  /** 즉위 방식 (AppointmentMethod enum 문자열) */
  appointmentMethod: string | null
  /** 즉위 방식 상세 서술 */
  appointmentDetail: string | null
  /** 퇴위 사유 (enum 문자열) */
  endReason: string | null
  /** 퇴위 사유 상세 서술 */
  endReasonDetail: string | null
  /** 직위 정의 (군주위) */
  positionDefinition: { id: string; title: string | null } | null
  /** 현대 국가 */
  country: { id: string; name: string | null } | null
  /** 역사(과거) 국가 */
  historicalCountry: { id: string; name: string | null } | null
  /** 재위 중 업적 — TENURE_ACHIEVEMENTS_SELECT shape (전면 타이핑은 범위 밖) */
  achievements: any[]
}

/**
 * 인물 응답 DTO
 */
export interface PersonResponseDto {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  originalName: string | null
  surnameMeaning: string | null
  nameMeaning: string | null
  middleNameMeaning: string | null
  birthEra: Era | null
  birthYear: number | null
  birthMonth: number | null
  birthDay: number | null
  /** 출생일 정밀도 'year'|'month'|'day'. null=레거시(출처불명). precision<day면 위 month/day는 null로 나온다. */
  birthDatePrecision: string | null
  deathEra: Era | null
  deathYear: number | null
  deathMonth: number | null
  deathDay: number | null
  deathDatePrecision: string | null
  /** 활동시기(floruit) — 생몰 전면 미상 인물의 활동 연대(생몰 폴백). 크기값(양수)+floruitEra. */
  floruitStartYear: number | null
  floruitEndYear: number | null
  floruitEra: Era | null
  gender: string | null
  biography: string | null
  profileImageUrl: string | null
  // 왕/군주 관련 필드
  regnalName: string | null
  templeName: string | null
  posthumousName: string | null
  // 관계
  dynastyId: string | null
  /** 가문 (목록/재임 응답에서 노출, id·name만) */
  dynasty?: { id: string; name: string } | null
  religionId: string | null
  religion?: { id: string; name: string } | null
  denominationId: string | null
  denomination?: { id: string; name: string } | null
  fatherId: string | null
  motherId: string | null
  /** 사생아·서출 여부 — 가계도 카드 별표(*) 마커 */
  illegitimate: boolean
  /** 출생 서열 (1-base, 성별 통합) */
  birthOrder?: number | null
  /** effective 주 국적 id (역사>현대 우선). 역사국가면 HistoricalCountry PK가 담길 수 있음 — 라우팅엔 country.modernCountryId 사용. */
  countryId: string | null
  /** 주 국적이 역사(과거) 국가일 때의 first-class FK (HistoricalCountry PK). 현대 주국적이면 null. */
  historicalCountryId: string | null
  /**
   * 소속 국가 (목록 표시용). isHistorical=true면 id는 역사국가 PK이고 flag/iso/이름순서는
   * 연결 현대국가에서 주입된다 → 상세 배지 라우팅은 반드시 modernCountryId를 쓸 것.
   */
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    isoCode?: string | null
    defaultNameDisplayOrder?: string | null
    /** 이 국가가 역사(과거) 국가인지 — 배지 라벨·라우팅 분기용 */
    isHistorical?: boolean
    /** 배지 라우팅 대상 현대국가 id (역사국가면 연결 현대국가, 현대면 자기 자신). 연결 없으면 null. */
    modernCountryId?: string | null
    /** 대표 이미지(역사국가) URL */
    thumbnailUrl?: string | null
  } | null
  birthCityId: string | null
  deathCityId: string | null
  /** 출생지 행정구역 ID */
  birthAdminDivisionId?: string | null
  /** 사망지 행정구역 ID */
  deathAdminDivisionId?: string | null
  /** 출생지 직접 입력 텍스트 */
  birthPlaceText?: string | null
  /** 사망지 직접 입력 텍스트 */
  deathPlaceText?: string | null
  /** 출생지 도시 정보 */
  birthCity?: { id: string; name: string } | null
  /** 사망지 도시 정보 */
  deathCity?: { id: string; name: string } | null
  /** 출생지 행정구역 정보 */
  birthAdminDivision?: { id: string; name: string } | null
  /** 사망지 행정구역 정보 */
  deathAdminDivision?: { id: string; name: string } | null
  // 이벤트 목록에 생몰년 표시 여부
  showLifespanOnEventList?: boolean
  /** 출생일 미상 여부 */
  isBirthDateUnknown?: boolean
  /** 출생일 추정(circa) 여부 */
  isBirthDateApproximate?: boolean
  /** 출생 관련 메모 (탄생 설화·유복자·조산 등) — deathNote의 출생 대칭 */
  birthNote?: string | null
  /** 사망일 미상 여부 */
  isDeathDateUnknown?: boolean
  /** 사망일 추정(circa) 여부 */
  isDeathDateApproximate?: boolean
  /** 사망 유형 */
  deathType?: DeathType | null
  /** 사망 원인 상세 */
  deathCause?: string | null
  /** 사망 관련 메모 */
  deathNote?: string | null
  /** 생존 여부 */
  isAlive?: boolean
  /** 역사적 영향력 (0–100) */
  influence?: number | null
  // 정부 직위 재임 기록
  governmentTenures?: any[]
  /** 군주·재위 전용 기록 (SovereignReign — 행정부 재임과 별도 테이블) */
  sovereignReigns?: PersonSovereignReignSummaryDto[]
  /** 인물 연보 (PersonLifeEvent — 자유 서술형 시간축) */
  lifeEvents?: any[]
  createdAt: string
  updatedAt: string
  /** 등록 계정 ID (소유권 검사용, 선택 노출) */
  accountId?: string | null
}

/**
 * 가계도(family-tree) 응답 계약.
 *
 * 이 인터페이스는 `PersonRepository.findFamilyTree`가 실제로 만들어내는 노드/엣지 shape의
 * 단일 진실이다. 서비스·컨트롤러·리포지토리 반환 타입을 모두 이 DTO로 고정해, 필드를
 * 추가(예: 엣지 parentRole, 노드 dynastyOrdinal)할 때 백엔드 전 계층에서 컴파일타임에
 * 강제되도록 한다.
 *
 * 주의: web-admin은 아직 nestia SDK가 아니라 raw fetch 래퍼
 * (`apps/web-admin/src/shared/api/persons-family-tree.ts`)로 이 응답을 받는다.
 * 그 인터페이스(FamilyTreePerson/FamilyTreeEdge/FamilyTreeData)는 이 DTO와 대칭으로
 * 유지해야 한다 — 여기 필드를 바꾸면 클라이언트 래퍼도 함께 갱신할 것.
 */
export interface FamilyTreeNodeFlagDto {
  countryId: string
  countryName: string
  flagEmoji: string | null
  isoCode: string | null
  thumbnailUrl: string | null
}

export interface FamilyTreeNodeSovereignCountryDto {
  id: string | null
  name: string | null
  regnalNumber: number | null
  flagEmoji: string | null
  isoCode: string | null
  thumbnailUrl: string | null
}

export interface FamilyTreeNodeCountryDto {
  id: string
  name: string
  flagEmoji: string | null
  isoCode: string | null
  thumbnailUrl: string | null
  /** 국가 기본 이름 표시 순서 — 노드 개인 nameDisplayOrder 오버라이드 없을 때 사용 */
  defaultNameDisplayOrder: string | null
}

export interface FamilyTreeNodeDto {
  id: string
  /**
   * 현재 계정이 이 노드의 상세를 열 수 있는지 (= findByIdWithRelations 계정 스코프 술어).
   * 트리는 공개로 전 노드를 그리되, false면 프론트에서 클릭 비활성(열면 404 방지).
   * 비인증 요청(accountId 없음)은 상세도 무스코프라 전 노드 true.
   */
  isOwned: boolean
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  gender: string | null
  regnalName: string | null
  profileImageUrl: string | null
  /** BC/AD — birthYear는 크기값(양수)이라 era 없이는 BC가 AD로 둔갑한다 */
  birthEra: Era | null
  deathEra: Era | null
  birthYear: number | null
  deathYear: number | null
  dynasty: { id: string; name: string } | null
  /** 사생아·서출 — UI 별표(*) 마커 */
  illegitimate: boolean
  /** 어떤 결혼에서 태어난 자녀인지 — 다중 배우자 분기용 PersonSpouse FK */
  parentMarriageId: string | null
  /**
   * 부모 FK 스칼라 — 형제 친/이복/이부 판별용. parent-child 엣지는 양끝이 그래프에
   * 있을 때만 방출되므로, '부모 미상(NULL)'과 '그래프 밖(미페치)'은 이 스칼라로만
   * 구분할 수 있다. 판정은 클라이언트 classifySiblingKinship이 FK 직접 비교로 수행.
   */
  fatherId: string | null
  motherId: string | null
  originalName: string | null
  posthumousName: string | null
  templeName: string | null
  preEnthronementTitle: string | null
  birthPlace: string | null
  deathPlace: string | null
  /** 가장 이른 재임 — 군주 카드 즉위국·재위 번호 + 국기 */
  sovereignCountry: FamilyTreeNodeSovereignCountryDto | null
  /** 일반 인물 카드 국기 — Person.countryId (legacy 주 국적) */
  country: FamilyTreeNodeCountryDto | null
  /** UI 편의 — 우선순위(sovereignCountry > country) 적용 결과 */
  flag: FamilyTreeNodeFlagDto | null
}

export interface FamilyTreeEdgeDto {
  source: string
  target: string
  type: 'parent-child' | 'spouse'
  /** spouse 엣지에만: 결혼 시작/종료 연도 + 메모 */
  marriageStartYear?: number | null
  marriageEndYear?: number | null
  note?: string | null
  /** spouse 엣지에만: PersonSpouse 미등록 — 자녀의 다른 친부모로 추정된 배우자 */
  inferred?: boolean
}

export interface FamilyTreeTruncationDto {
  scope: string
  took: number
  limit: number
}

export interface FamilyTreeResponseDto {
  egoId: string
  nodes: FamilyTreeNodeDto[]
  edges: FamilyTreeEdgeDto[]
  /** BFS take 한계로 절단된 항목 — UI "외 N명" 표시용 */
  truncations?: FamilyTreeTruncationDto[]
}
