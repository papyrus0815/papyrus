import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { EventMethod } from '@prisma/client'
import {
  IHistoricalCountryRepository,
  CreateHistoricalCountryData,
  UpdateHistoricalCountryData,
} from '../domain/historical-country.repository'
import { HistoricalCountry } from '../domain/historical-country.entity'
import { HistoricalCountryPrismaRepository } from '../infrastructure/historical-country.prisma.repository'
import type {
  IHistoricalCountryTransitionRepository,
  HistoricalCountryTransitionRecord,
  CreateTransitionData,
  UpdateTransitionData,
} from '../domain/historical-country-transition.repository'
import type {
  IHistoricalCountryMembershipRepository,
  HistoricalCountryMembershipRecord,
  CreateMembershipData,
  UpdateMembershipData,
} from '../domain/historical-country-membership.repository'
import type {
  IHistoricalCountryRelationRepository,
  HistoricalCountryRelationRecord,
  CreateRelationData,
  UpdateRelationData,
} from '../domain/historical-country-relation.repository'
import { HistoricalCountryTransitionPrismaRepository } from '../infrastructure/historical-country-transition.prisma.repository'
import { HistoricalCountryMembershipPrismaRepository } from '../infrastructure/historical-country-membership.prisma.repository'
import { HistoricalCountryRelationPrismaRepository } from '../infrastructure/historical-country-relation.prisma.repository'
import { NotificationService } from '../../notification/application/notification.service'
import { UploadService } from '../../shared/upload/upload.service'

@Injectable()
export class HistoricalCountryService {
  private readonly repository: IHistoricalCountryRepository
  private readonly transitionRepository: IHistoricalCountryTransitionRepository
  private readonly membershipRepository: IHistoricalCountryMembershipRepository
  private readonly relationRepository: IHistoricalCountryRelationRepository

  constructor(
    repository: HistoricalCountryPrismaRepository,
    transitionRepository: HistoricalCountryTransitionPrismaRepository,
    membershipRepository: HistoricalCountryMembershipPrismaRepository,
    relationRepository: HistoricalCountryRelationPrismaRepository,
    private readonly notificationService: NotificationService,
    private readonly uploadService: UploadService,
  ) {
    this.repository = repository
    this.transitionRepository = transitionRepository
    this.membershipRepository = membershipRepository
    this.relationRepository = relationRepository
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
   * 이 국가(전임)의 후임 역사적 국가 ID 목록 조회
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

  // --- 계승/변천 (Transition)

  /**
   * 해당 역사적 국가가 관여된 계승·변천 목록 조회 (전임 또는 후임)
   */
  async getTransitionsByHistoricalCountryId(
    historicalCountryId: string,
    accountId?: string,
  ): Promise<HistoricalCountryTransitionRecord[]> {
    const country = await this.repository.findById(historicalCountryId, accountId)
    if (!country) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 역사적 국가만 조회할 수 있습니다.')
        : new NotFoundException(`Historical country with id ${historicalCountryId} not found`)
    }
    return this.transitionRepository.findManyByHistoricalCountryId(historicalCountryId)
  }

  /**
   * 계승/변천 생성 (전임·후임 국가 모두 본인 소유여야 함)
   */
  async createTransition(
    data: CreateTransitionData,
    accountId?: string,
  ): Promise<HistoricalCountryTransitionRecord> {
    if (accountId) {
      const [pred, succ] = await Promise.all([
        this.repository.findById(data.predecessorId, accountId),
        this.repository.findById(data.successorId, accountId),
      ])
      if (!pred || !succ) {
        throw new ForbiddenException(
          '전임·후임 국가는 모두 본인이 등록한 역사적 국가여야 합니다.',
        )
      }
    }
    return this.transitionRepository.create({
      predecessorId: data.predecessorId,
      successorId: data.successorId,
      eventType: data.eventType,
    })
  }

  /**
   * 계승/변천 수정 (해당 계승에 관여된 국가 중 하나라도 본인 소유여야 함)
   */
  async updateTransition(
    transitionId: string,
    data: UpdateTransitionData,
    accountId?: string,
  ): Promise<HistoricalCountryTransitionRecord> {
    const existing = await this.transitionRepository.findById(transitionId)
    if (!existing) {
      throw new NotFoundException(`Transition with id ${transitionId} not found`)
    }
    if (accountId) {
      const [pred, succ] = await Promise.all([
        this.repository.findById(existing.predecessorId, accountId),
        this.repository.findById(existing.successorId, accountId),
      ])
      if (!pred && !succ) {
        throw new ForbiddenException(
          '본인이 등록한 역사적 국가에 속한 계승 관계만 수정할 수 있습니다.',
        )
      }
    }
    return this.transitionRepository.update(transitionId, {
      ...(data.eventType !== undefined && { eventType: data.eventType }),
    })
  }

  /**
   * 계승/변천 삭제
   */
  async deleteTransition(transitionId: string, accountId?: string): Promise<void> {
    const existing = await this.transitionRepository.findById(transitionId)
    if (!existing) {
      throw new NotFoundException(`Transition with id ${transitionId} not found`)
    }
    if (accountId) {
      const [pred, succ] = await Promise.all([
        this.repository.findById(existing.predecessorId, accountId),
        this.repository.findById(existing.successorId, accountId),
      ])
      if (!pred && !succ) {
        throw new ForbiddenException(
          '본인이 등록한 역사적 국가에 속한 계승 관계만 삭제할 수 있습니다.',
        )
      }
    }
    await this.transitionRepository.delete(transitionId)
  }

