import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PersonGroupType, Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import { PersonPrismaRepository } from '../infrastructure/person.prisma.repository'
import {
  AddPersonGroupMemberDto,
  CreatePersonGroupDto,
  PersonGroupMemberDto,
  PersonGroupResponseDto,
  UpdatePersonGroupDto,
  UpdatePersonGroupMemberDto,
} from '../presentation/dto'
import type { PersonResponseDto } from '../presentation/dto'

const GROUP_REF_SELECT = {
  id: true,
  name: true,
  type: true,
  generationOrder: true,
} as const satisfies Prisma.PersonGroupSelect

type GroupWithRelations = Prisma.PersonGroupGetPayload<{
  include: {
    country: { select: { id: true; name: true } }
    members: true
    predecessor: { select: typeof GROUP_REF_SELECT }
    successors: { select: typeof GROUP_REF_SELECT }
    _count: { select: { members: true } }
  }
}>

/**
 * 인물 묶음(세대·계파·동기) 서비스.
 * N항 그룹 CRUD + 멤버십 관리. 멤버 인물 카드는 PersonPrismaRepository.findPersonsByIds 재사용.
 *
 * 소유권: accountId가 있는(생성자 보유) 묶음은 생성자만 수정/삭제/멤버변경 가능.
 * accountId가 null인(시드·공유) 묶음은 누구나 편집 가능 — 협업 카탈로그.
 */
