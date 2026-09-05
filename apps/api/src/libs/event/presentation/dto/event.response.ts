import { ApiProperty } from '@nestjs/swagger'

export class EventResponseDto {
  @ApiProperty({ description: '사건 ID' })
  id!: string

  @ApiProperty({ description: '사건명' })
  title!: string

  @ApiProperty({ description: '개요 설명', required: false })
  description?: string | null

  @ApiProperty({ description: '시작일', required: false })
  startDate?: string | null

  @ApiProperty({ description: '시작일 정밀도: year(년만), month(년·월), day(년·월·일)', required: false })
  startDatePrecision?: string | null

  @ApiProperty({
    description:
      '월·일까지 아는 사건인가. false면 연도만 아는 사건이라 startDate의 01-01은 ' +
      '서버가 채운 값이다 — 달력의 특정 날짜에 찍으면 거짓이 된다. ' +
      '판정은 서버에서만 가능하다(합성된 startDate와 실제 DATETIME을 클라이언트는 구분 못 한다).',
    required: false,
  })
  isDayKnown?: boolean

  @ApiProperty({ description: '종료일', required: false })
  endDate?: string | null

  @ApiProperty({ description: '종료일 정밀도: year(년만), month(년·월), day(년·월·일)', required: false })
  endDatePrecision?: string | null

  @ApiProperty({ description: '위치 (자유 텍스트)', required: false })
  location?: string | null

  @ApiProperty({ description: '카테고리 ID', required: false })
  categoryId?: string | null

  @ApiProperty({ description: '카테고리 정보', required: false })
  category?: {
    id: string
    name: string
    description?: string | null
  }

  @ApiProperty({ description: '배경', required: false })
  background?: string | null

  @ApiProperty({ description: '여파', required: false })
  aftermath?: string | null

  @ApiProperty({
    description: '키워드 (동일 사건 매핑용)',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  keywords?: string[] | null

  @ApiProperty({ description: '상위 사건 ID (주 상위 — 루트판정·트리·breadcrumb 기준)', required: false })
  parentEventId?: string | null

  @ApiProperty({
    description:
      "'최상위(앵커) 사건' 판정 오버라이드. null(미지정)이면 파생 판정 — 자손이 하나라도 " +
      "있으면 앵커. ANCHOR = 자손 0이어도 앵커로 취급, PLAIN = 자손이 있어도 앵커에서 제외. " +
      '루트 판정(parentEventId IS NULL)과 직교한다.',
    required: false,
    enum: ['ANCHOR', 'PLAIN'],
  })
  anchorOverride?: 'ANCHOR' | 'PLAIN' | null

  @ApiProperty({ description: '상위 사건 정보 (주 상위)', required: false })
  parentEvent?: EventResponseDto

  @ApiProperty({
    description:
      '주 상위와의 연결 사유(EventHierarchyReason — 쌍 this↔parentEventId). ' +
      '상세 응답에만 실림. 없으면 undefined.',
    required: false,
  })
  parentLinkReason?: string | null

  @ApiProperty({ description: '하위 사건 목록 (주 상위 기준)', required: false })
  childEvents?: EventResponseDto[]

  @ApiProperty({
    description:
      '쌍 스코프 연결 사유 — childEvents/extraChildren 원소로 실릴 때 (그 자식↔이 사건) ' +
      '링크의 사유. 사건 자체의 속성이 아니라 부모-자식 쌍의 주석이라 목록 원소에서만 의미. ' +
      '상세 응답에만 실림, 없으면 undefined.',
    required: false,
  })
  reason?: string | null

  @ApiProperty({
    description:
      '추가 상위 사건 목록(EventParentLink — 주 상위 외 다중 상위). ' +
      '상세 응답에만 실림(include 경로 conditional), 소프트삭제 부모는 걸러짐. ' +
      '정렬: 연결 오래된 순(createdAt asc → id asc). reason=쌍 연결 사유(없으면 undefined).',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        reason: { type: 'string', nullable: true },
      },
    },
  })
  extraParents?: Array<{ id: string; title: string; reason?: string | null }>

