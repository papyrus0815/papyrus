import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

export const SIDE_WEAPON_KINDS = ['WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL'] as const
export type SideWeaponKind = (typeof SIDE_WEAPON_KINDS)[number]

export class SideWeaponInputDto {
  @ApiProperty({ enum: SIDE_WEAPON_KINDS, description: '병기 분류 (개인·화포 / 지상장비·전차 / 항공기 / 함선)' })
  @IsIn(SIDE_WEAPON_KINDS)
  kind!: SideWeaponKind

  @ApiProperty({ description: '대상 병기·장비 마스터 id' })
  @IsString()
  itemId!: string

  @ApiProperty({ required: false, nullable: true, description: '배속 투입 부대(SideDeployedUnit) id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  deployedUnitId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '투입 수량 (예: 3350)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  quantity?: number | null

  @ApiProperty({ required: false, nullable: true, description: '운용 메모·비고' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  note?: string | null
}

export class SyncSideWeaponsDto {
  @ApiProperty({ type: [SideWeaponInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SideWeaponInputDto)
  weapons!: SideWeaponInputDto[]
}
