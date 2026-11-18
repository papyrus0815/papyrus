import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { OrganizationScope, OrganizationType } from '@prisma/client'
import { OrganizationService } from '../application/organization.service'
import {
  CreateOrganizationDto,
  CreateOrganizationMemberDto,
  CreateOrganizationCountryMembershipDto,
  UpdateOrganizationCountryMembershipDto,
} from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { CreateOrganizationHierarchyDto } from './dto/create-organization-hierarchy.dto'
import type {
  OrganizationResponseDto,
  OrganizationHierarchyResponseDto,
  OrganizationTreeNodeResponseDto,
  OrganizationMemberResponseDto,
  OrganizationCountryMembershipResponseDto,
  CountryOrganizationMembershipResponseDto,
  OrganizationRelatedEventResponseDto,
} from './dto/organization.response'
import type {
  CountryOrganizationMembershipEntity,
  OrganizationCountryMembershipEntity,
  OrganizationEntity,
  OrganizationListFilter,
  OrganizationTreeNode,
} from '../domain/organization.repository'

function toResponseDto(entity: OrganizationEntity): OrganizationResponseDto {
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
    headquartersCity: entity.headquartersCity ?? null,
    predecessorOrganizationId: entity.predecessorOrganizationId ?? null,
    predecessor: entity.predecessor ?? null,
    successors: entity.successors ?? [],
    countryId: entity.countryId,
    historicalCountryId: entity.historicalCountryId,
    country: entity.country ?? null,
    historicalCountry: entity.historicalCountry ?? null,
    countryMemberCount: entity.countryMemberCount ?? 0,
    eventSeriesCount: entity.eventSeriesCount ?? 0,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}

function treeToDto(node: OrganizationTreeNode): OrganizationTreeNodeResponseDto {
  return {
    ...toResponseDto(node),
    children: node.children.map((c) => treeToDto(c)),
    parentIds: node.parentIds,
  }
}

function toCountryMembershipDto(
  row: OrganizationCountryMembershipEntity,
): OrganizationCountryMembershipResponseDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    countryId: row.countryId,
    historicalCountryId: row.historicalCountryId,
    role: row.role,
    startEra: row.startEra,
    startYear: row.startYear,
    startMonth: row.startMonth,
    startDay: row.startDay,
    startDate: row.startDate?.toISOString() ?? null,
    endEra: row.endEra,
    endYear: row.endYear,
    endMonth: row.endMonth,
    endDay: row.endDay,
    endDate: row.endDate?.toISOString() ?? null,
    sortOrder: row.sortOrder,
    notes: row.notes,
    statusHistory: row.statusHistory ?? null,
    country: row.country,
    historicalCountry: row.historicalCountry,
  }
}

function toCountryOrganizationMembershipDto(
  row: CountryOrganizationMembershipEntity,
): CountryOrganizationMembershipResponseDto {
  return {
    ...toCountryMembershipDto(row),
    organization: {
      id: row.organization.id,
      name: row.organization.name,
      shortName: row.organization.shortName,
      type: row.organization.type,
      scope: row.organization.scope,
      logoUrl: row.organization.logoUrl,
      foundedDate: row.organization.foundedDate?.toISOString() ?? null,
      dissolvedDate: row.organization.dissolvedDate?.toISOString() ?? null,
      countryMemberCount: row.organization.countryMemberCount,
      eventSeriesCount: row.organization.eventSeriesCount,
    },
  }
}

const VALID_ORG_TYPES = new Set<string>(Object.values(OrganizationType))

