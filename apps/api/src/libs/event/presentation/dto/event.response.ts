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

  @ApiProperty({ description: '상위 사건 ID', required: false })
  parentEventId?: string | null

  @ApiProperty({ description: '상위 사건 정보', required: false })
  parentEvent?: EventResponseDto

  @ApiProperty({ description: '하위 사건 목록', required: false })
  childEvents?: EventResponseDto[]

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
      profileImageUrl?: string | null
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

