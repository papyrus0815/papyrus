import { IsString, IsOptional, IsUUID } from 'class-validator'

export class SetRepresentativePersonDto {
  /** 대표 인물로 지정할 Person ID. null/생략 시 해제. */
  @IsOptional()
  @IsUUID()
  @IsString()
  personId?: string | null
}
