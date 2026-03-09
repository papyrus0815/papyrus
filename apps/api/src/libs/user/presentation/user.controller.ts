import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { UserService } from '../application/user.service'
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './dto/user.dto'
import { UserResponseDto, UsersResponseDto } from './dto/user-response.dto'
import { UserEntity } from '../domain/user.entity'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 회원가입
   */
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.userService.register(dto)
    return this.toResponseDto(user)
  }

  /**
   * 로그인
   */
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ user: UserResponseDto; accessToken: string }> {
    const user = await this.userService.login(dto)
    
    // TODO: JWT 토큰 생성 로직 추가
    const accessToken = 'temp_token_' + user.id
    
    return {
      user: this.toResponseDto(user),
      accessToken,
    }
  }

  /**
   * 현재 사용자 정보 조회
   */
  @Get('me')
  // @UseGuards(JwtAuthGuard) // TODO: JWT Guard 추가
  async getMe(@Request() req: any): Promise<UserResponseDto> {
    // TODO: req.user.id에서 userId 가져오기
    const userId = req.user?.id || 'temp_user_id'
    const user = await this.userService.findById(userId)
    return this.toResponseDto(user)
  }

  /**
   * 사용자 조회 (ID)
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id)
    return this.toResponseDto(user)
  }

  /**
   * 사용자 조회 (displayName)
   */
  @Get('by-name/:displayName')
  async findByDisplayName(@Param('displayName') displayName: string): Promise<UserResponseDto> {
    const user = await this.userService.findByDisplayName(displayName)
    return this.toResponseDto(user)
  }

  /**
   * 사용자 목록 조회
   */
  @Get()
  async findMany(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('orderBy') orderBy: 'createdAt' | 'followerCount' = 'createdAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ): Promise<UsersResponseDto> {
    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(pageSize, 10)
    const skip = (pageNum - 1) * pageSizeNum

    const { users, total } = await this.userService.findMany({
      skip,
      take: pageSizeNum,
      orderBy,
      order,
    })

    return {
      users: users.map((user) => this.toResponseDto(user)),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    }
  }

  /**
   * 프로필 업데이트
   */
  @Put('me')
  // @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto): Promise<UserResponseDto> {
    const userId = req.user?.id || 'temp_user_id'
    const user = await this.userService.updateProfile(userId, dto)
    return this.toResponseDto(user)
  }

  /**
   * 비밀번호 변경
   */
  @Put('me/password')
  // @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto): Promise<{ message: string }> {
    const userId = req.user?.id || 'temp_user_id'
    await this.userService.changePassword(userId, dto.oldPassword, dto.newPassword)
    return { message: '비밀번호가 변경되었습니다.' }
  }

  /**
   * 계정 비활성화 (탈퇴)
   */
  @Delete('me')
  // @UseGuards(JwtAuthGuard)
  async deactivate(@Request() req: any): Promise<{ message: string }> {
    const userId = req.user?.id || 'temp_user_id'
    await this.userService.deactivate(userId)
    return { message: '계정이 비활성화되었습니다.' }
  }

  /**
   * Entity를 ResponseDto로 변환
   */
  private toResponseDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      postCount: user.postCount,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }
  }
}

