import { IsString, IsNotEmpty, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string

  /** 새 비밀번호 (최소 8자) */
  @IsString()
  @MinLength(8)
  newPassword!: string
}
