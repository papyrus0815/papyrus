import { Injectable } from '@nestjs/common'
import { AttachmentOwner } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import {
  DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
  storedFilePathToThumbnailUrl,
} from '../dynasty-thumbnail.util'

export type DynastyRowWithThumbnail = {
  id: string
  name: string
  description: string | null
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
  thumbnailUrl: string | null
}

@Injectable()
export class DynastyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async attachThumbnails<
    T extends {
      id: string
      name: string
      description: string | null
      startDate: Date | null
      endDate: Date | null
      createdAt: Date
      updatedAt: Date
    },
  >(rows: T[]): Promise<DynastyRowWithThumbnail[]> {
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    const atts = await this.prisma.attachment.findMany({
      where: {
        ownerType: AttachmentOwner.DYNASTY,
        ownerId: { in: ids },
        title: DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
      },
    })
    const byOwner = new Map(atts.map((a) => [a.ownerId, a.filePath]))
    return rows.map((r) => ({
      ...r,
      thumbnailUrl: storedFilePathToThumbnailUrl(byOwner.get(r.id) ?? '') ?? null,
    }))
  }

  async findAll(): Promise<DynastyRowWithThumbnail[]> {
    const rows = await this.prisma.dynasty.findMany({ orderBy: { name: 'asc' } })
    return this.attachThumbnails(rows)
  }

  async findById(id: string): Promise<DynastyRowWithThumbnail | null> {
    const row = await this.prisma.dynasty.findUnique({ where: { id } })
    if (!row) return null
    const [withThumb] = await this.attachThumbnails([row])
    return withThumb
  }

  async create(data: {
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
  }) {
    return this.prisma.dynasty.create({ data })
  }

  async update(
    id: string,
    data: {
      name?: string
      description?: string
      startDate?: Date
      endDate?: Date
    },
  ) {
    return this.prisma.dynasty.update({ where: { id }, data })
  }

  async delete(id: string) {
    return this.prisma.dynasty.delete({ where: { id } })
  }
}
