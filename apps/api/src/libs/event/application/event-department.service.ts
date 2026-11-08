import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import { assertEventOwnership } from '../domain/event-ownership'
import type {
  CreateEventDepartmentDto,
  EventDepartmentDto,
  EventDepartmentRoleValue,
  UpdateEventDepartmentDto,
} from '../presentation/dto/event-department.dto'

const INCLUDE = {
  department: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
      kind: true,
      country: { select: { id: true, name: true } },
      historicalCountry: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.EventDepartmentRelationInclude

type Row = Prisma.EventDepartmentRelationGetPayload<{ include: typeof INCLUDE }>

function toDto(row: Row): EventDepartmentDto {
  return {
    id: row.id,
    role: row.role as EventDepartmentRoleValue,
    roleDescription: row.roleDescription ?? null,
    sortOrder: row.sortOrder,
    department: {
      id: row.department.id,
      name: row.department.name,
      abbreviation: row.department.abbreviation ?? null,
      kind: row.department.kind,
      country: row.department.country ?? null,
      historicalCountry: row.department.historicalCountry ?? null,
    },
  }
}

/** 역할 표시 순서 — 발령 → 수령 → 주체 → 관여 → 기타 */
const ROLE_ORDER: Record<EventDepartmentRoleValue, number> = {
  ISSUER: 0,
  RECIPIENT: 1,
  PRINCIPAL: 2,
  PARTICIPANT: 3,
  OTHER: 4,
}

/**
 * 사건 ↔ 국가 기관 연결.
 * 쓰기는 사건 소유자만(event-ownership 단일 규칙) — 삭제된 사건에는 붙이지 못하고(409), 끊기는 된다.
 */
@Injectable()
export class EventDepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: string): Promise<EventDepartmentDto[]> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
    if (!event) throw new NotFoundException('사건을 찾을 수 없습니다.')
    const rows = await this.prisma.eventDepartmentRelation.findMany({
      where: { eventId },
      include: INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows
      .map(toDto)
      .sort((left, right) => ROLE_ORDER[left.role] - ROLE_ORDER[right.role] || left.sortOrder - right.sortOrder)
  }

  async add(userId: string, eventId: string, body: CreateEventDepartmentDto): Promise<EventDepartmentDto> {
    await assertEventOwnership(this.prisma, eventId, userId, { action: '수정', deleted: 'conflict' })
    const department = await this.prisma.administrationDepartment.findUnique({
      where: { id: body.departmentId },
      select: { id: true, name: true },
    })
    if (!department) throw new NotFoundException('기관을 찾을 수 없습니다.')
    const exists = await this.prisma.eventDepartmentRelation.findFirst({
      where: { eventId, departmentId: body.departmentId, role: body.role },
    })
    if (exists) throw new ConflictException(`「${department.name}」은(는) 이미 같은 역할로 걸려 있습니다.`)
    const count = await this.prisma.eventDepartmentRelation.count({ where: { eventId } })
    const row = await this.prisma.eventDepartmentRelation.create({
      data: {
        eventId,
        departmentId: body.departmentId,
        role: body.role,
        roleDescription: body.roleDescription?.trim() || null,
        sortOrder: count,
      },
      include: INCLUDE,
    })
    return toDto(row)
  }

  async update(
    userId: string,
    eventId: string,
    relationId: string,
    body: UpdateEventDepartmentDto,
  ): Promise<EventDepartmentDto> {
    await assertEventOwnership(this.prisma, eventId, userId, { action: '수정', deleted: 'conflict' })
    const current = await this.prisma.eventDepartmentRelation.findFirst({ where: { id: relationId, eventId } })
    if (!current) throw new NotFoundException('연결을 찾을 수 없습니다.')
    if (body.role && body.role !== current.role) {
      const clash = await this.prisma.eventDepartmentRelation.findFirst({
        where: { eventId, departmentId: current.departmentId, role: body.role },
      })
      if (clash) throw new ConflictException('같은 기관이 이미 그 역할로 걸려 있습니다.')
    }
    const row = await this.prisma.eventDepartmentRelation.update({
      where: { id: relationId },
      data: {
        ...(body.role !== undefined && { role: body.role }),
        ...(body.roleDescription !== undefined && { roleDescription: body.roleDescription?.trim() || null }),
      },
      include: INCLUDE,
    })
    return toDto(row)
  }

  async remove(userId: string, eventId: string, relationId: string): Promise<void> {
    await assertEventOwnership(this.prisma, eventId, userId, { action: '수정' })
    const current = await this.prisma.eventDepartmentRelation.findFirst({ where: { id: relationId, eventId } })
    if (!current) throw new NotFoundException('연결을 찾을 수 없습니다.')
    await this.prisma.eventDepartmentRelation.delete({ where: { id: relationId } })
  }
}
