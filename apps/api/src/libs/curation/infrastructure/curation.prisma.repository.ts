import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import {
  ICurationRepository,
  CurationFindManyParams,
} from '../domain/curation.repository'
import { CurationEntity } from '../domain/curation.entity'
import { AggregateType, CurationStatus } from '@prisma/client'

/**
 * Prisma에서 반환한 데이터를 Entity로 변환하는 헬퍼 함수
 * null을 undefined로 변환
 */
function toCurationEntity(data: any): CurationEntity {
  return new CurationEntity({
    ...data,
    images: data.images as string[],
    sources: data.sources as string[],
    tags: data.tags as string[],
    verifiedBy: data.verifiedBy ?? undefined,
    verifiedAt: data.verifiedAt ?? undefined,
    publishedAt: data.publishedAt ?? undefined,
  })
}

@Injectable()
export class CurationPrismaRepository implements ICurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<CurationEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CurationEntity> {
    const curation = await this.prisma.curation.create({
      data: {
        userId: data.userId,
        itemType: data.itemType,
        itemId: data.itemId,
        title: data.title,
        content: data.content,
        images: data.images || [],
        sources: data.sources || [],
        tags: data.tags || [],
        visibility: data.visibility,
        status: data.status,
        viewCount: data.viewCount || 0,
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
        isVerified: data.isVerified || false,
        reportCount: data.reportCount || 0,
        publishedAt: data.publishedAt,
      },
    })

    return toCurationEntity(curation)
  }

  async findById(id: string): Promise<CurationEntity | null> {
    const curation = await this.prisma.curation.findUnique({
      where: { id },
    })

    if (!curation) return null

    return toCurationEntity(curation)
  }

  async findMany(
    params: CurationFindManyParams,
  ): Promise<{ curations: CurationEntity[]; total: number }> {
    const [curations, total] = await Promise.all([
      this.prisma.curation.findMany({
        skip: params.skip,
        take: params.take,
        where: params.where,
        orderBy: params.orderBy,
      }),
      this.prisma.curation.count({
        where: params.where,
      }),
    ])

    return {
      curations: curations.map((curation: any) => toCurationEntity(curation)),
      total,
    }
  }

  async findByItem(
    itemType: AggregateType,
    itemId: string,
    params: { skip?: number; take?: number },
  ): Promise<{ curations: CurationEntity[]; total: number }> {
    return this.findMany({
      skip: params.skip,
      take: params.take,
      where: {
        itemType,
        itemId,
        status: CurationStatus.PUBLISHED,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    })
  }

  async findByUser(
    userId: string,
    params: { skip?: number; take?: number },
  ): Promise<{ curations: CurationEntity[]; total: number }> {
    return this.findMany({
      skip: params.skip,
      take: params.take,
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async update(
    id: string,
    data: Partial<CurationEntity>,
  ): Promise<CurationEntity> {
    const curation = await this.prisma.curation.update({
      where: { id },
      data,
    })

    return toCurationEntity(curation)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.curation.update({
      where: { id },
      data: { status: CurationStatus.DELETED },
    })
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.curation.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
  }

  async incrementLikeCount(id: string): Promise<void> {
    await this.prisma.curation.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    })
  }

  async decrementLikeCount(id: string): Promise<void> {
    await this.prisma.curation.update({
      where: { id },
      data: { likeCount: { decrement: 1 } },
    })
  }

  async incrementCommentCount(id: string): Promise<void> {
    await this.prisma.curation.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
    })
  }

  async decrementCommentCount(id: string): Promise<void> {
    await this.prisma.curation.update({
      where: { id },
      data: { commentCount: { decrement: 1 } },
    })
  }

  async incrementReportCount(id: string): Promise<void> {
    await this.prisma.curation.update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    })
  }
}
