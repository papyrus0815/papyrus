import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, IsNotEmpty, IsIn } from 'class-validator'

export class CreateCountryDto {
  @ApiProperty({ description: '국가명' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({ description: '공식/전체 명칭 (예: 대한민국, Republic of Korea)', required: false })
  @IsString()
  @IsOptional()
  fullName?: string

  @ApiProperty({ description: '로컬 국가명', required: false })
  @IsString()
  @IsOptional()
  localName?: string

  @ApiProperty({ description: '국기 이모지', required: false })
  @IsString()
  @IsOptional()
  flagEmoji?: string

  @ApiProperty({ description: 'ISO 코드', required: false })
  @IsString()
  @IsOptional()
  isoCode?: string

  @ApiProperty({ description: '인구', required: false, type: 'string' })
  @IsString()
  @IsOptional()
  population?: string

  @ApiProperty({ description: '면적 (km²)', required: false })
  @IsNumber()
  @IsOptional()
  areaSqKm?: number

  @ApiProperty({ description: '썸네일 URL', required: false })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string

  @ApiProperty({ description: '수도', required: false })
  @IsString()
  @IsOptional()
  capital?: string

  @ApiProperty({ description: '통화 ID', required: false })
  @IsString()
  @IsOptional()
  currencyId?: string

  @ApiProperty({ description: '언어 ID', required: false })
  @IsString()
  @IsOptional()
  languageId?: string

  @ApiProperty({ description: '대륙 ID', required: false })
  @IsString()
  @IsOptional()
  continentId?: string

  @ApiProperty({
    description:
      '인물 이름 표시 기본 순서: korean(성·이름), western(이름·성). 비우면 동양식',
    enum: ['korean', 'western'],
    required: false,
  })
  @IsOptional()
  @IsIn(['korean', 'western'])
  defaultNameDisplayOrder?: 'korean' | 'western'
}