function parseTypesParam(raw?: string): OrganizationType[] | undefined {
  if (!raw) return undefined
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is OrganizationType => VALID_ORG_TYPES.has(s))
  return parsed.length > 0 ? parsed : undefined
}

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
    @Query('types') types?: string,
    @Query('scope') scope?: OrganizationScope,
    @Query('excludeCompanies') excludeCompanies?: string,
    @Query('excludePoliticalParties') excludePoliticalParties?: string,
    @Query('excludeGovernmentAgencies') excludeGovernmentAgencies?: string,
  ): Promise<OrganizationResponseDto[]> {
    const filter: OrganizationListFilter = {}
    if (countryId) filter.countryId = countryId
    if (historicalCountryId) filter.historicalCountryId = historicalCountryId
    const parsedTypes = parseTypesParam(types)
    if (parsedTypes) filter.types = parsedTypes
    else if (type) filter.type = type
    if (excludeCompanies === 'true' || excludeCompanies === '1') {
      filter.excludeCompanies = true
    }
    if (excludePoliticalParties === 'true' || excludePoliticalParties === '1') {
      filter.excludePoliticalParties = true
    }
    if (excludeGovernmentAgencies === 'true' || excludeGovernmentAgencies === '1') {
      filter.excludeGovernmentAgencies = true
    }
    if (scope) filter.scope = scope
    const list = await this.organizationService.list(filter)
    return list.map(toResponseDto)
  }

  @Get('tree')
  async getTree(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('type') type?: OrganizationType,
    @Query('types') types?: string,
    @Query('scope') scope?: OrganizationScope,
    @Query('excludeCompanies') excludeCompanies?: string,
    @Query('excludePoliticalParties') excludePoliticalParties?: string,
    @Query('excludeGovernmentAgencies') excludeGovernmentAgencies?: string,
  ): Promise<OrganizationTreeNodeResponseDto[]> {
    const filter: OrganizationListFilter = {}
    if (countryId) filter.countryId = countryId
    if (historicalCountryId) filter.historicalCountryId = historicalCountryId
    const parsedTypes = parseTypesParam(types)
    if (parsedTypes) filter.types = parsedTypes
    else if (type) filter.type = type
    if (excludeCompanies === 'true' || excludeCompanies === '1') {
      filter.excludeCompanies = true
    }
    if (excludePoliticalParties === 'true' || excludePoliticalParties === '1') {
      filter.excludePoliticalParties = true
    }
    if (excludeGovernmentAgencies === 'true' || excludeGovernmentAgencies === '1') {
      filter.excludeGovernmentAgencies = true
    }
    if (scope) filter.scope = scope
    const tree = await this.organizationService.getTree(filter)
    return tree.map(treeToDto)
  }

  /**
   * 특정 국가(현대/역사)가 가입·참여한 국제기구·다자협의체·동맹 목록 조회
   * (반드시 @Get(':id')보다 앞에 선언)
   */
  @Get('country-memberships')
  async getMembershipsByCountry(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<CountryOrganizationMembershipResponseDto[]> {
    const rows = await this.organizationService.getMembershipsByCountry({
      countryId,
      historicalCountryId,
    })
    return rows.map(toCountryOrganizationMembershipDto)
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<OrganizationResponseDto> {
    const org = await this.organizationService.getById(id)
    return toResponseDto(org)
  }

  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
  ): Promise<OrganizationMemberResponseDto[]> {
    return this.organizationService.getMembers(id)
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: CreateOrganizationMemberDto,
  ): Promise<OrganizationMemberResponseDto> {
    return this.organizationService.addMember(id, {
      personId: dto.personId,
      roleTitle: dto.roleTitle ?? null,
      notes: dto.notes ?? null,
    })
  }

  @Delete(':id/members/:personId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('personId') personId: string,
  ): Promise<void> {
    await this.organizationService.removeMember(id, personId)
  }

  @Get(':id/country-memberships')
  async getCountryMemberships(
    @Param('id') id: string,
  ): Promise<OrganizationCountryMembershipResponseDto[]> {
    const rows = await this.organizationService.getCountryMemberships(id)
    return rows.map(toCountryMembershipDto)
  }

  @Post(':id/country-memberships')
  async addCountryMembership(
    @Param('id') id: string,
    @Body() dto: CreateOrganizationCountryMembershipDto,
  ): Promise<OrganizationCountryMembershipResponseDto> {
    const saved = await this.organizationService.addCountryMembership(id, {
      countryId: dto.countryId ?? null,
      historicalCountryId: dto.historicalCountryId ?? null,
      role: dto.role,
      startEra: dto.startEra ?? null,
      startYear: dto.startYear ?? null,
      startMonth: dto.startMonth ?? null,
      startDay: dto.startDay ?? null,
      endEra: dto.endEra ?? null,
      endYear: dto.endYear ?? null,
      endMonth: dto.endMonth ?? null,
      endDay: dto.endDay ?? null,
      sortOrder: dto.sortOrder,
      notes: dto.notes ?? null,
      statusHistory: dto.statusHistory ?? undefined,
    })
    return toCountryMembershipDto(saved)
  }

  @Patch(':id/country-memberships/:membershipId')
  async updateCountryMembership(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateOrganizationCountryMembershipDto,
  ): Promise<OrganizationCountryMembershipResponseDto> {
    const saved = await this.organizationService.updateCountryMembership(
      id,
      membershipId,
      dto,
    )
    return toCountryMembershipDto(saved)
  }

  @Delete(':id/country-memberships/:membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCountryMembership(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
  ): Promise<void> {
    await this.organizationService.removeCountryMembership(id, membershipId)
  }

  @Get(':id/events')
  async getRelatedEvents(
    @Param('id') id: string,
    @Request() req: { user?: { id?: string } },
  ): Promise<OrganizationRelatedEventResponseDto[]> {
    return this.organizationService.getRelatedEvents(id, req.user?.id)
  }

  @Post()
  async create(
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    let org = await this.organizationService.create({
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
      predecessorOrganizationId: dto.predecessorOrganizationId ?? null,
      countryId: dto.countryId ?? null,
      historicalCountryId: dto.historicalCountryId ?? null,
    })
    if (dto.members && dto.members.length > 0) {
      await Promise.all(
        dto.members.map((member) =>
          this.organizationService.addMember(org.id, {
            personId: member.personId,
            roleTitle: member.roleTitle ?? null,
            notes: member.notes ?? null,
          }),
        ),
      )
    }
    if (dto.countryMemberships && dto.countryMemberships.length > 0) {
      for (const [idx, cm] of dto.countryMemberships.entries()) {
        await this.organizationService.addCountryMembership(org.id, {
          countryId: cm.countryId ?? null,
          historicalCountryId: cm.historicalCountryId ?? null,
          role: cm.role,
          startEra: cm.startEra ?? null,
          startYear: cm.startYear ?? null,
          startMonth: cm.startMonth ?? null,
          startDay: cm.startDay ?? null,
          endEra: cm.endEra ?? null,
          endYear: cm.endYear ?? null,
          endMonth: cm.endMonth ?? null,
          endDay: cm.endDay ?? null,
          sortOrder: cm.sortOrder ?? idx,
          notes: cm.notes ?? null,
          statusHistory: cm.statusHistory ?? undefined,
        })
      }
      org = await this.organizationService.getById(org.id)
    }
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
      foundedDate:
        dto.foundedDate !== undefined
          ? dto.foundedDate
            ? new Date(dto.foundedDate)
            : null
          : undefined,
      dissolvedDate:
        dto.dissolvedDate !== undefined
          ? dto.dissolvedDate
            ? new Date(dto.dissolvedDate)
            : null
          : undefined,
      websiteUrl: dto.websiteUrl,
      logoUrl: dto.logoUrl,
      ideology: dto.ideology,
      headquartersCityId: dto.headquartersCityId,
      predecessorOrganizationId: dto.predecessorOrganizationId,
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
