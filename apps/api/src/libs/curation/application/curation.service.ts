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
  AggregateType,
  CurationVisibility,
  CurationStatus,
} from '@prisma/client'

export interface CreateCurationDto {
  itemType: AggregateType
  itemId: string
  title: string
  content: string
  images?: string[]
  sources?: string[]
  tags?: string[]
  visibility?: CurationVisibility
  publish?: boolean // true면 바로 게시, false면 임시저장
}

export interface UpdateCurationDto {
  title?: string
  content?: string
  images?: string[]
  sources?: string[]
  tags?: string[]
  visibility?: CurationVisibility
}

@Injectable()
export class CurationService {
  constructor(
    @Inject('ICurationRepository')
    private readonly curationRepository: ICurationRepository,
    private readonly userService: UserService,
  ) {}

  /**
   * 큐레이션 생성
   */
  async create(
    userId: string,
    dto: CreateCurationDto,
  ): Promise<CurationEntity> {
    // 사용자 확인 및 권한 체크
    const user = await this.userService.findById(userId)
    if (!user.canCreateCuration()) {
      throw new ForbiddenException(
        '큐레이션을 작성할 수 없습니다. 이메일 인증이 필요합니다.',
      )
    }

    // 초기 상태 결정
    const status = dto.publish
      ? user.isVerified()
        ? CurationStatus.PUBLISHED // 검증된 사용자는 바로 게시
        : CurationStatus.PENDING_REVIEW // 신규 사용자는 검토 필요
      : CurationStatus.DRAFT // 임시저장

    const curation = await this.curationRepository.create({
      userId,
      itemType: dto.itemType,
      itemId: dto.itemId,
      title: dto.title,
      content: dto.content,
      images: dto.images,
      sources: dto.sources,
      tags: dto.tags,
      visibility: dto.visibility || CurationVisibility.PUBLIC,
      status,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      isVerified: false,
      reportCount: 0,
      publishedAt: status === CurationStatus.PUBLISHED ? new Date() : undefined,
    })

    return curation
  }

  /**
   * 큐레이션 조회 (단일)
   */
  async findById(id: string, viewerId?: string): Promise<CurationEntity> {
    const curation = await this.curationRepository.findById(id)
    if (!curation) {
      throw new NotFoundException('큐레이션을 찾을 수 없습니다.')
    }

    // 조회수 증가 (본인이 아닐 때만)
    if (viewerId !== curation.userId) {
      await this.curationRepository.incrementViewCount(id)
    }

    return curation
  }

  /**
   * 항목 피드 조회 (특정 항목에 대한 모든 큐레이션)
   */
  async getItemFeed(
    itemType: AggregateType,
    itemId: string,
    page = 1,
    pageSize = 20,
  ) {
    const skip = (page - 1) * pageSize
    return await this.curationRepository.findByItem(itemType, itemId, {
      skip,
      take: pageSize,
    })
  }

  /**
   * 사용자 방의 큐레이션 목록 조회
   */
  async getUserCurations(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    return await this.curationRepository.findByUser(userId, {
      skip,
      take: pageSize,
    })
  }

  /**
   * 큐레이션 목록 조회 (필터링)
   */
  async findMany(params: {
    page?: number
    pageSize?: number
    status?: CurationStatus
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
      where: {
        ...(status && { status }),
        ...(!status && { status: CurationStatus.PUBLISHED }), // 기본값: 게시된 것만
      },
      orderBy: {
        [orderBy]: order,
      },
    })
  }

  /**
   * 큐레이션 업데이트
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
   * 큐레이션 게시하기 (DRAFT → PUBLISHED)
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
   * 큐레이션 삭제
   */
  async delete(id: string, userId: string): Promise<void> {
    const curation = await this.findById(id)
    const user = await this.userService.findById(userId)

    if (!curation.canDelete(userId, user.isCurator())) {
      throw new ForbiddenException('삭제 권한이 없습니다.')
    }

    await this.curationRepository.delete(id)
  }

  /**
   * 큐레이션 검증 (큐레이터 전용)
   */
  async verify(id: string, curatorId: string): Promise<CurationEntity> {
    const curator = await this.userService.findById(curatorId)
    if (!curator.isCurator()) {
      throw new ForbiddenException('큐레이터 권한이 필요합니다.')
    }

    const curation = await this.findById(id)
    curation.verify(curatorId)

    return await this.curationRepository.update(id, {
      isVerified: true,
      verifiedBy: curatorId,
      verifiedAt: curation.verifiedAt,
    })
  }

  /**
   * 큐레이션 신고
   */
  async report(id: string, userId: string, reason: string): Promise<void> {
    const curation = await this.findById(id)

    // TODO: 신고 기록 저장 로직 추가

    curation.report()
    await this.curationRepository.update(id, {
      reportCount: curation.reportCount,
      status: curation.status,
    })
  }
}
