import { UserRole } from '@prisma/client'

/**
 * 사용자 응답 DTO (비밀번호 제외)
 */
export interface UserResponseDto {
  id: string
  email: string
  displayName: string
  bio?: string
  profileImageUrl?: string
  role: UserRole
  emailVerified: boolean
  isActive: boolean
  followerCount: number
  followingCount: number
  postCount: number
  createdAt: Date
  lastLoginAt?: Date
}

/**
 * 사용자 목록 응답 DTO
 */
export interface UsersResponseDto {
  users: UserResponseDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

