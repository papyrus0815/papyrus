import { Injectable } from '@nestjs/common'
import { AttachmentOwner, Era } from '@prisma/client'
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
  startDatePrecision: string | null
  startEra: Era | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endDatePrecision: string | null
  endEra: Era | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  startReason: string | null
  endReason: string | null
  originPlace: string | null
  founderId: string | null
  founder: {
    id: string
    name: string
    surname: string | null
    birthDate: Date | null
    deathDate: Date | null
  } | null
  founderText: string | null
  crestImageUrl: string | null
  motto: string | null
  memberCount: number
  createdAt: Date
  updatedAt: Date
  thumbnailUrl: string | null
}

const FOUNDER_SELECT = {
  id: true,
  name: true,
  surname: true,
  birthDate: true,
  deathDate: true,
} as const

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
      startDatePrecision: string | null
      startEra: Era | null
      startYear: number | null
      startMonth: number | null
      startDay: number | null
      endDatePrecision: string | null
      endEra: Era | null
      endYear: number | null
      endMonth: number | null
      endDay: number | null
      startReason: string | null
      endReason: string | null
      originPlace: string | null
      founderId: string | null
      founder: {
        id: string
        name: string
        surname: string | null
        birthDate: Date | null
        deathDate: Date | null
      } | null
      founderText: string | null
      crestImageUrl: string | null
      motto: string | null
      _count: { persons: number }
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
    return rows.map(({ _count, ...r }) => ({
      ...r,
      memberCount: _count.persons,
      thumbnailUrl: storedFilePathToThumbnailUrl(byOwner.get(r.id) ?? '') ?? null,
    }))
  }

  async findAll(): Promise<DynastyRowWithThumbnail[]> {
    const rows = await this.prisma.dynasty.findMany({
      orderBy: { name: 'asc' },
      include: {
        founder: { select: FOUNDER_SELECT },
        _count: { select: { persons: true } },
      },
    })
    return this.attachThumbnails(rows)
  }

  async findById(id: string): Promise<DynastyRowWithThumbnail | null> {
    const row = await this.prisma.dynasty.findUnique({
      where: { id },
      include: {
        founder: { select: FOUNDER_SELECT },
        _count: { select: { persons: true } },
      },
    })
    if (!row) return null
    const [withThumb] = await this.attachThumbnails([row])
    return withThumb
  }

  async create(data: {
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
    originPlace?: string | null
    founderId?: string | null
    founderText?: string | null
    crestImageUrl?: string | null
    motto?: string | null
  }) {
    return this.prisma.dynasty.create({ data })
  }

  async update(
    id: string,
    data: {
      name?: string
      description?: string | null
      startDate?: Date | null
      endDate?: Date | null
      originPlace?: string | null
      founderId?: string | null
      founderText?: string | null
      crestImageUrl?: string | null
      motto?: string | null
    },
  ) {
    return this.prisma.dynasty.update({ where: { id }, data })
  }

  async delete(id: string) {
    return this.prisma.dynasty.delete({ where: { id } })
  }
}
