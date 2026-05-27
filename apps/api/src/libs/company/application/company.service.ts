import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  CompanyRepository,
  type CompanyWithRelations,
  type CompanyDetailWithRelations,
} from '../infrastructure/company.repository'
import type { CreateCompanyDto, UpdateCompanyDto } from '../presentation/dto'

/** ISO 문자열 → Date. undefined는 미지정(skip), null은 해제. */
function toDateInput(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return new Date(value)
}

/** 선택 스칼라 → undefined는 skip, null은 그대로 전달. */
function passthrough<T>(value: T | null | undefined): T | null | undefined {
  return value
}

/** Json 필드: null은 Prisma.JsonNull로, undefined는 skip. */
function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

@Injectable()
export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  findAll(): Promise<CompanyWithRelations[]> {
    return this.companyRepository.findAll()
  }

  async findById(id: string): Promise<CompanyDetailWithRelations> {
    const company = await this.companyRepository.findById(id)
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`)
    }
    return company
  }

  async create(dto: CreateCompanyDto): Promise<CompanyWithRelations> {
    try {
      return await this.companyRepository.create({
        name: dto.name,
        shortName: dto.shortName,
        localName: dto.localName,
        description: dto.description,
        status: dto.status ?? undefined,
        foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
        dissolvedAt: dto.dissolvedAt ? new Date(dto.dissolvedAt) : undefined,
        websiteUrl: dto.websiteUrl,
        logoUrl: dto.logoUrl,
        extra: toJsonInput(dto.extra),
        founderId: dto.founderId,
        countryId: dto.countryId,
        historicalCountryId: dto.historicalCountryId,
        headquartersCityId: dto.headquartersCityId,
        organizationId: dto.organizationId,
      })
    } catch (e) {
      throw this.mapWriteError(e)
    }
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyWithRelations> {
    await this.findById(id) // 존재 여부 확인
    try {
      return await this.companyRepository.update(id, {
        name: dto.name,
        shortName: passthrough(dto.shortName),
        localName: passthrough(dto.localName),
        description: passthrough(dto.description),
        status: passthrough(dto.status),
        foundedAt: toDateInput(dto.foundedAt),
        dissolvedAt: toDateInput(dto.dissolvedAt),
        websiteUrl: passthrough(dto.websiteUrl),
        logoUrl: passthrough(dto.logoUrl),
        extra: toJsonInput(dto.extra),
        founderId: passthrough(dto.founderId),
        countryId: passthrough(dto.countryId),
        historicalCountryId: passthrough(dto.historicalCountryId),
        headquartersCityId: passthrough(dto.headquartersCityId),
        organizationId: passthrough(dto.organizationId),
      })
    } catch (e) {
      throw this.mapWriteError(e)
    }
  }

  async delete(id: string): Promise<void> {
    await this.findById(id) // 존재 여부 확인
    await this.companyRepository.delete(id)
  }

  /** 유니크 충돌(name+country, organizationId 1:1)을 409로 변환 */
  private mapWriteError(e: unknown): unknown {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(
        '이미 같은 이름·국가 조합 또는 조직 연결을 가진 기업이 있습니다',
      )
    }
    return e
  }
}
