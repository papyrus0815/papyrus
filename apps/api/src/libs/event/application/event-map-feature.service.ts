import { BadRequestException, Injectable } from '@nestjs/common'
import { EventMapGeometryType, PrismaClient } from '@prisma/client'

import { assertEventOwnership } from '../domain/event-ownership'

export interface EventMapFeatureInput {
  geometryType: EventMapGeometryType
  title: string
  description?: string | null
  color?: string | null
  sideId?: string | null
  deployedUnitId?: string | null
  coordinates: Array<[number, number]>
}

export interface EventMapFeatureView {
  id: string
  eventId: string
  geometryType: EventMapGeometryType
  title: string
  description: string | null
  color: string | null
  sideId: string | null
  sideName: string | null
  sideColor: string | null
  deployedUnitId: string | null
  deployedUnitName: string | null
  coordinates: Array<[number, number]>
  sortOrder: number
}

function normalizeCoordinates(raw: unknown): Array<[number, number]> {
  if (!Array.isArray(raw)) return []
  const result: Array<[number, number]> = []
  for (const point of raw) {
    if (Array.isArray(point) && point.length >= 2) {
      const lat = Number(point[0])
      const lng = Number(point[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        result.push([lat, lng])
      }
    }
  }
  return result
}

@Injectable()
export class EventMapFeatureService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(eventId: string): Promise<EventMapFeatureView[]> {
    const rows = await this.prisma.eventMapFeature.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        side: { select: { id: true, name: true, color: true } },
        deployedUnit: {
          select: {
            id: true,
            militaryUnit: { select: { name: true } },
          },
        },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      geometryType: row.geometryType,
      title: row.title,
      description: row.description ?? null,
      color: row.color ?? row.side?.color ?? null,
      sideId: row.sideId ?? null,
      sideName: row.side?.name ?? null,
      sideColor: row.side?.color ?? null,
      deployedUnitId: row.deployedUnitId ?? null,
      deployedUnitName: row.deployedUnit?.militaryUnit.name ?? null,
      coordinates: normalizeCoordinates(row.coordinates),
      sortOrder: row.sortOrder,
    }))
  }

  async sync(actorId: string, eventId: string, inputs: EventMapFeatureInput[]): Promise<EventMapFeatureView[]> {
    await assertEventOwnership(this.prisma, eventId, actorId, {
      action: '수정',
      deleted: 'not-found',
    })

    for (const input of inputs) {
      const coords = normalizeCoordinates(input.coordinates)
      if (coords.length === 0) {
        throw new BadRequestException(`'${input.title}' 피처에 유효한 좌표가 없습니다`)
      }
      if ((input.geometryType === 'ARROW' || input.geometryType === 'LINE') && coords.length < 2) {
        throw new BadRequestException(`'${input.title}' 선/화살표 피처는 최소 2개 이상의 좌표가 필요합니다`)
      }
      if (input.geometryType === 'POLYGON' && coords.length < 3) {
        throw new BadRequestException(`'${input.title}' 다각형(포위망) 피처는 최소 3개 이상의 좌표가 필요합니다`)
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.eventMapFeature.deleteMany({ where: { eventId } })
      for (const [index, input] of inputs.entries()) {
        await tx.eventMapFeature.create({
          data: {
            eventId,
            geometryType: input.geometryType,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            color: input.color || null,
            sideId: input.sideId || null,
            deployedUnitId: input.deployedUnitId || null,
            coordinates: normalizeCoordinates(input.coordinates),
            sortOrder: index,
          },
        })
      }
    })

    return this.list(eventId)
  }
}
