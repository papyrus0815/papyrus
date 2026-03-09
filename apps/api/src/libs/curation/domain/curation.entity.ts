import { PostVisibility, PostStatus } from '@prisma/client'

/**
 * Curation Entity (Prisma 모델명: Post)
 * 사용자가 작성한 글
 */
export class CurationEntity {
  id!: string
  userId!: string
  keywords?: string
  title!: string
  content!: string
  visibility!: PostVisibility
  status!: PostStatus

  // 통계
  viewCount!: number
  likeCount!: number
  commentCount!: number

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
      this.status === PostStatus.DRAFT &&
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
    this.status = PostStatus.PUBLISHED
    this.publishedAt = new Date()
  }

  /**
   * 수정 가능 여부 확인
   */
  canEdit(userId: string): boolean {
    return this.userId === userId && this.status !== PostStatus.DELETED
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
}

