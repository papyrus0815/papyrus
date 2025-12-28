import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator'

/**
 * 회원가입 DTO
 */
export class RegisterDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email!: string

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '비밀번호는 최대 100자까지 가능합니다.' })
  password!: string

  @IsString()
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '닉네임은 최대 50자까지 가능합니다.' })
  displayName!: string

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다.' })
  bio?: string
}

/**
 * 로그인 DTO
 */
export class LoginDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email!: string

  @IsString()
  password!: string
}

/**
 * 프로필 업데이트 DTO
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '닉네임은 최대 50자까지 가능합니다.' })
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다.' })
  bio?: string

  @IsOptional()
  @IsString()
  profileImageUrl?: string
}

/**
 * 비밀번호 변경 DTO
 */
export class ChangePasswordDto {
  @IsString()
  oldPassword!: string

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '비밀번호는 최대 100자까지 가능합니다.' })
  newPassword!: string
}

