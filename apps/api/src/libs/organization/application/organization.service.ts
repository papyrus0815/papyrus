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

@Injectable()
export class OrganizationService {
  constructor(
    private readonly repository: OrganizationPrismaRepository,
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
    return this.repository.create(data)
  }

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<OrganizationEntity> {
    await this.getById(id)
    return this.repository.update(id, data)
  }

  async delete(id: string): Promise<void> {
    await this.getById(id)
    await this.repository.delete(id)
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
