import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { ICurationRepository } from '../domain/curation.repository'
import { CurationEntity } from '../domain/curation.entity'
import { UserService } from '../../../libs/user/application/user.service'
import {
  PostVisibility,
  PostStatus,
} from '@prisma/client'

export interface CreateCurationDto {
  title: string
  content: string
  keywords?: string
  visibility?: PostVisibility
  publish?: boolean // true면 바로 게시, false면 임시저장
}

export interface UpdateCurationDto {
  title?: string
  content?: string
  keywords?: string
  visibility?: PostVisibility
}

@Injectable()
export class CurationService {
  constructor(
    @Inject('ICurationRepository')
    private readonly curationRepository: ICurationRepository,
    private readonly userService: UserService,
  ) {}

  /**
   * 글 생성
   */
  async create(
    userId: string,
    dto: CreateCurationDto,
  ): Promise<CurationEntity> {
    // 사용자 확인 및 권한 체크
    const user = await this.userService.findById(userId)
    if (!user.canCreateCuration()) {
      throw new ForbiddenException(
        '글을 작성할 수 없습니다. 이메일 인증이 필요합니다.',
      )
    }

    const status = dto.publish ? PostStatus.PUBLISHED : PostStatus.DRAFT

    const curation = await this.curationRepository.create({
      userId,
      title: dto.title,
      content: dto.content,
      keywords: dto.keywords,
      visibility: dto.visibility || PostVisibility.PUBLIC,
      status,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      publishedAt: status === PostStatus.PUBLISHED ? new Date() : undefined,
    })

    return curation
  }

  /**
   * 글 조회 (단일)
   */
  async findById(id: string, viewerId?: string): Promise<CurationEntity> {
    const curation = await this.curationRepository.findById(id)
    if (!curation) {
      throw new NotFoundException('글을 찾을 수 없습니다.')
    }

    // 조회수 증가 (본인이 아닐 때만)
    if (viewerId !== curation.userId) {
      await this.curationRepository.incrementViewCount(id)
    }

    return curation
  }

  /**
   * 사용자 방의 글 목록 조회
   */
  async getUserCurations(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    return await this.curationRepository.findByUser(userId, {
      skip,
      take: pageSize,
    })
  }

  /**
   * 글 목록 조회 (필터링)
   */
  async findMany(params: {
    page?: number
    pageSize?: number
    status?: PostStatus
    orderBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount'
    order?: 'asc' | 'desc'
  }) {
    const {
      page = 1,
      pageSize = 20,
      status,
      orderBy = 'publishedAt',
      order = 'desc',
    } = params
    const skip = (page - 1) * pageSize

    return await this.curationRepository.findMany({
      skip,
      take: pageSize,
      where: status ? { status } : {}, // 미지정 시 전체 (관리자 목록용)
      orderBy: {
        [orderBy]: order,
      },
    })
  }

  /**
   * 글 업데이트
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateCurationDto,
  ): Promise<CurationEntity> {
    const curation = await this.findById(id)

    if (!curation.canEdit(userId)) {
      throw new ForbiddenException('수정 권한이 없습니다.')
    }

    return await this.curationRepository.update(id, dto)
  }

  /**
   * 글 게시하기 (DRAFT → PUBLISHED)
   */
  async publish(id: string, userId: string): Promise<CurationEntity> {
    const curation = await this.findById(id)

    if (!curation.canEdit(userId)) {
      throw new ForbiddenException('게시 권한이 없습니다.')
    }

    if (!curation.canPublish()) {
      throw new ForbiddenException('게시할 수 없는 상태입니다.')
    }

    curation.publish()
    return await this.curationRepository.update(id, {
      status: curation.status,
      publishedAt: curation.publishedAt,
    })
  }

  /**
   * 글 삭제
   */
  async delete(id: string, userId: string): Promise<void> {
    const curation = await this.findById(id)
    const user = await this.userService.findById(userId)

    if (!curation.canDelete(userId, user.isCurator())) {
      throw new ForbiddenException('삭제 권한이 없습니다.')
    }

    await this.curationRepository.delete(id)
  }
}