  // --- 소속/구성 (Membership)

  async getMembershipsByHistoricalCountryId(
    historicalCountryId: string,
    accountId?: string,
  ): Promise<HistoricalCountryMembershipRecord[]> {
    await this.getHistoricalCountryById(historicalCountryId, accountId)
    return this.membershipRepository.findManyByHistoricalCountryId(historicalCountryId)
  }

  async createMembership(
    data: CreateMembershipData,
    accountId?: string,
  ): Promise<HistoricalCountryMembershipRecord> {
    if (accountId) {
      const [parent, member] = await Promise.all([
        this.repository.findById(data.historicalCountryId, accountId),
        this.repository.findById(data.memberCountryId, accountId),
      ])
      if (!parent || !member) {
        throw new ForbiddenException(
          '상위·하위 국가는 모두 본인이 등록한 역사적 국가여야 합니다.',
        )
      }
    }
    return this.membershipRepository.create(data)
  }

  async updateMembership(
    membershipId: string,
    data: UpdateMembershipData,
    accountId?: string,
  ): Promise<HistoricalCountryMembershipRecord> {
    const existing = await this.membershipRepository.findById(membershipId)
    if (!existing) {
      throw new NotFoundException(`Membership with id ${membershipId} not found`)
    }
    if (accountId) {
      const [parent, member] = await Promise.all([
        this.repository.findById(existing.historicalCountryId, accountId),
        this.repository.findById(existing.memberCountryId, accountId),
      ])
      if (!parent && !member) {
        throw new ForbiddenException(
          '본인이 등록한 역사적 국가에 속한 소속 관계만 수정할 수 있습니다.',
        )
      }
    }
    return this.membershipRepository.update(membershipId, data)
  }

  async deleteMembership(membershipId: string, accountId?: string): Promise<void> {
    const existing = await this.membershipRepository.findById(membershipId)
    if (!existing) {
      throw new NotFoundException(`Membership with id ${membershipId} not found`)
    }
    if (accountId) {
      const [parent, member] = await Promise.all([
        this.repository.findById(existing.historicalCountryId, accountId),
        this.repository.findById(existing.memberCountryId, accountId),
      ])
      if (!parent && !member) {
        throw new ForbiddenException(
          '본인이 등록한 역사적 국가에 속한 소속 관계만 삭제할 수 있습니다.',
        )
      }
    }
    await this.membershipRepository.delete(membershipId)
  }

  // --- 국가 관계 (Relation)

  async getRelationsByHistoricalCountryId(
    historicalCountryId: string,
    accountId?: string,
  ): Promise<HistoricalCountryRelationRecord[]> {
    await this.getHistoricalCountryById(historicalCountryId, accountId)
    return this.relationRepository.findManyByHistoricalCountryId(historicalCountryId)
  }

  async createRelation(
    data: CreateRelationData,
    accountId?: string,
  ): Promise<HistoricalCountryRelationRecord> {
    if (accountId) {
      const [subj, obj] = await Promise.all([
        this.repository.findById(data.subjectCountryId, accountId),
        this.repository.findById(data.objectCountryId, accountId),
      ])
      if (!subj || !obj) {
        throw new ForbiddenException(
          '관계의 주체·대상 국가는 모두 본인이 등록한 역사적 국가여야 합니다.',
        )
      }
    }
    return this.relationRepository.create({
      ...data,
      startDate: data.startDate ?? undefined,
      endDate: data.endDate ?? undefined,
    })
  }

  async updateRelation(
    relationId: string,
    data: UpdateRelationData,
    accountId?: string,
  ): Promise<HistoricalCountryRelationRecord> {
    const existing = await this.relationRepository.findById(relationId)
    if (!existing) {
      throw new NotFoundException(`Relation with id ${relationId} not found`)
    }
    if (accountId) {
      const [subj, obj] = await Promise.all([
        this.repository.findById(existing.subjectCountryId, accountId),
        this.repository.findById(existing.objectCountryId, accountId),
      ])
      if (!subj && !obj) {
        throw new ForbiddenException(
          '본인이 등록한 역사적 국가에 속한 관계만 수정할 수 있습니다.',
        )
      }
    }
    return this.relationRepository.update(relationId, data)
  }

  async deleteRelation(relationId: string, accountId?: string): Promise<void> {
    const existing = await this.relationRepository.findById(relationId)
    if (!existing) {
      throw new NotFoundException(`Relation with id ${relationId} not found`)
    }
    if (accountId) {
      const [subj, obj] = await Promise.all([
        this.repository.findById(existing.subjectCountryId, accountId),
        this.repository.findById(existing.objectCountryId, accountId),
      ])
      if (!subj && !obj) {
        throw new ForbiddenException(
          '본인이 등록한 역사적 국가에 속한 관계만 삭제할 수 있습니다.',
        )
      }
    }
    await this.relationRepository.delete(relationId)
  }
}
