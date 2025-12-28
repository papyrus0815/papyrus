import { Injectable, NotFoundException } from '@nestjs/common'
import {
  IHistoricalCountryRepository,
  CreateHistoricalCountryData,
  UpdateHistoricalCountryData,
} from '../domain/historical-country.repository'
import { HistoricalCountry } from '../domain/historical-country.entity'
import { HistoricalCountryPrismaRepository } from '../infrastructure/historical-country.prisma.repository'

@Injectable()
export class HistoricalCountryService {
  private readonly repository: IHistoricalCountryRepository

  constructor(repository: HistoricalCountryPrismaRepository) {
    this.repository = repository
  }

  /**
   * 모든 역사적 국가 조회
   */
  async getAllHistoricalCountries(): Promise<HistoricalCountry[]> {
    return await this.repository.findAll()
  }

  /**
   * ID로 역사적 국가 조회
   */
  async getHistoricalCountryById(id: string): Promise<HistoricalCountry> {
    const country = await this.repository.findById(id)
    if (!country) {
      throw new NotFoundException(`Historical country with id ${id} not found`)
    }
    return country
  }

  /**
   * 역사적 국가 생성
   */
  async createHistoricalCountry(
    data: CreateHistoricalCountryData,
  ): Promise<HistoricalCountry> {
    return await this.repository.create(data)
  }

  /**
   * 역사적 국가 수정
   */
  async updateHistoricalCountry(
    id: string,
    data: UpdateHistoricalCountryData,
  ): Promise<HistoricalCountry> {
    // 존재 여부 확인
    await this.getHistoricalCountryById(id)
    return await this.repository.update(id, data)
  }

  /**
   * 역사적 국가 삭제
   */
  async deleteHistoricalCountry(id: string): Promise<void> {
    // 존재 여부 확인
    await this.getHistoricalCountryById(id)
    await this.repository.delete(id)
  }
}
