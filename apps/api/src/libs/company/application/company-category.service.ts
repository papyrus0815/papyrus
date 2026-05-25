import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  CompanyCategoryRepository,
  type CompanyCategoryWithRelations,
} from '../infrastructure/company-category.repository'
import type {
  CreateCompanyCategoryDto,
  UpdateCompanyCategoryDto,
} from '../presentation/dto'

@Injectable()
export class CompanyCategoryService {
  constructor(private readonly repo: CompanyCategoryRepository) {}

  findAll(): Promise<CompanyCategoryWithRelations[]> {
    return this.repo.findAll()
  }

  async findById(id: string): Promise<CompanyCategoryWithRelations> {
    const category = await this.repo.findById(id)
    if (!category) {
      throw new NotFoundException(`CompanyCategory with ID ${id} not found`)
    }
    return category
  }

  async create(
    dto: CreateCompanyCategoryDto,
  ): Promise<CompanyCategoryWithRelations> {
    try {
      return await this.repo.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
      })
    } catch (e) {
      throw this.mapWriteError(e)
    }
  }

  async update(
    id: string,
    dto: UpdateCompanyCategoryDto,
  ): Promise<CompanyCategoryWithRelations> {
    await this.findById(id) // 존재 여부 확인
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('카테고리는 자기 자신을 상위로 가질 수 없습니다')
    }
    try {
      return await this.repo.update(id, {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
      })
    } catch (e) {
      throw this.mapWriteError(e)
    }
  }

  async delete(id: string): Promise<void> {
    await this.findById(id) // 존재 여부 확인
    await this.repo.delete(id)
  }

  /** 유니크 충돌(slug, parentId+name)을 409로 변환 */
  private mapWriteError(e: unknown): unknown {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(
        '이미 같은 슬러그 또는 상위·이름 조합을 가진 카테고리가 있습니다',
      )
    }
    return e
  }
}
