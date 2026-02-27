import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
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
   * 역사적 국가 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  async getAllHistoricalCountries(accountId?: string): Promise<HistoricalCountry[]> {
    return await this.repository.findAll(accountId)
  }

  /**
   * ID로 역사적 국가 조회 (accountId 있으면 해당 계정 소유만)
   */
  async getHistoricalCountryById(id: string, accountId?: string): Promise<HistoricalCountry> {
    const country = await this.repository.findById(id, accountId)
    if (!country) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 역사적 국가만 조회할 수 있습니다.')
        : new NotFoundException(`Historical country with id ${id} not found`)
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
   * 역사적 국가가 소속된 상위 역사적 국가 ID 목록 조회
   */
  async getParentHistoricalCountryIdsByMemberId(
    memberCountryId: string,
  ): Promise<string[]> {
    return this.repository.findParentHistoricalCountryIdsByMemberId(
      memberCountryId,
    )
  }

  /**
   * 역사적 국가 생성 (accountId 있으면 소유자로 저장)
   */
  async createHistoricalCountry(
    data: CreateHistoricalCountryData,
    accountId?: string,
  ): Promise<HistoricalCountry> {
    const createData = accountId != null
      ? { ...data, accountId }
      : data
    const country = await this.repository.create(createData)
    await this.notificationService.notifyHistoricalCountry(
      country.name,
      EventMethod.CREATE,
      country.id,
      country.enName ?? undefined,
    )
    return country
  }

  /**
   * 역사적 국가 수정 (accountId 있으면 소유자만 가능)
   */
  async updateHistoricalCountry(
    id: string,
    data: UpdateHistoricalCountryData,
    accountId?: string,
  ): Promise<HistoricalCountry> {
    const current = await this.repository.findById(id, accountId)
    if (!current) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 역사적 국가만 수정할 수 있습니다.')
        : new NotFoundException(`Historical country with id ${id} not found`)
    }
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
   * 역사적 국가 삭제 (accountId 있으면 소유자만 가능)
   */
  async deleteHistoricalCountry(id: string, accountId?: string): Promise<void> {
    const country = await this.repository.findById(id, accountId)
    if (!country) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 역사적 국가만 삭제할 수 있습니다.')
        : new NotFoundException(`Historical country with id ${id} not found`)
    }
    await this.repository.delete(id)
    await this.notificationService.notifyHistoricalCountry(
      country.name,
      EventMethod.DELETE,
    )
  }
}
