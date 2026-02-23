import { Injectable, NotFoundException } from '@nestjs/common'
import { EventMethod } from '@prisma/client'
import {
  IHistoricalCountryRepository,
  CreateHistoricalCountryData,
  UpdateHistoricalCountryData,
} from '../domain/historical-country.repository'
import { HistoricalCountry } from '../domain/historical-country.entity'
import { HistoricalCountryPrismaRepository } from '../infrastructure/historical-country.prisma.repository'
import { NotificationService } from '../../notification/application/notification.service'
import { UploadService } from '../../shared/upload/upload.service'

@Injectable()
export class HistoricalCountryService {
  private readonly repository: IHistoricalCountryRepository

  constructor(
    repository: HistoricalCountryPrismaRepository,
    private readonly notificationService: NotificationService,
    private readonly uploadService: UploadService,
  ) {
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
   * 역사적 국가에 연결된 현대 국가 ID 목록 조회
   */
  async getModernCountryIdsByHistoricalCountryId(
    id: string,
  ): Promise<string[]> {
    return this.repository.findModernCountryIdsByHistoricalCountryId(id)
  }

  /**
   * 역사적 국가 생성
   */
  async createHistoricalCountry(
    data: CreateHistoricalCountryData,
  ): Promise<HistoricalCountry> {
    const country = await this.repository.create(data)
    await this.notificationService.notifyHistoricalCountry(
      country.name,
      EventMethod.CREATE,
      country.id,
      country.enName ?? undefined,
    )
    return country
  }

  /**
   * 역사적 국가 수정
   */
  async updateHistoricalCountry(
    id: string,
    data: UpdateHistoricalCountryData,
  ): Promise<HistoricalCountry> {
    const current = await this.getHistoricalCountryById(id)
    const newThumbnail = data.thumbnailUrl ?? null
    const isClearingOrReplacing =
      newThumbnail !== (current.thumbnailUrl ?? null)
    if (isClearingOrReplacing && current.thumbnailUrl) {
      await this.uploadService.deleteFileByUrl(current.thumbnailUrl)
    }
    const country = await this.repository.update(id, data)
    await this.notificationService.notifyHistoricalCountry(
      country.name,
      EventMethod.UPDATE,
      country.id,
      country.enName ?? undefined,
    )
    return country
  }

  /**
   * 역사적 국가 삭제
   */
  async deleteHistoricalCountry(id: string): Promise<void> {
    const country = await this.getHistoricalCountryById(id)
    await this.repository.delete(id)
    await this.notificationService.notifyHistoricalCountry(
      country.name,
      EventMethod.DELETE,
    )
  }
}
