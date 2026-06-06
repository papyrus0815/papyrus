import { IsString, MinLength, MaxLength } from 'class-validator'

export class UpdateDisplayNameDto {
  /** 새 닉네임 (표시명, 2~20자) */
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  displayName!: string
}
