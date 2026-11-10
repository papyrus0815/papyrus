import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

import { assertEventOwnership } from '../domain/event-ownership'
import type { SideWeaponKind } from '../presentation/dto/side-weapon.dto'

export interface SideWeaponInput {
  kind: SideWeaponKind
  itemId: string
  deployedUnitId?: string | null
  quantity?: number | null
  /** 이 작전에서 잃은 수 */
  lost?: number | null
  /** 역할 한 줄 — '주력 중형전차' */
  role?: string | null
  note?: string | null
}

export interface SideWeaponView {
  id: string
  sideId: string
  deployedUnitId: string | null
  deployedUnitName: string | null
  kind: SideWeaponKind
  itemId: string
  name: string
  categoryLabel: string | null
  countryName: string | null
  manufacturerName: string | null
  quantity: number | null
  lost: number | null
  role: string | null
  note: string | null
  sortOrder: number
}

export interface WeaponCatalogItem {
  id: string
  kind: SideWeaponKind
  name: string
  categoryLabel: string | null
  countryId: string | null
  historicalCountryId: string | null
  countryName: string | null
  manufacturerName: string | null
}

@Injectable()
export class EventSideWeaponService {
  constructor(private readonly prisma: PrismaClient) {}

  async listByEvent(eventId: string): Promise<Record<string, SideWeaponView[]>> {
    const rows = await this.prisma.sideWeapon.findMany({
      where: { side: { eventId } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        deployedUnit: {
          select: {
            id: true,
            militaryUnit: { select: { name: true } },
          },
        },
        weapon: {
          select: {
            id: true,
            name: true,
            weaponType: true,
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
            manufacturerCompany: { select: { organization: { select: { name: true } } } },
          },
        },
        groundVehicle: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            manufacturer: true,
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
            manufacturerCompany: { select: { organization: { select: { name: true } } } },
          },
        },
        aircraft: {
          select: {
            id: true,
            name: true,
            aircraftType: true,
            manufacturer: true,
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
            manufacturerCompany: { select: { organization: { select: { name: true } } } },
          },
        },
        navalVessel: {
          select: {
            id: true,
            name: true,
            vesselType: true,
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
            manufacturerCompany: { select: { organization: { select: { name: true } } } },
          },
        },
      },
    })

    const bySide: Record<string, SideWeaponView[]> = {}
    for (const row of rows) {
      let kind: SideWeaponKind = 'WEAPON'
      let itemId = ''
      let name = ''
      let categoryLabel: string | null = null
      let countryName: string | null = null
      let manufacturerName: string | null = null

      if (row.groundVehicle) {
        kind = 'GROUND_VEHICLE'
        itemId = row.groundVehicle.id
        name = row.groundVehicle.name
        categoryLabel = row.groundVehicle.vehicleType ?? null
        countryName = row.groundVehicle.historicalCountry?.name ?? row.groundVehicle.country?.name ?? null
        manufacturerName =
          row.groundVehicle.manufacturerCompany?.organization?.name ?? row.groundVehicle.manufacturer ?? null
      } else if (row.aircraft) {
        kind = 'AIRCRAFT'
        itemId = row.aircraft.id
        name = row.aircraft.name
        categoryLabel = row.aircraft.aircraftType ?? null
        countryName = row.aircraft.historicalCountry?.name ?? row.aircraft.country?.name ?? null
        manufacturerName =
          row.aircraft.manufacturerCompany?.organization?.name ?? row.aircraft.manufacturer ?? null
      } else if (row.navalVessel) {
        kind = 'NAVAL_VESSEL'
        itemId = row.navalVessel.id
        name = row.navalVessel.name
        categoryLabel = row.navalVessel.vesselType ?? null
        countryName = row.navalVessel.historicalCountry?.name ?? row.navalVessel.country?.name ?? null
        manufacturerName = row.navalVessel.manufacturerCompany?.organization?.name ?? null
      } else if (row.weapon) {
        kind = 'WEAPON'
        itemId = row.weapon.id
        name = row.weapon.name
        categoryLabel = row.weapon.weaponType ?? null
        countryName = row.weapon.historicalCountry?.name ?? row.weapon.country?.name ?? null
        manufacturerName = row.weapon.manufacturerCompany?.organization?.name ?? null
      } else {
        continue
      }

      const view: SideWeaponView = {
        id: row.id,
        sideId: row.sideId,
        deployedUnitId: row.deployedUnitId ?? null,
        deployedUnitName: row.deployedUnit?.militaryUnit.name ?? null,
        kind,
        itemId,
        name,
        categoryLabel,
        countryName,
        manufacturerName,
        quantity: row.quantity ?? null,
        lost: row.lost ?? null,
        role: row.role ?? null,
        note: row.note ?? null,
        sortOrder: row.sortOrder,
      }
      bySide[row.sideId] = [...(bySide[row.sideId] ?? []), view]
    }
    return bySide
  }

  async getCatalog(): Promise<WeaponCatalogItem[]> {
    const [weapons, groundVehicles, aircraftList, navalVessels] = await Promise.all([
      this.prisma.weapon.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          weaponType: true,
          countryId: true,
          historicalCountryId: true,
          country: { select: { name: true } },
          historicalCountry: { select: { name: true } },
          manufacturerCompany: { select: { organization: { select: { name: true } } } },
        },
      }),
      this.prisma.groundVehicle.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          vehicleType: true,
          manufacturer: true,
          countryId: true,
          historicalCountryId: true,
          country: { select: { name: true } },
          historicalCountry: { select: { name: true } },
          manufacturerCompany: { select: { organization: { select: { name: true } } } },
        },
      }),
      this.prisma.aircraft.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          aircraftType: true,
          manufacturer: true,
          countryId: true,
          historicalCountryId: true,
          country: { select: { name: true } },
          historicalCountry: { select: { name: true } },
          manufacturerCompany: { select: { organization: { select: { name: true } } } },
        },
      }),
      this.prisma.navalVessel.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          vesselType: true,
          countryId: true,
          historicalCountryId: true,
          country: { select: { name: true } },
          historicalCountry: { select: { name: true } },
          manufacturerCompany: { select: { organization: { select: { name: true } } } },
        },
      }),
    ])

    const catalog: WeaponCatalogItem[] = [
      ...groundVehicles.map((item) => ({
        id: item.id,
        kind: 'GROUND_VEHICLE' as const,
        name: item.name,
        categoryLabel: item.vehicleType ?? null,
        countryId: item.countryId ?? null,
        historicalCountryId: item.historicalCountryId ?? null,
        countryName: item.historicalCountry?.name ?? item.country?.name ?? null,
        manufacturerName: item.manufacturerCompany?.organization?.name ?? item.manufacturer ?? null,
      })),
      ...aircraftList.map((item) => ({
        id: item.id,
        kind: 'AIRCRAFT' as const,
        name: item.name,
        categoryLabel: item.aircraftType ?? null,
        countryId: item.countryId ?? null,
        historicalCountryId: item.historicalCountryId ?? null,
        countryName: item.historicalCountry?.name ?? item.country?.name ?? null,
        manufacturerName: item.manufacturerCompany?.organization?.name ?? item.manufacturer ?? null,
      })),
      ...weapons.map((item) => ({
        id: item.id,
        kind: 'WEAPON' as const,
        name: item.name,
        categoryLabel: item.weaponType ?? null,
        countryId: item.countryId ?? null,
        historicalCountryId: item.historicalCountryId ?? null,
        countryName: item.historicalCountry?.name ?? item.country?.name ?? null,
        manufacturerName: item.manufacturerCompany?.organization?.name ?? null,
      })),
      ...navalVessels.map((item) => ({
        id: item.id,
        kind: 'NAVAL_VESSEL' as const,
        name: item.name,
        categoryLabel: item.vesselType ?? null,
        countryId: item.countryId ?? null,
        historicalCountryId: item.historicalCountryId ?? null,
        countryName: item.historicalCountry?.name ?? item.country?.name ?? null,
        manufacturerName: item.manufacturerCompany?.organization?.name ?? null,
      })),
    ]
    return catalog
  }

  async syncForSide(
    actorId: string,
    eventId: string,
    sideId: string,
    inputs: SideWeaponInput[],
  ): Promise<SideWeaponView[]> {
    await assertEventOwnership(this.prisma, eventId, actorId, {
      action: '진영 편집',
      deleted: 'not-found',
    })
    const side = await this.prisma.eventSide.findUnique({
      where: { id: sideId },
      select: { eventId: true },
    })
    if (!side || side.eventId !== eventId) {
      throw new NotFoundException('이 사건의 진영을 찾을 수 없습니다')
    }

    const keys = inputs.map((item) => `${item.kind}:${item.itemId}:${item.deployedUnitId ?? ''}`)
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('같은 병기가 동일 배속으로 두 번 들어 있습니다')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sideWeapon.deleteMany({ where: { sideId } })
      for (const [index, input] of inputs.entries()) {
        await tx.sideWeapon.create({
          data: {
            sideId,
            deployedUnitId: input.deployedUnitId || null,
            weaponId: input.kind === 'WEAPON' ? input.itemId : null,
            groundVehicleId: input.kind === 'GROUND_VEHICLE' ? input.itemId : null,
            aircraftId: input.kind === 'AIRCRAFT' ? input.itemId : null,
            navalVesselId: input.kind === 'NAVAL_VESSEL' ? input.itemId : null,
            quantity: input.quantity ?? null,
            lost: input.lost ?? null,
            role: input.role?.trim() || null,
            note: input.note?.trim() || null,
            sortOrder: index,
          },
        })
      }
    })

    const all = await this.listByEvent(eventId)
    return all[sideId] ?? []
  }
}
