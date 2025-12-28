import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Continent } from '../domain/continent.entity'
import { ContinentRepository } from '../domain/continent.repository'

@Injectable()
export class ContinentPrismaRepository implements ContinentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<Continent[]> {
    const continents = await this.prisma.continent.findMany({
      orderBy: { name: 'asc' },
    })
    return continents.map((continent) => this.toEntity(continent))
  }

  async findById(id: string): Promise<Continent | null> {
    const continent = await this.prisma.continent.findUnique({
      where: { id },
    })
    return continent ? this.toEntity(continent) : null
  }

  async findByName(name: string): Promise<Continent | null> {
    const continent = await this.prisma.continent.findUnique({
      where: { name },
    })
    return continent ? this.toEntity(continent) : null
  }

  async create(data: Omit<Continent, 'id'>): Promise<Continent> {
    const continent = await this.prisma.continent.create({
      data: {
        name: data.name,
        enName: data.enName,
        isoCode: data.isoCode,
        areaSqKm: data.areaSqKm,
        population: data.population,
        countryCount: data.countryCount,
        timeZones: data.timeZones,
        parentId: data.parentId,
      },
    })
    return this.toEntity(continent)
  }

  async update(
    id: string,
    data: Partial<Omit<Continent, 'id'>>,
  ): Promise<Continent> {
    const continent = await this.prisma.continent.update({
      where: { id },
      data: {
        name: data.name,
        enName: data.enName,
        isoCode: data.isoCode,
        areaSqKm: data.areaSqKm,
        population: data.population,
        countryCount: data.countryCount,
        timeZones: data.timeZones,
        parentId: data.parentId,
      },
    })
    return this.toEntity(continent)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.continent.delete({
      where: { id },
    })
  }

  private toEntity(data: any): Continent {
    return new Continent({
      id: data.id,
      name: data.name,
      enName: data.enName,
      isoCode: data.isoCode,
      areaSqKm: data.areaSqKm ? Number(data.areaSqKm) : null,
      population: data.population,
      countryCount: data.countryCount,
      timeZones: data.timeZones,
      parentId: data.parentId,
    })
  }
}
