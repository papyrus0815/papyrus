import { ApiProperty } from '@nestjs/swagger'
import { EventMapGeometryType } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

export class EventMapFeatureInputDto {
  @ApiProperty({ enum: EventMapGeometryType, description: '도형 종류 (POINT / ARROW / LINE / POLYGON)' })
  @IsEnum(EventMapGeometryType)
  geometryType!: EventMapGeometryType

  @ApiProperty({ description: '피처 제목 (예: 중부집단군 민스크-스몰렌스크 돌파 축선, 키예프 포위망)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null

  @ApiProperty({ required: false, nullable: true, description: '#rrggbb' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string | null

  @ApiProperty({ required: false, nullable: true, description: '진영(EventSide) id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  sideId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '투입 부대(SideDeployedUnit) id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  deployedUnitId?: string | null

  @ApiProperty({ description: '좌표 배열 [[lat, lng], ...]' })
  @IsArray()
  coordinates!: Array<[number, number]>
}

export class SyncEventMapFeaturesDto {
  @ApiProperty({ type: [EventMapFeatureInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventMapFeatureInputDto)
  features!: EventMapFeatureInputDto[]
}
