import { UserEntity } from './user.entity'
import { UserRole } from '@prisma/client'

/**
 * User 생성 시 필요한 데이터 타입 (메서드 제외)
 */
export interface CreateUserData {
  email: string
  passwordHash: string
  displayName: string
  bio?: string
  profileImageUrl?: string
  role: UserRole
  emailVerified: boolean
  isActive: boolean
  followerCount: number
  followingCount: number
  curationCount: number
  lastLoginAt?: Date
}

/**
 * User Repository Interface
 */
export interface IUserRepository {
  /**
   * 사용자 생성
   */
  create(user: CreateUserData): Promise<UserEntity>

  /**
   * ID로 사용자 조회
   */
  findById(id: string): Promise<UserEntity | null>

  /**
   * 이메일로 사용자 조회
   */
  findByEmail(email: string): Promise<UserEntity | null>

  /**
   * displayName으로 사용자 조회
   */
  findByDisplayName(displayName: string): Promise<UserEntity | null>

  /**
   * 사용자 업데이트
   */
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>

  /**
   * 사용자 삭제 (소프트 삭제 - isActive = false)
   */
  delete(id: string): Promise<void>

  /**
   * 사용자 목록 조회 (페이지네이션)
   */
  findMany(params: {
    skip?: number
    take?: number
    where?: {
      role?: string
      isActive?: boolean
      emailVerified?: boolean
    }
    orderBy?: {
      createdAt?: 'asc' | 'desc'
      followerCount?: 'asc' | 'desc'
    }
  }): Promise<{ users: UserEntity[]; total: number }>

  /**
   * 팔로워 수 증가
   */
  incrementFollowerCount(userId: string): Promise<void>

  /**
   * 팔로워 수 감소
   */
  decrementFollowerCount(userId: string): Promise<void>

  /**
   * 팔로잉 수 증가
   */
  incrementFollowingCount(userId: string): Promise<void>

  /**
   * 팔로잉 수 감소
   */
  decrementFollowingCount(userId: string): Promise<void>

  /**
   * 큐레이션 수 증가
   */
  incrementCurationCount(userId: string): Promise<void>

  /**
   * 큐레이션 수 감소
   */
  decrementCurationCount(userId: string): Promise<void>
}

