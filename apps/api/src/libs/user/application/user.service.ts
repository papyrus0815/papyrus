import { Injectable, Inject, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { IUserRepository } from '../domain/user.repository'
import { UserEntity } from '../domain/user.entity'
import * as argon2 from 'argon2'
import { UserRole } from '@prisma/client'

export interface CreateUserDto {
  email: string
  password: string
  displayName: string
  bio?: string
}

export interface UpdateUserDto {
  displayName?: string
  bio?: string
  profileImageUrl?: string
}

export interface LoginDto {
  email: string
  password: string
}

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * 회원가입
   */
  async register(dto: CreateUserDto): Promise<UserEntity> {
    // 이메일 중복 확인
    const existingByEmail = await this.userRepository.findByEmail(dto.email)
    if (existingByEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다.')
    }

    // displayName 중복 확인
    const existingByDisplayName = await this.userRepository.findByDisplayName(dto.displayName)
    if (existingByDisplayName) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.')
    }

    // 비밀번호 해싱
    const passwordHash = await argon2.hash(dto.password)

    // 사용자 생성
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      bio: dto.bio,
      role: UserRole.USER,
      emailVerified: false, // 추후 이메일 인증 기능 추가
      isActive: true,
      followerCount: 0,
      followingCount: 0,
      curationCount: 0,
    })

    return user
  }

  /**
   * 로그인
   */
  async login(dto: LoginDto): Promise<UserEntity> {
    const user = await this.userRepository.findByEmail(dto.email)
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.')
    }

    // 비밀번호 검증
    const isValidPassword = await argon2.verify(user.passwordHash, dto.password)
    if (!isValidPassword) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.')
    }

    // 마지막 로그인 시간 업데이트
    user.updateLastLogin()
    await this.userRepository.update(user.id, { lastLoginAt: user.lastLoginAt })

    return user
  }

  /**
   * 사용자 조회 (ID)
   */
  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.')
    }
    return user
  }

  /**
   * 사용자 조회 (displayName)
   */
  async findByDisplayName(displayName: string): Promise<UserEntity> {
    const user = await this.userRepository.findByDisplayName(displayName)
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.')
    }
    return user
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(userId)

    // displayName 중복 확인 (변경하는 경우)
    if (dto.displayName && dto.displayName !== user.displayName) {
      const existing = await this.userRepository.findByDisplayName(dto.displayName)
      if (existing) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.')
      }
    }

    return await this.userRepository.update(userId, dto)
  }

  /**
   * 사용자 목록 조회
   */
  async findMany(params: {
    skip?: number
    take?: number
    role?: UserRole
    isActive?: boolean
    orderBy?: 'createdAt' | 'followerCount'
    order?: 'asc' | 'desc'
  }) {
    const { skip = 0, take = 20, role, isActive, orderBy = 'createdAt', order = 'desc' } = params

    return await this.userRepository.findMany({
      skip,
      take,
      where: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: {
        [orderBy]: order,
      },
    })
  }

  /**
   * 계정 비활성화 (탈퇴)
   */
  async deactivate(userId: string): Promise<void> {
    await this.findById(userId) // 존재 확인
    await this.userRepository.delete(userId)
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId)

    // 기존 비밀번호 확인
    const isValidPassword = await argon2.verify(user.passwordHash, oldPassword)
    if (!isValidPassword) {
      throw new UnauthorizedException('기존 비밀번호가 일치하지 않습니다.')
    }

    // 새 비밀번호 해싱
    const passwordHash = await argon2.hash(newPassword)

    await this.userRepository.update(userId, { passwordHash })
  }
}