  @ApiProperty({
    description:
      '추가 상위 *개수*(EventParentLink, 살아있는 부모만 — 소프트삭제 부모 제외 필터 카운트). ' +
      '목록 응답(getAllEvents 루트·자식)의 배지 근거 — 상세는 extraParents 배열이 정본. ' +
      '_count 미로드 경로에선 undefined(미로드 vs 0 구분 계약, extraParents와 동일).',
    required: false,
  })
  extraParentCount?: number

  @ApiProperty({
    description:
      '추가 하위 사건 목록(EventParentLink 역방향 — 이 사건을 추가 상위로 갖는 사건들). ' +
      '읽기전용 표시용 — 편집은 자식 쪽에서. 소프트삭제 자식은 걸러짐. reason=쌍 연결 사유.',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        reason: { type: 'string', nullable: true },
      },
    },
  })
  extraChildren?: Array<{ id: string; title: string; reason?: string | null }>

  @ApiProperty({ description: '도시 ID', required: false })
  cityId?: string | null

  @ApiProperty({ description: '도시 정보 (편집 폼 위치 복원용)', required: false })
  city?: {
    id: string
    name: string
  } | null

  @ApiProperty({ description: '행정구역 ID', required: false })
  administrativeDivisionId?: string | null

  @ApiProperty({ description: '행정구역 정보 (편집 폼 위치 복원용)', required: false })
  administrativeDivision?: {
    id: string
    name: string
  } | null

  @ApiProperty({ description: '역사적 국가 ID', required: false })
  historicalCountryId?: string | null

  @ApiProperty({
    description: '사건 섹션 목록',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        order: { type: 'number' },
        sectionType: { type: 'string' },
      },
    },
  })
  eventSections?: Array<{
    id: string
    title: string
    content: string
    order: number
    sectionType: string
  }>

  @ApiProperty({
    description: '사건 이미지 목록',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        imageUrl: { type: 'string' },
        caption: { type: 'string' },
        source: { type: 'string' },
        order: { type: 'number' },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  eventImages?: Array<{
    id: string
    imageUrl: string
    caption?: string
    source?: string
    order: number
    isPrimary: boolean
  }>

  @ApiProperty({ 
    description: '썸네일 URL (eventImages의 isPrimary=true인 이미지)', 
    required: false
  })
  thumbnail?: string | null

  @ApiProperty({
    description: '관련 현대 국가 ID 목록',
    required: false,
    type: [String]
  })
  relatedCountryIds?: string[]

  @ApiProperty({
    description: '관련 역사적 국가 ID 목록',
    required: false,
    type: [String]
  })
  relatedHistoricalCountryIds?: string[]

  @ApiProperty({
    description: '관련 현대 국가 정보 목록 (role: EventCountryRole — INITIATOR/TARGET/PARTICIPANT/...)',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        flagEmoji: { type: 'string' },
        role: { type: 'string', nullable: true },
      },
    },
  })
  relatedCountries?: Array<{
    id: string
    name: string
    flagEmoji?: string
    /** 사건 내 역할 — Timeline 등에서 대표 국가 선정에 사용 */
    role?: string | null
  }>

  @ApiProperty({
    description: '관련 역사적 국가 정보 목록 (role: EventCountryRole)',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string', nullable: true },
      },
    },
  })
  relatedHistoricalCountries?: Array<{
    id: string
    name: string
    role?: string | null
  }>

  @ApiProperty({
    description: '관련 인물 목록 — PersonEvent 행. 인물별 role(역할) + note(시점 서술, 장문)',
    required: false,
  })
  relatedPersons?: Array<{
    /** PersonEvent 행 PK */
    id: string
    personId: string
    /** 그 사건에서의 역할 (자유 텍스트) */
    role?: string | null
    /** 그 인물 시점의 사건 서술 (장문) — 인물 연보에도 그대로 표시됨 */
    note?: string | null
    person?: {
      id: string
      name?: string | null
      surname?: string | null
      middleName?: string | null
      profileImageUrl?: string | null
      /** 개인 이름 표시 순서 오버라이드 (korean=성→이름, western=이름→성) */
      nameDisplayOrder?: string | null
      /** 소속 국가 기본 이름 표시 순서 — 개인 오버라이드 없을 때 사용 */
      country?: { defaultNameDisplayOrder?: string | null } | null
    } | null
  }>

  @ApiProperty({ description: '교전 세력 정보 (통합 구조)', required: false })
  belligerents?:
    | {
        // 기본 진영 데이터 (필수)
        sides: Array<{
          name: string
          countries: any[]
          commander?: string
          commanderPersonId?: string
          forces?: string
          deployedUnits?: string[]
          weaponsUsed?: string[]
          description?: string
          parentSideId?: string
          level?: 'coalition' | 'country' | 'force'
        }>
        // 고급 관계 메타데이터 (선택 사항)
        metadata?: {
          countryRelations?: Array<{
            id: string
            fromCountry: string
            toCountry: string
            relationType:
              | 'allied'
              | 'cooperation'
              | 'non-aggression'
              | 'neutral'
              | 'enemy'
              | 'puppet'
              | 'occupied'
            startDate: string
            endDate?: string
            strength: number
            description?: string
            treatyIds?: string[]
          }>
          treaties?: Array<{
            id: string
            name: string
            signDate: string
            expiryDate?: string
            violationDate?: string
            signatories: string[]
            type: 'non-aggression' | 'alliance' | 'trade' | 'territorial' | 'other'
            terms: string[]
            description?: string
          }>
          alliances?: Array<{
            id: string
            name: string
            formationDate: string
            dissolutionDate?: string
            members: Array<{
              countryId: string
              joinDate: string
              leaveDate?: string
              status: 'founding' | 'joined' | 'left' | 'expelled'
            }>
            description?: string
          }>
        }
      }
    | null

  @ApiProperty({ description: '피해 규모 정보', required: false })
  casualties?: any | null

  @ApiProperty({ description: '군사적 상세 정보', required: false })
  militaryDetails?: any | null

  @ApiProperty({ description: '전쟁 비용', required: false })
  warCost?: string | null

  @ApiProperty({ description: '연결된 행정부 목록 (역할 포함)', required: false, type: 'array' })
  cabinetEvents?: Array<{
    id: string
    cabinetId: string
    role: 'ORIGIN' | 'PARTY' | 'MEDIATOR' | 'AFFECTED' | null
    note: string | null
    cabinet: any
  }>

  @ApiProperty({ description: '생성일시', required: false })
  createdAt?: string

  @ApiProperty({ description: '수정일시', required: false })
  updatedAt?: string
}

