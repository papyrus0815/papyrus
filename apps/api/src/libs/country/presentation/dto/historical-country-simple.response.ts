import { ApiProperty } from '@nestjs/swagger'
import { Era } from '@prisma/client'
import { LinkedHistoricalKind } from '../../domain/linked-historical-classify'

export class HistoricalCountrySimpleResponseDto {
  /**
   * 역사적 국가 ID
   */
  @ApiProperty({ description: '역사적 국가 ID' })
  id!: string

  /**
   * 역사적 국가명 (한글)
   */
  @ApiProperty({ description: '역사적 국가명 (한글)' })
  name!: string

  /**
   * 역사적 국가명 (영문, 선택)
   */
  @ApiProperty({ description: '역사적 국가명 (영문)', required: false })
  enName!: string | null

  /**
   * 썸네일 URL
   */
  @ApiProperty({ description: '썸네일 URL', required: false })
  thumbnailUrl!: string | null

  /**
   * 국가 형태 (제국, 왕국 등)
   */
  @ApiProperty({ description: '국가 형태 (제국, 왕국 등)' })
  stateType!: string

  /**
   * 존속 시작 기원 (기원전/기원후)
   */
  @ApiProperty({ description: '존속 시작 기원', required: false, enum: Era })
  startEra!: Era | null

  /**
   * 존속 시작 연도
   */
  @ApiProperty({ description: '존속 시작 연도', required: false })
  startYear!: number | null

  /**
   * 존속 시작 월 (1~12)
   */
  @ApiProperty({ description: '존속 시작 월', required: false })
  startMonth!: number | null

  /**
   * 존속 시작 일 (1~31)
   */
  @ApiProperty({ description: '존속 시작 일', required: false })
  startDay!: number | null

  /**
   * 존속 종료 기원 (기원전/기원후)
   */
  @ApiProperty({ description: '존속 종료 기원', required: false, enum: Era })
  endEra!: Era | null

  /**
   * 존속 종료 연도
   */
  @ApiProperty({ description: '존속 종료 연도', required: false })
  endYear!: number | null

  /**
   * 존속 종료 월 (1~12)
   */
  @ApiProperty({ description: '존속 종료 월', required: false })
  endMonth!: number | null

  /**
   * 존속 종료 일 (1~31)
   */
  @ApiProperty({ description: '존속 종료 일', required: false })
  endDay!: number | null

  /**
   * 위도 (수도 또는 중심부)
   */
  @ApiProperty({ description: '위도', required: false })
  latitude!: number | null

  /**
   * 경도 (수도 또는 중심부)
   */
  @ApiProperty({ description: '경도', required: false })
  longitude!: number | null

  /**
   * 표시용 관계 분류 — PREDECESSOR(직계 전신) / CONSTITUENT(당대 구성국) /
   * HERITAGE(관련·유산). 현대 국가 상세에서만 파생·채워지며, 목록·피커에서는 null.
   * 표시 전용 파생이라 스코프 합산과 무관하다.
   */
  @ApiProperty({
    description: '표시용 관계 분류(전신/구성국/유산). 상세에서만 채워짐',
    required: false,
    enum: ['PREDECESSOR', 'CONSTITUENT', 'HERITAGE'],
  })
  linkKind!: LinkedHistoricalKind | null
}
