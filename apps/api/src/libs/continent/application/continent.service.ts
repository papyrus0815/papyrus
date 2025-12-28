import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { ContinentRepository } from '../domain/continent.repository'
import { Continent } from '../domain/continent.entity'

@Injectable()
export class ContinentService {
  constructor(
    @Inject('ContinentRepository')
    private readonly continents: ContinentRepository,
  ) {}

  async getAllContinents(): Promise<Continent[]> {
    return this.continents.findAll()
  }

  async getContinentById(id: string): Promise<Continent> {
    const continent = await this.continents.findById(id)
    if (!continent) {
      throw new NotFoundException(`Continent with id ${id} not found`)
    }
    
return continent
  }

  async createContinent(data: Omit<Continent, 'id'>): Promise<Continent> {
    // 중복 체크
    const existing = await this.continents.findByName(data.name)
    if (existing) {
      throw new ConflictException(
        `Continent with name ${data.name} already exists`,
      )
    }

    return this.continents.create(data)
  }

  async updateContinent(
    id: string,
    data: Partial<Omit<Continent, 'id'>>,
  ): Promise<Continent> {
    // 존재 여부 확인
    await this.getContinentById(id)

    // 이름 변경 시 중복 체크
    if (data.name) {
      const existing = await this.continents.findByName(data.name)
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Continent with name ${data.name} already exists`,
        )
      }
    }

    return this.continents.update(id, data)
  }

  async deleteContinent(id: string): Promise<void> {
    // 존재 여부 확인
    await this.getContinentById(id)
    await this.continents.delete(id)
  }
}
