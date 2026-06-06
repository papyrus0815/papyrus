import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  IOrganizationRepository,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationEntity,
  OrganizationListFilter,
  OrganizationTreeNode,
  CreateOrganizationHierarchyData,
  OrganizationHierarchyEntity,
} from '../domain/organization.repository'
import { OrganizationPrismaRepository } from '../infrastructure/organization.prisma.repository'
import { EventMethod } from '@prisma/client'
import { NotificationService } from '../../notification/application/notification.service'
import { dateYearRangePreview } from '../../shared/notification-preview.util'

@Injectable()
export class OrganizationService {
  constructor(
    private readonly repository: OrganizationPrismaRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async getById(id: string): Promise<OrganizationEntity> {
    const org = await this.repository.findById(id)
    if (!org) {
      throw new NotFoundException(`Organization with id ${id} not found`)
    }
    return org
  }

  async list(filter: OrganizationListFilter): Promise<OrganizationEntity[]> {
    return this.repository.findMany(filter)
  }

  async create(data: CreateOrganizationData): Promise<OrganizationEntity> {
    const org = await this.repository.create(data)
    await this.notificationService.notifyOrganization(
      org.name,
      EventMethod.CREATE,
      org.id,
      dateYearRangePreview(org.foundedDate, org.dissolvedDate),
    )
    return org
  }

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<OrganizationEntity> {
    await this.getById(id)
    const org = await this.repository.update(id, data)
    await this.notificationService.notifyOrganization(
      org.name,
      EventMethod.UPDATE,
      org.id,
      dateYearRangePreview(org.foundedDate, org.dissolvedDate),
    )
    return org
  }

  async delete(id: string): Promise<void> {
    const org = await this.getById(id)
    await this.repository.delete(id)
    await this.notificationService.notifyOrganization(
      org.name,
      EventMethod.DELETE,
      id,
      dateYearRangePreview(org.foundedDate, org.dissolvedDate),
    )
  }

  async getTree(filter: OrganizationListFilter): Promise<OrganizationTreeNode[]> {
    return this.repository.findTree(filter)
  }

  async addHierarchy(
    data: CreateOrganizationHierarchyData,
  ): Promise<OrganizationHierarchyEntity> {
    return this.repository.addHierarchy(data)
  }

  async removeHierarchy(
    parentId: string,
    childId: string,
  ): Promise<void> {
    await this.repository.removeHierarchy(parentId, childId)
  }

  async getChildren(
    organizationId: string,
  ): Promise<OrganizationHierarchyEntity[]> {
    await this.getById(organizationId)
    return this.repository.findChildren(organizationId)
  }

  async getParents(
    organizationId: string,
  ): Promise<OrganizationHierarchyEntity[]> {
    await this.getById(organizationId)
    return this.repository.findParents(organizationId)
  }
}
