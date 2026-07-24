import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AttachmentOwner, Era } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { UploadService } from '../../shared/upload/upload.service'
import { DynastyRepository } from '../infrastructure/dynasty.repository'
import {
  clientThumbnailInputToStoredFilePath,
  DYNASTY_THUMBNAIL_ATTACHMENT_TITLE,
} from '../dynasty-thumbnail.util'

/**
 * 사유 문자열 정규화 — 이 도메인 DTO는 interface라 ValidationPipe가 붙지 않으므로
 * VarChar(200) 위반(=raw 500)을 막기 위해 서비스에서 직접 트림·200자 절단한다.
 * `undefined`(생략=유지)와 `null`(클리어)의 의미는 보존하고, 빈 문자열은 `null`로 수렴.
 */
function clampReason(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim().slice(0, 200)
  return trimmed.length > 0 ? trimmed : null
}

/** 비고 정규화 — notes는 @db.Text라 길이제한 없음, 트림만(빈 문자열→null, undefined=유지). */
function normalizeNotes(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * 통치기록 수정/생성 공통 필드 — 컨트롤러가 DateInfo를 구조화 컬럼으로 매핑해 전달.
 * 날짜 컬럼: 수정 시 undefined=축 미변경/null=클리어, era는 현대국가면 컨트롤러가 AD로 coerce.
 */
type RuleMutableFields = {
  startEra?: Era | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: Era | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  startReason?: string | null
  endReason?: string | null
  notes?: string | null
}

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
    // 구조화 BC/고대는 date=null(구조화 Int가 진실)이므로 Date|null.
    startDate?: Date | null
    endDate?: Date | null
    startDatePrecision?: string | null
    startEra?: Era | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    endDatePrecision?: string | null
    endEra?: Era | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
    startReason?: string | null
    endReason?: string | null
    /** 업로드 API가 반환한 `/uploads/...` 경로 */
    thumbnailUrl?: string | null
    originPlace?: string | null
    founderId?: string | null
    founderText?: string | null
    crestImageUrl?: string | null
    motto?: string | null
  }) {
    const { thumbnailUrl, ...rest } = data
    const fields = {
      ...rest,
      startReason: clampReason(rest.startReason),
      endReason: clampReason(rest.endReason),
    }
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
      description?: string | null
      startDate?: Date | null
      endDate?: Date | null
      startDatePrecision?: string | null
      startEra?: Era | null
      startYear?: number | null
      startMonth?: number | null
      startDay?: number | null
      endDatePrecision?: string | null
      endEra?: Era | null
      endYear?: number | null
      endMonth?: number | null
      endDay?: number | null
      startReason?: string | null
      endReason?: string | null
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
    const { thumbnailUrl, ...rest } = data
    const fields = {
      ...rest,
      startReason: clampReason(rest.startReason),
      endReason: clampReason(rest.endReason),
    }

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
        startMonth: r.startMonth,
        startDay: r.startDay,
        endEra: r.endEra,
        endYear: r.endYear,
        endMonth: r.endMonth,
        endDay: r.endDay,
        startReason: r.startReason,
        endReason: r.endReason,
        notes: r.notes,
      })),
      modernRules: modernRules.map((r) => ({
        id: r.id,
        countryId: r.countryId,
        countryName: r.country.name,
        startEra: r.startEra,
        startYear: r.startYear,
        startMonth: r.startMonth,
        startDay: r.startDay,
        endEra: r.endEra,
        endYear: r.endYear,
        endMonth: r.endMonth,
        endDay: r.endDay,
        startReason: r.startReason,
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

  /**
   * 통치기록(역사국가) 수정 — 기간(구조화 컬럼)·종료 사유·비고. 통치 국가(FK)는 불변.
   * where에 {id, dynastyId}로 스코프해 교차 가문 편집을 차단(부모 가드는 findById가 404).
   * 날짜 컬럼은 컨트롤러가 provided-gate로 매핑(생략 축은 undefined→Prisma 무시, 클리어는 null).
   * endReason=clampReason(200자)·notes=normalizeNotes(트림) — interface DTO라 서버 검증 필수.
   */
  async updateHistoricalRuleReason(
    dynastyId: string,
    ruleId: string,
    data: RuleMutableFields,
  ) {
    await this.findById(dynastyId)
    const res = await this.prisma.dynastyRule.updateMany({
      where: { id: ruleId, dynastyId },
      data: this.buildRuleUpdateData(data),
    })
    if (res.count === 0) {
      throw new NotFoundException(
        `Dynasty rule ${ruleId} not found under dynasty ${dynastyId}`,
      )
    }
    return this.findDetail(dynastyId)
  }

  /** 통치기록(현대국가) 수정 — updateHistoricalRuleReason의 현대 국가 쌍. */
  async updateModernRuleReason(
    dynastyId: string,
    ruleId: string,
    data: RuleMutableFields,
  ) {
    await this.findById(dynastyId)
    const res = await this.prisma.dynastyModernRule.updateMany({
      where: { id: ruleId, dynastyId },
      data: this.buildRuleUpdateData(data),
    })
    if (res.count === 0) {
      throw new NotFoundException(
        `Dynasty modern rule ${ruleId} not found under dynasty ${dynastyId}`,
      )
    }
    return this.findDetail(dynastyId)
  }

  /** 통치기록(역사국가) 신규 등록 — 통치 대상 역사국가 FK 존재 검증 후 생성. */
  async createHistoricalRule(
    dynastyId: string,
    data: RuleMutableFields & { historicalCountryId: string },
  ) {
    await this.findById(dynastyId)
    const exists = await this.prisma.historicalCountry.findUnique({
      where: { id: data.historicalCountryId },
      select: { id: true },
    })
    if (!exists) {
      throw new BadRequestException('통치 대상 역사국가를 찾을 수 없습니다.')
    }
    await this.prisma.dynastyRule.create({
      data: {
        dynastyId,
        historicalCountryId: data.historicalCountryId,
        ...this.buildRuleCreateData(data),
      },
    })
    return this.findDetail(dynastyId)
  }

  /** 통치기록(현대국가) 신규 등록 — 통치 대상 현대국가 FK 존재 검증 후 생성. */
  async createModernRule(
    dynastyId: string,
    data: RuleMutableFields & { countryId: string },
  ) {
    await this.findById(dynastyId)
    const exists = await this.prisma.country.findUnique({
      where: { id: data.countryId },
      select: { id: true },
    })
    if (!exists) {
      throw new BadRequestException('통치 대상 현대국가를 찾을 수 없습니다.')
    }
    await this.prisma.dynastyModernRule.create({
      data: {
        dynastyId,
        countryId: data.countryId,
        ...this.buildRuleCreateData(data),
      },
    })
    return this.findDetail(dynastyId)
  }

  /** 통치기록(역사국가) 삭제 — {id, dynastyId} 스코프. */
  async deleteHistoricalRule(dynastyId: string, ruleId: string) {
    await this.findById(dynastyId)
    const res = await this.prisma.dynastyRule.deleteMany({
      where: { id: ruleId, dynastyId },
    })
    if (res.count === 0) {
      throw new NotFoundException(
        `Dynasty rule ${ruleId} not found under dynasty ${dynastyId}`,
      )
    }
    return this.findDetail(dynastyId)
  }

  /** 통치기록(현대국가) 삭제 — deleteHistoricalRule의 현대 국가 쌍. */
  async deleteModernRule(dynastyId: string, ruleId: string) {
    await this.findById(dynastyId)
    const res = await this.prisma.dynastyModernRule.deleteMany({
      where: { id: ruleId, dynastyId },
    })
    if (res.count === 0) {
      throw new NotFoundException(
        `Dynasty modern rule ${ruleId} not found under dynasty ${dynastyId}`,
      )
    }
    return this.findDetail(dynastyId)
  }

  /** 수정 data — 날짜 컬럼은 undefined면 Prisma가 무시(축 미변경), null이면 클리어. */
  private buildRuleUpdateData(data: RuleMutableFields) {
    return {
      startEra: data.startEra,
      startYear: data.startYear,
      startMonth: data.startMonth,
      startDay: data.startDay,
      endEra: data.endEra,
      endYear: data.endYear,
      endMonth: data.endMonth,
      endDay: data.endDay,
      startReason: clampReason(data.startReason),
      endReason: clampReason(data.endReason),
      notes: normalizeNotes(data.notes),
    }
  }

  /** 생성 data — 날짜 컬럼은 undefined면 null로 명시(모던 era는 컨트롤러가 AD coerce). */
  private buildRuleCreateData(data: RuleMutableFields) {
    return {
      startEra: data.startEra ?? null,
      startYear: data.startYear ?? null,
      startMonth: data.startMonth ?? null,
      startDay: data.startDay ?? null,
      endEra: data.endEra ?? null,
      endYear: data.endYear ?? null,
      endMonth: data.endMonth ?? null,
      endDay: data.endDay ?? null,
      startReason: clampReason(data.startReason) ?? null,
      endReason: clampReason(data.endReason) ?? null,
      notes: normalizeNotes(data.notes) ?? null,
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
