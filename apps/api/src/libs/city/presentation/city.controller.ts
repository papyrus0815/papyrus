import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '@prisma/prisma.service'

export type CityResponseDto = {
  id: string
  name: string
  countryId: string
  administrativeDivisionId?: string | null
  population?: number | null
  areaSqKm?: number | string | null
}

@ApiTags('cities')
@Controller('cities')
export class CityController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 도시 목록 조회 (선택: countryId로 필터)
   */
  @Get()
  async getCities(
    @Query('countryId') countryId?: string,
    @Query('administrativeDivisionId') administrativeDivisionId?: string,
  ): Promise<CityResponseDto[]> {
    const list = await this.prisma.city.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(administrativeDivisionId ? { administrativeDivisionId } : {}),
      },
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
    })
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      countryId: c.countryId,
      administrativeDivisionId: c.administrativeDivisionId ?? null,
      population: c.population != null ? Number(c.population) : null,
      areaSqKm: c.areaSqKm != null ? String(c.areaSqKm) : null,
    }))
  }
}
