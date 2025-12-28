import { ApiProperty } from '@nestjs/swagger'

export class ContinentResponseDto {
  @ApiProperty({ description: '대륙 ID' })
  id!: string

  @ApiProperty({ description: '대륙명' })
  name!: string

  @ApiProperty({ description: '영문명', required: false })
  enName?: string | null

  @ApiProperty({ description: 'ISO 코드', required: false })
  isoCode?: string | null

  @ApiProperty({ description: '면적 (km²)', required: false })
  areaSqKm?: number | null

  @ApiProperty({ description: '인구', required: false, type: 'string' })
  population?: string | null

  @ApiProperty({ description: '국가 수', required: false })
  countryCount?: number | null

  @ApiProperty({ description: '타임존 목록', required: false })
  timeZones?: any | null

  @ApiProperty({ description: '상위 대륙 ID', required: false })
  parentId?: string | null
}
