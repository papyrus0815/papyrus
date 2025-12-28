import { AggregateType, CurationVisibility, CurationStatus } from '@prisma/client'

/**
 * Curation Entity
 * 사용자가 역사 항목에 대해 작성한 큐레이션(포스트)
 */
export class CurationEntity {
  id!: string
  userId!: string
  itemType!: AggregateType
  itemId!: string
  title!: string
  content!: string
  images?: string[]
  sources?: string[]
  tags?: string[]
  visibility!: CurationVisibility
  status!: CurationStatus

  // 통계
  viewCount!: number
  likeCount!: number
  commentCount!: number

  // 품질 관리
  isVerified!: boolean
  verifiedBy?: string
  verifiedAt?: Date
  reportCount!: number

  // 메타데이터
  createdAt!: Date
  updatedAt!: Date
  publishedAt?: Date

  constructor(partial: Partial<CurationEntity>) {
    Object.assign(this, partial)
  }

  /**
   * 게시 가능 여부 확인
   */
  canPublish(): boolean {
    return (
      this.status === CurationStatus.DRAFT &&
      this.title.trim().length > 0 &&
      this.content.trim().length > 0
    )
  }

  /**
   * 게시하기
   */
  publish(): void {
    if (!this.canPublish()) {
      throw new Error('게시할 수 없는 상태입니다.')
    }
    this.status = CurationStatus.PUBLISHED
    this.publishedAt = new Date()
  }

  /**
   * 수정 가능 여부 확인
   */
  canEdit(userId: string): boolean {
    return this.userId === userId && this.status !== CurationStatus.DELETED
  }

  /**
   * 삭제 가능 여부 확인
   */
  canDelete(userId: string, isCurator: boolean): boolean {
    return this.userId === userId || isCurator
  }

  /**
   * 조회수 증가
   */
  incrementViewCount(): void {
    this.viewCount++
  }

  /**
   * 검증하기
   */
  verify(curatorId: string): void {
    this.isVerified = true
    this.verifiedBy = curatorId
    this.verifiedAt = new Date()
  }

  /**
   * 신고 처리
   */
  report(): void {
    this.reportCount++
    if (this.reportCount >= 5) {
      // 신고가 5회 이상이면 자동으로 PENDING_REVIEW 상태로 변경
      this.status = CurationStatus.PENDING_REVIEW
    }
  }
}

