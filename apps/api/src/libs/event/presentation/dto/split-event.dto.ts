import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'

/** 전개 단락 하나의 행선지 */
export class SplitSectionDto {
  @ApiProperty({ description: '나눌 전개 단락 ID' })
  @IsString()
  @IsNotEmpty()
  sectionId!: string

  @ApiProperty({
    description:
      'CHILD = 하위 사건으로(단락이 이미 하위 사건을 가리키면 그 사건으로 옮긴다) · ' +
      'BACKGROUND = 배경 단락으로 · AFTERMATH = 여파 단락으로 · DROP = 버리기',
    enum: ['CHILD', 'BACKGROUND', 'AFTERMATH', 'DROP'],
  })
  @IsIn(['CHILD', 'BACKGROUND', 'AFTERMATH', 'DROP'])
  to!: 'CHILD' | 'BACKGROUND' | 'AFTERMATH' | 'DROP'

  @ApiProperty({ description: '새 하위 사건 제목(CHILD, 생략하면 단락 제목)', required: false })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  title?: string

  @ApiProperty({ description: '새 하위 사건 시작일(ISO, BC는 음수 연도)', required: false })
  @IsString()
  @IsOptional()
  startDate?: string

  @ApiProperty({ description: '시작일 정밀도', required: false, enum: ['year', 'month', 'day'] })
  @IsIn(['year', 'month', 'day'])
  @IsOptional()
  startDatePrecision?: 'year' | 'month' | 'day'

  @ApiProperty({ description: '새 하위 사건 종료일(ISO, BC는 음수 연도)', required: false })
  @IsString()
  @IsOptional()
  endDate?: string

  @ApiProperty({ description: '종료일 정밀도', required: false, enum: ['year', 'month', 'day'] })
  @IsIn(['year', 'month', 'day'])
  @IsOptional()
  endDatePrecision?: 'year' | 'month' | 'day'
}

/**
 * 단일 사건 → 묶음 사건 전환('하위 사건으로 나누기').
 * 전개 단락 **전부**의 행선지를 받는다 — 하나라도 빠지면 400(묶음에 전개 단락이 남지 않게).
 * 전개 단락이 없는 사건은 빈 배열로 바로 묶음이 된다.
 */
export class SplitEventDto {
  @ApiProperty({ type: [SplitSectionDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => SplitSectionDto)
  sections!: SplitSectionDto[]
}

export class SplitEventResponseDto {
  @ApiProperty({ description: '새로 만든 하위 사건 ID(단락 순서)' })
  createdChildIds!: string[]

  @ApiProperty({ description: '기존 하위 사건으로 옮긴 단락 수' })
  movedToExistingChild!: number
}
