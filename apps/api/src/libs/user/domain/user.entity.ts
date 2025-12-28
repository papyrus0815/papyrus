import { UserRole, CurationVisibility, CurationStatus } from '@prisma/client'

/**
 * User Entity
 * 일반 사용자 계정 (관리자 Account와 분리)
 */
export class UserEntity {
  id!: string
  email!: string
  passwordHash!: string
  displayName!: string
  bio?: string
  profileImageUrl?: string
  role!: UserRole
  emailVerified!: boolean
  isActive!: boolean

  // 통계
  followerCount!: number
  followingCount!: number
  curationCount!: number

  // 메타데이터
  createdAt!: Date
  updatedAt!: Date
  lastLoginAt?: Date

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial)
  }

  /**
   * 사용자가 큐레이션을 작성할 수 있는지 확인
   */
  canCreateCuration(): boolean {
    return this.isActive && this.emailVerified
  }

  /**
   * 검증된 사용자인지 확인
   */
  isVerified(): boolean {
    return (
      this.role === UserRole.VERIFIED ||
      this.role === UserRole.CURATOR ||
      this.role === UserRole.ADMIN
    )
  }

  /**
   * 큐레이터 권한이 있는지 확인
   */
  isCurator(): boolean {
    return this.role === UserRole.CURATOR || this.role === UserRole.ADMIN
  }

  /**
   * 관리자 권한이 있는지 확인
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN
  }

  /**
   * 다른 사용자의 콘텐츠를 볼 수 있는지 확인
   */
  canViewCuration(
    curation: { visibility: CurationVisibility; userId: string },
    isFollowing: boolean,
  ): boolean {
    // 본인의 큐레이션
    if (curation.userId === this.id) {
      return true
    }

    // 공개 큐레이션
    if (curation.visibility === CurationVisibility.PUBLIC) {
      return true
    }

    // 팔로워 전용 큐레이션
    if (
      curation.visibility === CurationVisibility.FOLLOWERS_ONLY &&
      isFollowing
    ) {
      return true
    }

    // 큐레이터/관리자는 모든 콘텐츠 볼 수 있음
    if (this.isCurator()) {
      return true
    }

    return false
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  updateLastLogin(): void {
    this.lastLoginAt = new Date()
  }
}
