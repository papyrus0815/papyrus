import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AttachmentOwner } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { UploadService } from '../../shared/upload/upload.service'
import { DynastyRepository } from '../infrastructure/dynasty.repository'
import {
  clientThumbnailInputToStoredFilePath,
  DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
} from '../dynasty-thumbnail.util'

@Injectable()
export class DynastyService {
  constructor(
    private readonly dynastyRepository: DynastyRepository,
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async findAll() {
    return this.dynastyRepository.findAll()
  }

  async findById(id: string) {
    const dynasty = await this.dynastyRepository.findById(id)
    if (!dynasty) {
      throw new NotFoundException(`Dynasty with ID ${id} not found`)
    }
    return dynasty
  }

  async create(data: {
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
    /** 업로드 API가 반환한 `/uploads/...` 경로 */
    thumbnailUrl?: string | null
    originPlace?: string | null
    founderId?: string | null
    founderText?: string | null
    crestImageUrl?: string | null
    motto?: string | null
  }) {
    const { thumbnailUrl, ...fields } = data
    if (fields.founderId) {
      await this.assertPersonExists(fields.founderId)
    }
    const id = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dynasty.create({ data: fields })
      const trimmed = thumbnailUrl?.trim()
      if (trimmed) {
        const filePath = this.toAttachmentFilePathOrThrow(trimmed)
        await tx.attachment.create({
          data: {
            ownerType: AttachmentOwner.DYNASTY,
            ownerId: d.id,
            title: DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
            filePath,
            fileType: 'image/*',
            fileSize: 0,
          },
        })
      }
      return d.id
    })
    return (await this.dynastyRepository.findById(id))!
  }

  async update(
    id: string,
    data: {
      name?: string
      description?: string
      startDate?: Date
      endDate?: Date
      /** 새 업로드 경로. `null` 또는 빈 문자열이면 썸네일만 제거. 생략 시 썸네일 유지 */
      thumbnailUrl?: string | null
      originPlace?: string | null
      founderId?: string | null
      founderText?: string | null
      crestImageUrl?: string | null
      motto?: string | null
    },
  ) {
    await this.findById(id)
    const { thumbnailUrl, ...fields } = data

    if (fields.founderId) {
      await this.assertPersonExists(fields.founderId)
    }

    if (thumbnailUrl !== undefined) {
      await this.removeDynastyThumbnailFilesAndRows(id)
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(fields).length > 0) {
        await tx.dynasty.update({ where: { id }, data: fields })
      }
      const trimmed = thumbnailUrl?.trim()
      if (thumbnailUrl !== undefined && trimmed) {
        const filePath = this.toAttachmentFilePathOrThrow(trimmed)
        await tx.attachment.create({
          data: {
            ownerType: AttachmentOwner.DYNASTY,
            ownerId: id,
            title: DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
            filePath,
            fileType: 'image/*',
            fileSize: 0,
          },
        })
      }
    })

    return (await this.dynastyRepository.findById(id))!
  }

  /** 시조 ID 유효성 검증 */
  private async assertPersonExists(personId: string) {
    const exists = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { id: true },
    })
    if (!exists) {
      throw new BadRequestException('시조로 지정한 인물을 찾을 수 없습니다.')
    }
  }

  /**
   * 가문 상세 — 기본 필드 + 통치 국가(역사·현대) + 구성원 미리보기 포함
   */
  async findDetail(id: string) {
    const base = await this.findById(id)

    const [historicalRules, modernRules, members] = await Promise.all([
      this.prisma.dynastyRule.findMany({
        where: { dynastyId: id },
        include: {
          historicalCountry: { select: { id: true, name: true } },
        },
        orderBy: [{ startYear: 'asc' }, { startMonth: 'asc' }, { startDay: 'asc' }],
      }),
      this.prisma.dynastyModernRule.findMany({
        where: { dynastyId: id },
        include: {
          country: { select: { id: true, name: true } },
        },
        orderBy: [{ startYear: 'asc' }, { startMonth: 'asc' }, { startDay: 'asc' }],
      }),
      this.prisma.person.findMany({
        where: { dynastyId: id },
        select: {
          id: true,
          name: true,
          surname: true,
          birthDate: true,
          deathDate: true,
          profileImageUrl: true,
        },
        orderBy: [{ birthDate: 'asc' }, { name: 'asc' }],
      }),
    ])

    return {
      ...base,
      historicalRules: historicalRules.map((r) => ({
        id: r.id,
        historicalCountryId: r.historicalCountryId,
        historicalCountryName: r.historicalCountry.name,
        startEra: r.startEra,
        startYear: r.startYear,
        endEra: r.endEra,
        endYear: r.endYear,
        endReason: r.endReason,
        notes: r.notes,
      })),
      modernRules: modernRules.map((r) => ({
        id: r.id,
        countryId: r.countryId,
        countryName: r.country.name,
        startEra: r.startEra,
        startYear: r.startYear,
        endEra: r.endEra,
        endYear: r.endYear,
        endReason: r.endReason,
        notes: r.notes,
      })),
      memberCount: members.length,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        surname: m.surname,
        birthDate: m.birthDate?.toISOString() ?? null,
        deathDate: m.deathDate?.toISOString() ?? null,
        profileImageUrl: m.profileImageUrl,
      })),
    }
  }

  async delete(id: string) {
    await this.findById(id)
    await this.removeDynastyThumbnailFilesAndRows(id)
    await this.dynastyRepository.delete(id)
  }

  private toAttachmentFilePathOrThrow(clientUrl: string): string {
    const stored = clientThumbnailInputToStoredFilePath(clientUrl)
    if (!stored) {
      throw new BadRequestException('유효한 썸네일 경로가 아닙니다.')
    }
    if (stored.length > 500) {
      throw new BadRequestException('썸네일 경로가 너무 깁니다.')
    }
    return stored
  }

  private async removeDynastyThumbnailFilesAndRows(dynastyId: string) {
    const rows = await this.prisma.attachment.findMany({
      where: {
        ownerType: AttachmentOwner.DYNASTY,
        ownerId: dynastyId,
        title: DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
      },
    })
    for (const r of rows) {
      await this.deleteStoredUploadFile(r.filePath)
    }
    if (rows.length > 0) {
      await this.prisma.attachment.deleteMany({
        where: {
          ownerType: AttachmentOwner.DYNASTY,
          ownerId: dynastyId,
          title: DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
        },
      })
    }
  }

  private async deleteStoredUploadFile(filePath: string) {
    const fp = filePath.trim()
    if (!fp) return
    if (fp.startsWith('/uploads/')) {
      await this.uploadService.deleteFileByUrl(fp)
    } else if (!/^https?:\/\//i.test(fp)) {
      await this.uploadService.deleteFileByRelativePath(fp)
    }
  }
}
