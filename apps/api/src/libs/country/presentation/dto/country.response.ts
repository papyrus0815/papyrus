import { ApiProperty } from '@nestjs/swagger'
import { HistoricalCountrySimpleResponseDto } from './historical-country-simple.response'

export class CountryResponseDto {
  @ApiProperty({ description: '국가 ID' })
  id!: string

  @ApiProperty({ description: '국가명' })
  name!: string

  @ApiProperty({ description: '로컬 국가명', required: false })
  localName?: string | null

  @ApiProperty({ description: '국기 이모지', required: false })
  flagEmoji?: string | null

  @ApiProperty({ description: 'ISO 코드', required: false })
  isoCode?: string | null

  @ApiProperty({ description: '인구', required: false, type: 'string' })
  population?: string | null

  @ApiProperty({ description: '면적 (km²)', required: false })
  areaSqKm?: number | null

  @ApiProperty({ description: '썸네일 URL', required: false })
  thumbnailUrl?: string | null

  @ApiProperty({ description: '수도', required: false })
  capital?: string | null

  @ApiProperty({ description: '위도', required: false })
  latitude?: number | null

  @ApiProperty({ description: '경도', required: false })
  longitude?: number | null

  @ApiProperty({ description: '통화 ID', required: false })
  currencyId?: string | null

  @ApiProperty({ description: '언어 ID', required: false })
  languageId?: string | null

  @ApiProperty({ description: '대륙 ID', required: false })
  continentId?: string | null

  @ApiProperty({
    description: '연결된 역사적 국가 목록',
    type: [HistoricalCountrySimpleResponseDto],
    required: false,
  })
  historicalCountries?: HistoricalCountrySimpleResponseDto[]
}