@Injectable()
export class PersonGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly personRepository: PersonPrismaRepository,
  ) {}

  private static readonly GROUP_INCLUDE = {
    country: { select: { id: true, name: true } },
    members: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    predecessor: { select: GROUP_REF_SELECT },
    successors: {
      select: GROUP_REF_SELECT,
      orderBy: [{ generationOrder: 'asc' }, { name: 'asc' }],
    },
    _count: { select: { members: true } },
  } as const satisfies Prisma.PersonGroupInclude

  /**
   * 여러 묶음을 한 번에 응답 매핑. withMembers=true면 전 묶음의 멤버 personId를
   * 모아 단일 findPersonsByIds 쿼리로 조회(N+1 방지).
   */
  private async mapGroups(
    groups: GroupWithRelations[],
    withMembers: boolean,
    viewerAccountId?: string,
  ): Promise<PersonGroupResponseDto[]> {
    // 중심 인물은 목록에서도 표시 가능하므로 항상 수집. 멤버는 withMembers일 때만.
    const idSet = new Set<string>()
    for (const g of groups) {
      if (g.centerPersonId) idSet.add(g.centerPersonId)
      if (withMembers) for (const m of g.members) idSet.add(m.personId)
    }
    const personMap =
      idSet.size > 0
        ? new Map(
            (
              await this.personRepository.findPersonsByIds([...idSet])
            ).map((p) => [p.id, p]),
          )
        : new Map<string, PersonResponseDto>()
    return groups.map((group) => {
      const members: PersonGroupMemberDto[] = withMembers
        ? group.members
            .map((m) => {
              const person = personMap.get(m.personId)
              if (!person) return null
              return {
                membershipId: m.id,
                roleLabel: m.roleLabel,
                note: m.note,
                sortOrder: m.sortOrder,
                person,
              } satisfies PersonGroupMemberDto
            })
            .filter((m): m is PersonGroupMemberDto => m !== null)
        : []
      return {
        id: group.id,
        name: group.name,
        type: group.type,
        description: group.description,
        generationOrder: group.generationOrder,
        countryId: group.countryId,
        countryName: group.country?.name ?? null,
        sortOrder: group.sortOrder,
        memberCount: group._count.members,
        canEdit: !group.accountId || group.accountId === viewerAccountId,
        predecessor: group.predecessor
          ? {
              id: group.predecessor.id,
              name: group.predecessor.name,
              type: group.predecessor.type,
              generationOrder: group.predecessor.generationOrder,
            }
          : null,
        successors: group.successors.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          generationOrder: s.generationOrder,
        })),
        center: group.centerPersonId
          ? personMap.get(group.centerPersonId) ?? null
          : null,
        members,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      }
    })
  }

  /** 묶음 목록 (멤버 미포함). type·countryId로 필터 가능 */
  async listGroups(
    filter?: {
      type?: PersonGroupType
      countryId?: string
    },
    accountId?: string,
  ): Promise<PersonGroupResponseDto[]> {
    const groups = await this.prisma.personGroup.findMany({
      where: {
        ...(filter?.type ? { type: filter.type } : {}),
        ...(filter?.countryId ? { countryId: filter.countryId } : {}),
      },
      include: PersonGroupService.GROUP_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return this.mapGroups(groups, false, accountId)
  }

  /** 묶음 상세 (멤버 인물 카드 포함) */
  async getGroup(
    groupId: string,
    accountId?: string,
  ): Promise<PersonGroupResponseDto> {
    const group = await this.prisma.personGroup.findUnique({
      where: { id: groupId },
      include: PersonGroupService.GROUP_INCLUDE,
    })
    if (!group) throw new NotFoundException('묶음을 찾을 수 없습니다.')
    const [mapped] = await this.mapGroups([group], true, accountId)
    return mapped
  }

  /** 특정 인물이 속한 묶음들 (각 묶음의 동료 멤버 포함 — 인물 상세 섹션용) */
  async getGroupsByPerson(
    personId: string,
    accountId?: string,
  ): Promise<PersonGroupResponseDto[]> {
    const memberships = await this.prisma.personGroupMembership.findMany({
      where: { personId },
      select: { groupId: true },
    })
    if (memberships.length === 0) return []
    const groups = await this.prisma.personGroup.findMany({
      where: { id: { in: memberships.map((m) => m.groupId) } },
      include: PersonGroupService.GROUP_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return this.mapGroups(groups, true, accountId)
  }

  async createGroup(
    dto: CreatePersonGroupDto,
    accountId?: string,
  ): Promise<PersonGroupResponseDto> {
    const created = await this.prisma.personGroup.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description ?? null,
        generationOrder: dto.generationOrder ?? null,
        countryId: dto.countryId ?? null,
        predecessorGroupId: dto.predecessorGroupId ?? null,
        centerPersonId: dto.centerPersonId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        accountId: accountId ?? null,
        members:
          dto.memberPersonIds && dto.memberPersonIds.length > 0
            ? {
                create: [...new Set(dto.memberPersonIds)].map(
                  (personId, idx) => ({ personId, sortOrder: idx }),
                ),
              }
            : undefined,
      },
      include: PersonGroupService.GROUP_INCLUDE,
    })
    const [mapped] = await this.mapGroups([created], true, accountId)
    return mapped
  }

  async updateGroup(
    groupId: string,
    dto: UpdatePersonGroupDto,
    accountId?: string,
  ): Promise<PersonGroupResponseDto> {
    await this.assertCanMutate(groupId, accountId)
    if (dto.predecessorGroupId) {
      if (dto.predecessorGroupId === groupId) {
        throw new BadRequestException('자기 자신을 전임 묶음으로 지정할 수 없습니다.')
      }
      // 존재 확인 + 순환(A→B→A …) 차단: 후보의 전임 체인을 거슬러 올라가며 groupId 만나면 거부
      let cursor: string | null = dto.predecessorGroupId
      const seen = new Set<string>()
      while (cursor) {
        if (cursor === groupId) {
          throw new BadRequestException(
            '전임 묶음 관계가 순환됩니다. 다른 묶음을 지정하세요.',
          )
        }
        if (seen.has(cursor)) break // 기존 데이터에 순환이 있어도 무한루프 방지
        seen.add(cursor)
        const node: { predecessorGroupId: string | null } | null =
          await this.prisma.personGroup.findUnique({
            where: { id: cursor },
            select: { predecessorGroupId: true },
          })
        if (!node) {
          if (cursor === dto.predecessorGroupId) {
            throw new BadRequestException('전임 묶음을 찾을 수 없습니다.')
          }
          break
        }
        cursor = node.predecessorGroupId
      }
    }
    await this.prisma.personGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.generationOrder !== undefined
          ? { generationOrder: dto.generationOrder }
          : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        ...(dto.predecessorGroupId !== undefined
          ? { predecessorGroupId: dto.predecessorGroupId }
          : {}),
        ...(dto.centerPersonId !== undefined
          ? { centerPersonId: dto.centerPersonId }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    })
    return this.getGroup(groupId, accountId)
  }

  async deleteGroup(groupId: string, accountId?: string): Promise<void> {
    await this.assertCanMutate(groupId, accountId)
    await this.prisma.personGroup.delete({ where: { id: groupId } })
  }

  async addMember(
    groupId: string,
    dto: AddPersonGroupMemberDto,
    accountId?: string,
  ): Promise<PersonGroupResponseDto> {
    await this.assertCanMutate(groupId, accountId)
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
      select: { id: true },
    })
    if (!person) throw new NotFoundException('인물을 찾을 수 없습니다.')
    try {
      await this.prisma.personGroupMembership.create({
        data: {
          groupId,
          personId: dto.personId,
          roleLabel: dto.roleLabel ?? null,
          note: dto.note ?? null,
          sortOrder: dto.sortOrder ?? 0,
        },
      })
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: string }).code
          : undefined
      if (code === 'P2002') {
        throw new BadRequestException('이미 이 묶음에 속한 인물입니다.')
      }
      throw e
    }
    return this.getGroup(groupId, accountId)
  }

  async updateMember(
    groupId: string,
    membershipId: string,
    dto: UpdatePersonGroupMemberDto,
    accountId?: string,
  ): Promise<PersonGroupResponseDto> {
    await this.assertCanMutate(groupId, accountId)
    await this.assertMembershipInGroup(groupId, membershipId)
    await this.prisma.personGroupMembership.update({
      where: { id: membershipId },
      data: {
        ...(dto.roleLabel !== undefined ? { roleLabel: dto.roleLabel } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    })
    return this.getGroup(groupId, accountId)
  }

  async removeMember(
    groupId: string,
    membershipId: string,
    accountId?: string,
  ): Promise<void> {
    await this.assertCanMutate(groupId, accountId)
    await this.assertMembershipInGroup(groupId, membershipId)
    await this.prisma.personGroupMembership.delete({
      where: { id: membershipId },
    })
  }

  /** 묶음 존재 + 편집 권한 확인. 생성자 보유 묶음은 생성자만, 미보유(null)는 누구나. */
  private async assertCanMutate(
    groupId: string,
    accountId?: string,
  ): Promise<void> {
    const group = await this.prisma.personGroup.findUnique({
      where: { id: groupId },
      select: { id: true, accountId: true },
    })
    if (!group) throw new NotFoundException('묶음을 찾을 수 없습니다.')
    if (group.accountId && group.accountId !== accountId) {
      throw new ForbiddenException('이 묶음을 만든 사용자만 편집할 수 있습니다.')
    }
  }

  private async assertMembershipInGroup(
    groupId: string,
    membershipId: string,
  ): Promise<void> {
    const membership = await this.prisma.personGroupMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, groupId: true },
    })
    if (!membership || membership.groupId !== groupId) {
      throw new NotFoundException('멤버십을 찾을 수 없습니다.')
    }
  }
}
