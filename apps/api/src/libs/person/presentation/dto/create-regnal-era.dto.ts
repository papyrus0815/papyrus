import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

/** 재임에 연호·시대명(동아시아 연호, 유럽식 재위 시대명 등) 추가 */
export class CreateRegnalEraDto {
  @IsString()
  @MaxLength(50)
  eraName!: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  eraNameEn?: string | null

  @IsInt()
  @Min(1)
  startYear!: number

  @IsOptional()
  @IsInt()
  @Min(1)
  startMonth?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  startDay?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  endYear?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  endMonth?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  endDay?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  changeReason?: string | null
}

export class UpdateRegnalEraDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  eraName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  eraNameEn?: string | null

  @IsOptional()
  @IsInt()
  @Min(1)
  startYear?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  startMonth?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  startDay?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  endYear?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  endMonth?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  endDay?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  changeReason?: string | null
}
