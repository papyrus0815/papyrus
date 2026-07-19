import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { OrganizationType } from '@prisma/client'
import { OrganizationService } from '../application/organization.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { CreateOrganizationHierarchyDto } from './dto/create-organization-hierarchy.dto'
import type {
  OrganizationResponseDto,
  OrganizationHierarchyResponseDto,
  OrganizationTreeNodeResponseDto,
} from './dto/organization.response'
import type { OrganizationListFilter } from '../domain/organization.repository'

function toResponseDto(entity: {
  id: string
  name: string
  shortName: string | null
  localName: string | null
  type: OrganizationType
  scope: any
  description: string | null
  foundedDate: Date | null
  dissolvedDate: Date | null
  websiteUrl: string | null
  logoUrl: string | null
  ideology: string | null
  headquartersCityId: string | null
  countryId: string | null
  historicalCountryId: string | null
  createdAt: Date
  updatedAt: Date
}): OrganizationResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    shortName: entity.shortName,
    localName: entity.localName,
    type: entity.type,
    scope: entity.scope,
    description: entity.description,
    foundedDate: entity.foundedDate?.toISOString() ?? null,
    dissolvedDate: entity.dissolvedDate?.toISOString() ?? null,
    websiteUrl: entity.websiteUrl,
    logoUrl: entity.logoUrl,
    ideology: entity.ideology,
    headquartersCityId: entity.headquartersCityId,
    countryId: entity.countryId,
    historicalCountryId: entity.historicalCountryId,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}

function treeToDto(node: {
  id: string
  name: string
  shortName: string | null
  localName: string | null
  type: any
  scope: any
  description: string | null
  foundedDate: Date | null
  dissolvedDate: Date | null
  websiteUrl: string | null
  logoUrl: string | null
  ideology: string | null
  headquartersCityId: string | null
  countryId: string | null
  historicalCountryId: string | null
  createdAt: Date
  updatedAt: Date
  children: any[]
  parentIds: string[]
}): OrganizationTreeNodeResponseDto {
  return {
    ...toResponseDto(node),
    children: node.children.map((c) => treeToDto(c)),
    parentIds: node.parentIds,
  }
}

/**
 * 조직(행정기구·정당·국제기구 등) API — 로그인 필수.
 *
 * Organization은 `accountId`가 없는 공유 카탈로그라 소유자 단위 게이트는 걸 수 없다
 * (계정 스코프가 필요하면 스키마 마이그레이션 선행). 최소한 비로그인 쓰기는 막는다.
 * 읽기까지 클래스 레벨로 막아도 회귀가 없음을 확인: 조직 조회는 전부 로그인 화면
 * (조직 목록/폼·경력/학력 모달·정부 조직 탭) 안에서만 호출되고, 비로그인 라우트
 * (로그인·/services·/genealogy)는 이 API를 부르지 않는다.
 */
@ApiTags('organizations')
@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('type') type?: OrganizationType,
  ): Promise<OrganizationResponseDto[]> {
    const filter: OrganizationListFilter = {}
    if (countryId) filter.countryId = countryId
    if (historicalCountryId) filter.historicalCountryId = historicalCountryId
    if (type) filter.type = type
    const list = await this.organizationService.list(filter)
    return list.map(toResponseDto)
  }

  @Get('tree')
  async getTree(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('type') type?: OrganizationType,
  ): Promise<OrganizationTreeNodeResponseDto[]> {
    const filter: OrganizationListFilter = {}
    if (countryId) filter.countryId = countryId
    if (historicalCountryId) filter.historicalCountryId = historicalCountryId
    if (type) filter.type = type
    const tree = await this.organizationService.getTree(filter)
    return tree.map(treeToDto)
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<OrganizationResponseDto> {
    const org = await this.organizationService.getById(id)
    return toResponseDto(org)
  }

  @Post()
  async create(
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationService.create({
      name: dto.name,
      shortName: dto.shortName ?? null,
      localName: dto.localName ?? null,
      type: dto.type,
      scope: dto.scope ?? null,
      description: dto.description ?? null,
      foundedDate: dto.foundedDate ? new Date(dto.foundedDate) : null,
      dissolvedDate: dto.dissolvedDate ? new Date(dto.dissolvedDate) : null,
      websiteUrl: dto.websiteUrl ?? null,
      logoUrl: dto.logoUrl ?? null,
      ideology: dto.ideology ?? null,
      headquartersCityId: dto.headquartersCityId ?? null,
      countryId: dto.countryId ?? null,
      historicalCountryId: dto.historicalCountryId ?? null,
    })
    return toResponseDto(org)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationService.update(id, {
      name: dto.name,
      shortName: dto.shortName,
      localName: dto.localName,
      type: dto.type,
      scope: dto.scope,
      description: dto.description,
      foundedDate: dto.foundedDate ? new Date(dto.foundedDate) : undefined,
      dissolvedDate: dto.dissolvedDate ? new Date(dto.dissolvedDate) : undefined,
      websiteUrl: dto.websiteUrl,
      logoUrl: dto.logoUrl,
      ideology: dto.ideology,
      headquartersCityId: dto.headquartersCityId,
      countryId: dto.countryId,
      historicalCountryId: dto.historicalCountryId,
    })
    return toResponseDto(org)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.organizationService.delete(id)
  }

  @Get(':id/children')
  async getChildren(
    @Param('id') id: string,
  ): Promise<OrganizationHierarchyResponseDto[]> {
    const list = await this.organizationService.getChildren(id)
    return list.map((h) => ({
      id: h.id,
      parentOrganizationId: h.parentOrganizationId,
      childOrganizationId: h.childOrganizationId,
      relationType: h.relationType,
      startDate: h.startDate?.toISOString() ?? null,
      endDate: h.endDate?.toISOString() ?? null,
      notes: h.notes,
    }))
  }

  @Get(':id/parents')
  async getParents(
    @Param('id') id: string,
  ): Promise<OrganizationHierarchyResponseDto[]> {
    const list = await this.organizationService.getParents(id)
    return list.map((h) => ({
      id: h.id,
      parentOrganizationId: h.parentOrganizationId,
      childOrganizationId: h.childOrganizationId,
      relationType: h.relationType,
      startDate: h.startDate?.toISOString() ?? null,
      endDate: h.endDate?.toISOString() ?? null,
      notes: h.notes,
    }))
  }

  @Post('hierarchy')
  async addHierarchy(
    @Body() dto: CreateOrganizationHierarchyDto,
  ): Promise<OrganizationHierarchyResponseDto> {
    const h = await this.organizationService.addHierarchy({
      parentOrganizationId: dto.parentOrganizationId,
      childOrganizationId: dto.childOrganizationId,
      relationType: dto.relationType,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      notes: dto.notes ?? null,
    })
    return {
      id: h.id,
      parentOrganizationId: h.parentOrganizationId,
      childOrganizationId: h.childOrganizationId,
      relationType: h.relationType,
      startDate: h.startDate?.toISOString() ?? null,
      endDate: h.endDate?.toISOString() ?? null,
      notes: h.notes,
    }
  }

  @Delete('hierarchy/:parentId/:childId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeHierarchy(
    @Param('parentId') parentId: string,
    @Param('childId') childId: string,
  ): Promise<void> {
    await this.organizationService.removeHierarchy(parentId, childId)
  }
}
