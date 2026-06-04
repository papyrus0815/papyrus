import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PersonGroupType } from '@prisma/client'

import { PersonGroupService } from '../application/person-group.service'
import {
  AddPersonGroupMemberDto,
  CreatePersonGroupDto,
  PersonGroupResponseDto,
  UpdatePersonGroupDto,
  UpdatePersonGroupMemberDto,
} from './dto'

/**
 * 인물 묶음(세대·계파·동기) 컨트롤러.
 * persons/:id 와 경로 충돌을 피하려 별도 프리픽스(person-groups) 사용.
 */
@ApiTags('person-groups')
@Controller('person-groups')
@UseGuards(AuthGuard('jwt'))
export class PersonGroupController {
  constructor(private readonly personGroupService: PersonGroupService) {}

  /** 묶음 목록 (멤버 미포함). ?type=&countryId= 필터 */
  @Get()
  async list(
    @Request() req: any,
    @Query('type') type?: PersonGroupType,
    @Query('countryId') countryId?: string,
  ): Promise<PersonGroupResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personGroupService.listGroups({ type, countryId }, accountId)
  }

  /** 특정 인물이 속한 묶음들 (인물 상세 섹션용). 경로: person-groups/by-person/:personId */
  @Get('by-person/:personId')
  async byPerson(
    @Param('personId') personId: string,
    @Request() req: any,
  ): Promise<PersonGroupResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personGroupService.getGroupsByPerson(personId, accountId)
  }

  /** 묶음 상세 (멤버 인물 카드 포함) */
  @Get(':groupId')
  async detail(
    @Param('groupId') groupId: string,
    @Request() req: any,
  ): Promise<PersonGroupResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personGroupService.getGroup(groupId, accountId)
  }

  @Post()
  async create(
    @Body() dto: CreatePersonGroupDto,
    @Request() req: any,
  ): Promise<PersonGroupResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personGroupService.createGroup(dto, accountId)
  }

  @Put(':groupId')
  async update(
    @Param('groupId') groupId: string,
    @Body() dto: UpdatePersonGroupDto,
    @Request() req: any,
  ): Promise<PersonGroupResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personGroupService.updateGroup(groupId, dto, accountId)
  }

  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('groupId') groupId: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personGroupService.deleteGroup(groupId, accountId)
  }

  // ── 멤버십 ──────────────────────────────────────────────────
  @Post(':groupId/members')
  async addMember(
    @Param('groupId') groupId: string,
    @Body() dto: AddPersonGroupMemberDto,
    @Request() req: any,
  ): Promise<PersonGroupResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personGroupService.addMember(groupId, dto, accountId)
  }

  @Put(':groupId/members/:membershipId')
  async updateMember(
    @Param('groupId') groupId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdatePersonGroupMemberDto,
    @Request() req: any,
  ): Promise<PersonGroupResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personGroupService.updateMember(
      groupId,
      membershipId,
      dto,
      accountId,
    )
  }

  @Delete(':groupId/members/:membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('membershipId') membershipId: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personGroupService.removeMember(groupId, membershipId, accountId)
  }
}
