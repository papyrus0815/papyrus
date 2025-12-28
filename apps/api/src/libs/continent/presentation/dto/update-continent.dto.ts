import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber } from 'class-validator'

export class UpdateContinentDto {
  @ApiProperty({ description: '대륙명', required: false })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({ description: '영문명', required: false })
  @IsString()
  @IsOptional()
  enName?: string

  @ApiProperty({ description: 'ISO 코드', required: false })
  @IsString()
  @IsOptional()
  isoCode?: string

  @ApiProperty({ description: '면적 (km²)', required: false })
  @IsNumber()
  @IsOptional()
  areaSqKm?: number

  @ApiProperty({ description: '인구', required: false, type: 'string' })
  @IsString()
  @IsOptional()
  population?: string

  @ApiProperty({ description: '국가 수', required: false })
  @IsNumber()
  @IsOptional()
  countryCount?: number

  @ApiProperty({ description: '타임존 목록', required: false })
  @IsOptional()
  timeZones?: any

  @ApiProperty({ description: '상위 대륙 ID', required: false })
  @IsString()
  @IsOptional()
  parentId?: string
}
