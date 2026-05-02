import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { Currency } from '../domain/currency.entity'
import { CurrencyRepository } from '../domain/currency.repository'

@Injectable()
export class CurrencyPrismaRepository implements CurrencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Currency[]> {
    const rows = await this.prisma.currency.findMany({
      orderBy: { code: 'asc' },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async findById(id: string): Promise<Currency | null> {
    const row = await this.prisma.currency.findUnique({ where: { id } })
    return row ? this.toEntity(row) : null
  }

  private toEntity(data: {
    id: string
    code: string
    name: string
    symbol: string
    thumbnailUrl: string | null
  }): Currency {
    return new Currency({
      id: data.id,
      code: data.code,
      name: data.name,
      symbol: data.symbol,
      thumbnailUrl: data.thumbnailUrl,
    })
  }
}
