import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

/** 구조화 시점 — year는 크기값, BC/AD는 era. 정밀도는 서버가 채워진 칸에서 파생한다 */
export class StructuredPointDto {
  @IsIn(['BC', 'AD'])
  era!: 'BC' | 'AD'

  @IsInt()
  @Min(1)
  @Max(9999)
  year!: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number | null
}
