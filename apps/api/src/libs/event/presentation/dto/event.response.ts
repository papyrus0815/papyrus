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

  @ApiProperty({ description: '종료일', required: false })
  endDate?: string | null

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

  @ApiProperty({ description: '상위 사건 ID', required: false })
  parentEventId?: string | null

  @ApiProperty({ description: '상위 사건 정보', required: false })
  parentEvent?: EventResponseDto

  @ApiProperty({ description: '하위 사건 목록', required: false })
  childEvents?: EventResponseDto[]

  @ApiProperty({ description: '도시 ID', required: false })
  cityId?: string | null

  @ApiProperty({ description: '행정구역 ID', required: false })
  administrativeDivisionId?: string | null

  @ApiProperty({ description: '역사적 국가 ID', required: false })
  historicalCountryId?: string | null

  @ApiProperty({ description: '썸네일 이미지 URL', required: false })
  thumbnail?: string | null

  @ApiProperty({ description: '섹션 기반 컨텐츠', required: false })
  sections?: any | null

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

  @ApiProperty({ description: '생성일시', required: false })
  createdAt?: string

  @ApiProperty({ description: '수정일시', required: false })
  updatedAt?: string
}

