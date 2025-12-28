import { CurationEntity } from './curation.entity'
import { AggregateType, CurationVisibility, CurationStatus } from '@prisma/client'

/**
 * Curation 생성 시 필요한 데이터 타입 (메서드 제외)
 */
export interface CreateCurationData {
  userId: string
  itemType: AggregateType
  itemId: string
  title: string
  content: string
  images?: string[]
  sources?: string[]
  tags?: string[]
  visibility: CurationVisibility
  status: CurationStatus
  viewCount: number
  likeCount: number
  commentCount: number
  isVerified: boolean
  verifiedBy?: string
  verifiedAt?: Date
  reportCount: number
  publishedAt?: Date
}

export interface CurationFindManyParams {
  skip?: number
  take?: number
  where?: {
    userId?: string
    itemType?: AggregateType
    itemId?: string
    status?: CurationStatus
    visibility?: CurationVisibility
    isVerified?: boolean
  }
  orderBy?: {
    createdAt?: 'asc' | 'desc'
    publishedAt?: 'asc' | 'desc'
    viewCount?: 'asc' | 'desc'
    likeCount?: 'asc' | 'desc'
  }
}

/**
 * Curation Repository Interface
 */
export interface ICurationRepository {
  /**
   * 큐레이션 생성
   */
  create(data: CreateCurationData): Promise<CurationEntity>

  /**
   * ID로 큐레이션 조회
   */
  findById(id: string): Promise<CurationEntity | null>

  /**
   * 큐레이션 목록 조회
   */
  findMany(params: CurationFindManyParams): Promise<{ curations: CurationEntity[]; total: number }>

  /**
   * 특정 항목의 큐레이션 목록 조회 (항목 피드)
   */
  findByItem(itemType: AggregateType, itemId: string, params: { skip?: number; take?: number }): Promise<{ curations: CurationEntity[]; total: number }>

  /**
   * 사용자의 큐레이션 목록 조회
   */
  findByUser(userId: string, params: { skip?: number; take?: number }): Promise<{ curations: CurationEntity[]; total: number }>

  /**
   * 큐레이션 업데이트
   */
  update(id: string, data: Partial<CurationEntity>): Promise<CurationEntity>

  /**
   * 큐레이션 삭제 (소프트 삭제)
   */
  delete(id: string): Promise<void>

  /**
   * 조회수 증가
   */
  incrementViewCount(id: string): Promise<void>

  /**
   * 좋아요 수 증가
   */
  incrementLikeCount(id: string): Promise<void>

  /**
   * 좋아요 수 감소
   */
  decrementLikeCount(id: string): Promise<void>

  /**
   * 댓글 수 증가
   */
  incrementCommentCount(id: string): Promise<void>

  /**
   * 댓글 수 감소
   */
  decrementCommentCount(id: string): Promise<void>

  /**
   * 신고 횟수 증가
   */
  incrementReportCount(id: string): Promise<void>
}

