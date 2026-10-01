import { StatehoodAgentSide } from '@prisma/client'
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator'

/**
 * 건국·멸망 주체 추가 — 주체는 인물·역사 국가·현대 국가·이름 중 **정확히 하나**.
 * (하나만 받는 규칙은 class-validator로 표현이 번거로워 컨트롤러에서 검사한다)
 */
export class CreateStatehoodAgentDto {
  @IsEnum(StatehoodAgentSide)
  side!: StatehoodAgentSide

  @IsOptional()
  @IsUUID()
  personId?: string

  @IsOptional()
  @IsUUID()
  agentHistoricalCountryId?: string

  @IsOptional()
  @IsUUID()
  agentCountryId?: string

  /** 등록되지 않은 주체의 이름(예: '훈족 연합') */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  /** 역할 한 줄(예: '위화도 회군 후 즉위') */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string
}

/** 역할 메모·순서만 고친다 — 주체를 바꾸려면 지우고 다시 추가 */
export class UpdateStatehoodAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
