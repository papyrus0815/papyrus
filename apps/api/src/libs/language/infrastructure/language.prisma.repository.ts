import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { Language } from '../domain/language.entity'
import { LanguageRepository } from '../domain/language.repository'

@Injectable()
export class LanguagePrismaRepository implements LanguageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Language[]> {
    const rows = await this.prisma.language.findMany({
      orderBy: { code: 'asc' },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async findById(id: string): Promise<Language | null> {
    const row = await this.prisma.language.findUnique({ where: { id } })
    return row ? this.toEntity(row) : null
  }

  private toEntity(data: {
    id: string
    code: string
    name: string
    originalName: string | null
  }): Language {
    return new Language({
      id: data.id,
      code: data.code,
      name: data.name,
      originalName: data.originalName,
    })
  }
}
