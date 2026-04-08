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
  }) {
    const { thumbnailUrl, ...fields } = data
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
    },
  ) {
    await this.findById(id)
    const { thumbnailUrl, ...fields } = data

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