/**
 * 상위·하위 사건 연결 피커용 경량 후보.
 *
 * 전체 응답(EventResponseDto)은 섹션·이미지·군사정보까지 실어 검색 피커에 과중하므로
 * 식별·표시에 필요한 최소 필드만 노출한다. parentEventId·parentEventTitle은
 * "이미 다른 사건의 하위" 표시와 재부모화 확인 UI의 근거.
 */
export class EventLinkCandidateDto {
  @ApiProperty({ description: '사건 ID' })
  id!: string

  @ApiProperty({ description: '사건명' })
  title!: string

  @ApiProperty({ description: '시작일', required: false })
  startDate?: string | null

  @ApiProperty({ description: '시작일 정밀도', required: false })
  startDatePrecision?: string | null

  @ApiProperty({ description: '종료일', required: false })
  endDate?: string | null

  @ApiProperty({ description: '종료일 정밀도', required: false })
  endDatePrecision?: string | null

  @ApiProperty({ description: '시작 연대 (BC/AD) — BC·고대는 startDate가 null이라 이 필드로 표시', required: false })
  startEra?: string | null

  @ApiProperty({ description: '시작 연도 (구조화)', required: false })
  startYear?: number | null

  @ApiProperty({ description: '종료 연대 (BC/AD)', required: false })
  endEra?: string | null

  @ApiProperty({ description: '종료 연도 (구조화)', required: false })
  endYear?: number | null

  @ApiProperty({ description: '현재 상위 사건 ID (주 상위 — 없으면 null)', required: false })
  parentEventId?: string | null

  @ApiProperty({ description: '현재 상위 사건명 (주 상위 — 없으면 null)', required: false })
  parentEventTitle?: string | null

  @ApiProperty({
    description:
      "추가 상위 사건 목록 — 후보 배지 \"현재 'X'의 하위 (+N)\"의 근거. " +
      'liveParent와 동일한 소프트삭제 게이트(칩·카운트 불일치 방지). 비면 미포함.',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: { id: { type: 'string' }, title: { type: 'string' } },
    },
  })
  extraParents?: Array<{ id: string; title: string }>
}

