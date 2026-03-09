import {
  PostStatus,
  PostVisibility,
} from '@prisma/client'

import { CurationEntity } from './curation.entity'

/**
 * 글 생성 시 필요한 데이터 타입 (메서드 제외)
 */
export interface CreateCurationData {
  userId: string
  keywords?: string
  title: string
  content: string
  visibility: PostVisibility
  status: PostStatus
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt?: Date
}

export interface CurationFindManyParams {
  skip?: number
  take?: number
  where?: {
    userId?: string
    status?: PostStatus
    visibility?: PostVisibility
  }
  orderBy?: {
    createdAt?: 'asc' | 'desc'
    publishedAt?: 'asc' | 'desc'
    viewCount?: 'asc' | 'desc'
    likeCount?: 'asc' | 'desc'
  }
}

/**
 * 글(Curation) Repository Interface
 */
export interface ICurationRepository {
  /**
   * 글 생성
   */
  create(data: CreateCurationData): Promise<CurationEntity>

  /**
   * ID로 글 조회
   */
  findById(id: string): Promise<CurationEntity | null>

  /**
   * 글 목록 조회
   */
  findMany(
    params: CurationFindManyParams,
  ): Promise<{ curations: CurationEntity[]; total: number }>

  /**
   * 사용자의 글 목록 조회
   */
  findByUser(
    userId: string,
    params: { skip?: number; take?: number },
  ): Promise<{ curations: CurationEntity[]; total: number }>

  /**
   * 글 업데이트
   */
  update(id: string, data: Partial<CurationEntity>): Promise<CurationEntity>

  /**
   * 글 삭제 (소프트 삭제)
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
}
