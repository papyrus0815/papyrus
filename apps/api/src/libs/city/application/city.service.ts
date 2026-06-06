import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'

import type {
  AdminDivisionConfigResponseDto,
  AdministrativeDivisionResponseDto,
  AdministrativeDivisionSearchResult,
  BulkCreateAdministrativeDivisionsBody,
  BulkCreateResult,
  CityResponseDto,
  CreateAdminDivisionConfigBody,
  CreateAdministrativeDivisionBody,
  PlaceSearchResult,
  UpdateAdminDivisionConfigBody,
  UpdateAdministrativeDivisionBody,
} from '../presentation/city.controller'

/**
 * City / AdministrativeDivision 도메인 비즈니스 로직.
 *
 * 컨트롤러(CityController)는 HTTP 매핑만 담당하고, 모든 검증·트랜잭션·쿼리는 여기에 모은다.
 * DTO 타입은 컨트롤러에 정의돼 있고(생성 SDK가 그 경로를 참조), 여기서는 type-only로 가져온다.
 */
@Injectable()
export class CityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 행정구역 트리 조회 (N-depth, 모든 자손 포함)
   *
   * Prisma의 nested include는 깊이 제한이 있어, 전체 row를 한 번에 가져와
   * application 레벨에서 트리 구성. 일반적인 행정구역 규모에서는 충분히 빠름.
   */
  async getAdministrativeDivisions(
    countryId?: string,
  ): Promise<AdministrativeDivisionResponseDto[]> {
    const rows = await this.prisma.administrativeDivision.findMany({
      where: countryId ? { countryId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { cities: true, successors: true },
        },
      },
    })
    const byId = new Map<string, AdministrativeDivisionResponseDto>()
    for (const r of rows) byId.set(r.id, this.toAdminDivisionDto(r as any, []))
    const roots: AdministrativeDivisionResponseDto[] = []
    for (const r of rows) {
      const dto = byId.get(r.id)!
      if (r.parentId && byId.has(r.parentId)) {
        byId.get(r.parentId)!.children!.push(dto)
      } else {
        roots.push(dto)
      }
    }
    return roots
  }

  private toAdminDivisionDto(
    row: {
      id: string
      name: string
      localName: string | null
      nameMeaning: string | null
      countryId: string
      adminDivisionId: string
      parentId: string | null
      centerLat: { toString(): string } | null
      centerLng: { toString(): string } | null
      establishedDate: Date | null
      abolishedDate: Date | null
      predecessorId: string | null
      _count?: { cities?: number; successors?: number }
    },
    children: AdministrativeDivisionResponseDto[],
  ): AdministrativeDivisionResponseDto {
    return {
      id: row.id,
      name: row.name,
      localName: row.localName ?? null,
      nameMeaning: row.nameMeaning ?? null,
      countryId: row.countryId,
      adminDivisionId: row.adminDivisionId,
      parentId: row.parentId ?? null,
      centerLat: row.centerLat != null ? Number(row.centerLat) : null,
      centerLng: row.centerLng != null ? Number(row.centerLng) : null,
      establishedDate: row.establishedDate
        ? row.establishedDate.toISOString()
        : null,
      abolishedDate: row.abolishedDate ? row.abolishedDate.toISOString() : null,
      predecessorId: row.predecessorId ?? null,
      cityCount: row._count?.cities ?? 0,
      successorCount: row._count?.successors ?? 0,
      children,
    }
  }

  /**
   * predecessorId(이전 행정구역) 검증 — 자기참조 금지 + 존재 + 국가 일치.
   * parentId가 검증되는 것과 동일한 기준을 predecessor에도 적용한다.
   *
   * @param predecessorId 검증할 이전 행정구역 ID (없으면 통과)
   * @param countryId 현재 행정구역의 국가
   * @param selfId 수정 중인 행정구역 자신의 ID (생성 시 undefined)
   */
  private async validatePredecessor(
    predecessorId: string | null | undefined,
    countryId: string,
    selfId?: string,
  ): Promise<void> {
    if (!predecessorId) return
    if (selfId && predecessorId === selfId) {
      throw new ConflictException(
        '자기 자신을 이전 행정구역으로 지정할 수 없습니다.',
      )
    }
    const predecessor = await this.prisma.administrativeDivision.findUnique({
      where: { id: predecessorId },
    })
    if (!predecessor) {
      throw new NotFoundException('이전 행정구역을 찾을 수 없습니다.')
    }
    if (predecessor.countryId !== countryId) {
      throw new ConflictException('이전 행정구역의 국가가 일치하지 않습니다.')
    }
  }

  /** 국가별 행정구역 단위(레벨) 설정 조회 */
  async getAdminDivisionConfigs(
    countryId?: string,
  ): Promise<AdminDivisionConfigResponseDto[]> {
    if (!countryId) return []
    const list = await this.prisma.countryAdminDivisionConfig.findMany({
      where: { countryId },
      orderBy: { divisionLevel: 'asc' },
    })
    return list.map((c) => ({
      id: c.id,
      countryId: c.countryId,
      divisionLevel: c.divisionLevel,
      divisionLabel: c.divisionLabel,
      description: c.description ?? null,
    }))
  }

  /** 행정구역 단위 생성 (예: "도", "주") */
  async createAdminDivisionConfig(
    body: CreateAdminDivisionConfigBody,
  ): Promise<AdminDivisionConfigResponseDto> {
    const dup = await this.prisma.countryAdminDivisionConfig.findFirst({
      where: { countryId: body.countryId, divisionLevel: body.divisionLevel },
    })
    if (dup) {
      throw new ConflictException(
        `해당 국가에 ${body.divisionLevel}차 단위가 이미 존재합니다.`,
      )
    }
    const row = await this.prisma.countryAdminDivisionConfig.create({
      data: {
        countryId: body.countryId,
        divisionLevel: body.divisionLevel,
        divisionLabel: body.divisionLabel,
        description: body.description ?? undefined,
      },
    })
    return {
      id: row.id,
      countryId: row.countryId,
      divisionLevel: row.divisionLevel,
      divisionLabel: row.divisionLabel,
      description: row.description ?? null,
    }
  }

  /** 행정구역 단위 수정 */
  async updateAdminDivisionConfig(
    id: string,
    body: UpdateAdminDivisionConfigBody,
  ): Promise<AdminDivisionConfigResponseDto> {
    const current = await this.prisma.countryAdminDivisionConfig.findUnique({
      where: { id },
    })
    if (!current) throw new NotFoundException('단위를 찾을 수 없습니다.')

    if (
      body.divisionLevel != null &&
      body.divisionLevel !== current.divisionLevel
    ) {
      const dup = await this.prisma.countryAdminDivisionConfig.findFirst({
        where: {
          countryId: current.countryId,
          divisionLevel: body.divisionLevel,
          NOT: { id },
        },
      })
      if (dup) {
        throw new ConflictException(
          `해당 국가에 ${body.divisionLevel}차 단위가 이미 존재합니다.`,
        )
      }
    }

    const row = await this.prisma.countryAdminDivisionConfig.update({
      where: { id },
      data: {
        ...(body.divisionLevel != null && { divisionLevel: body.divisionLevel }),
        ...(body.divisionLabel != null && { divisionLabel: body.divisionLabel }),
        ...(body.description !== undefined && { description: body.description }),
      },
    })
    return {
      id: row.id,
      countryId: row.countryId,
      divisionLevel: row.divisionLevel,
      divisionLabel: row.divisionLabel,
      description: row.description ?? null,
    }
  }

  /**
   * 행정구역 단위 삭제 — 단위에 연결된 행정구역이 있으면 거부.
   */
  async deleteAdminDivisionConfig(id: string): Promise<void> {
    const used = await this.prisma.administrativeDivision.count({
      where: { adminDivisionId: id },
    })
    if (used > 0) {
      throw new ConflictException(
        '이 단위로 등록된 행정구역이 있어 삭제할 수 없습니다.',
      )
    }
    await this.prisma.countryAdminDivisionConfig.delete({ where: { id } })
  }

  /**
   * 행정구역 생성
   *
   * 검증:
   *  - 단위의 국가 일치
   *  - 부모 존재 / 국가 일치 / 부모 단위 레벨 + 1 = 본 단위 레벨
   *  - 같은 (countryId, parentId)에 동일 이름 없음
   *  - predecessor 자기참조/국가 일치
   */
  async createAdministrativeDivision(
    body: CreateAdministrativeDivisionBody,
  ): Promise<AdministrativeDivisionResponseDto> {
    const config = await this.prisma.countryAdminDivisionConfig.findUnique({
      where: { id: body.adminDivisionId },
    })
    if (!config) throw new NotFoundException('단위를 찾을 수 없습니다.')
    if (config.countryId !== body.countryId) {
      throw new ConflictException('단위의 국가가 일치하지 않습니다.')
    }

    if (body.parentId) {
      const parent = await this.prisma.administrativeDivision.findUnique({
        where: { id: body.parentId },
        include: { adminDivisionConfig: true },
      })
      if (!parent)
        throw new NotFoundException('상위 행정구역을 찾을 수 없습니다.')
      if (parent.countryId !== body.countryId) {
        throw new ConflictException('상위 행정구역의 국가가 일치하지 않습니다.')
      }
      if (parent.adminDivisionConfig.divisionLevel + 1 !== config.divisionLevel) {
        throw new ConflictException(
          `상위(${parent.adminDivisionConfig.divisionLevel}차) 바로 아래 단위는 ${parent.adminDivisionConfig.divisionLevel + 1}차여야 합니다.`,
        )
      }
    } else {
      // 최상위는 1차여야 함
      if (config.divisionLevel !== 1) {
        throw new ConflictException(
          '상위가 없는 행정구역은 1차 단위여야 합니다.',
        )
      }
    }

    const dup = await this.prisma.administrativeDivision.findFirst({
      where: {
        countryId: body.countryId,
        parentId: body.parentId ?? null,
        name: body.name,
      },
    })
    if (dup) {
      throw new ConflictException(
        '같은 상위 안에 동일한 이름의 행정구역이 이미 있습니다.',
      )
    }

    await this.validatePredecessor(body.predecessorId, body.countryId)

    const row = await this.prisma.administrativeDivision.create({
      data: {
        countryId: body.countryId,
        adminDivisionId: body.adminDivisionId,
        name: body.name,
        localName: body.localName ?? undefined,
        nameMeaning: body.nameMeaning ?? undefined,
        parentId: body.parentId ?? undefined,
        centerLat: body.centerLat ?? undefined,
        centerLng: body.centerLng ?? undefined,
        establishedDate: body.establishedDate
          ? new Date(body.establishedDate)
          : undefined,
        abolishedDate: body.abolishedDate
          ? new Date(body.abolishedDate)
          : undefined,
        predecessorId: body.predecessorId ?? undefined,
      },
    })
    return this.toAdminDivisionDto(row as any, [])
  }

  /**
   * 행정구역 평탄 검색 (모든 깊이 — 부모 경로 포함)
   */
  async searchAdministrativeDivisions(
    q?: string,
    countryId?: string,
    limitStr?: string,
  ): Promise<AdministrativeDivisionSearchResult[]> {
    if (!q || q.trim().length < 1) return []
    const limit = Math.min(200, Math.max(1, Number(limitStr) || 20))
    const rows = await this.prisma.administrativeDivision.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        OR: [
          { name: { contains: q.trim() } },
          { localName: { contains: q.trim() } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit,
      include: { adminDivisionConfig: true },
    })

    // 각 row의 부모 체인 — 추가 쿼리 비용 줄이려고 한 번에 모든 부모 조회
    const ancestorIds = new Set<string>()
    const collect = (id: string | null) => {
      if (id) ancestorIds.add(id)
    }
    for (const r of rows) collect(r.parentId)
    const ancestors = ancestorIds.size
      ? await this.prisma.administrativeDivision.findMany({
          where: { id: { in: Array.from(ancestorIds) } },
        })
      : []
    const byId = new Map(ancestors.map((a) => [a.id, a]))

    // 한 단계 부모만 가지고 있어 위로 더 추가 조회 필요할 수 있음 — 깊이 5 정도까지 안전 보강
    for (let depth = 0; depth < 5; depth++) {
      const need = new Set<string>()
      for (const a of byId.values()) {
        if (a.parentId && !byId.has(a.parentId)) need.add(a.parentId)
      }
      if (need.size === 0) break
      const more = await this.prisma.administrativeDivision.findMany({
        where: { id: { in: Array.from(need) } },
      })
      for (const m of more) byId.set(m.id, m)
    }

    return rows.map((r) => {
      const path: string[] = []
      let cursor: string | null = r.parentId ?? null
      while (cursor && byId.has(cursor)) {
        const node = byId.get(cursor)!
        path.unshift(node.name)
        cursor = node.parentId ?? null
      }
      const now = new Date()
      const abolished = !!(r.abolishedDate && r.abolishedDate <= now)
      return {
        id: r.id,
        name: r.name,
        localName: r.localName ?? null,
        countryId: r.countryId,
        divisionLevel: r.adminDivisionConfig.divisionLevel,
        divisionLabel: r.adminDivisionConfig.divisionLabel,
        parentPath: path,
        abolished,
        centerLat: r.centerLat != null ? Number(r.centerLat) : null,
        centerLng: r.centerLng != null ? Number(r.centerLng) : null,
      }
    })
  }

  /**
   * 행정구역 일괄 등록
   *
   * 같은 (countryId, level) 단위 + 같은 부모 아래에 N개 항목을 한 번에 생성.
   * 단위(adminDivisionId)가 없으면 divisionLabel로 새로 만든다 (그 결과 단위로 모두 생성).
   * 동일 이름이 이미 있으면 skipped에 기록.
   */
  async bulkCreateAdministrativeDivisions(
    body: BulkCreateAdministrativeDivisionsBody,
  ): Promise<BulkCreateResult> {
    if (!body.items?.length)
      return { created: 0, createdItems: [], skipped: [] }

    // 부모 검증
    if (body.parentId) {
      const parent = await this.prisma.administrativeDivision.findUnique({
        where: { id: body.parentId },
        include: { adminDivisionConfig: true },
      })
      if (!parent)
        throw new NotFoundException('상위 행정구역을 찾을 수 없습니다.')
      if (parent.countryId !== body.countryId) {
        throw new ConflictException('상위 행정구역의 국가가 일치하지 않습니다.')
      }
      if (parent.adminDivisionConfig.divisionLevel + 1 !== body.divisionLevel) {
        throw new ConflictException(
          `상위(${parent.adminDivisionConfig.divisionLevel}차) 바로 아래 단위는 ${parent.adminDivisionConfig.divisionLevel + 1}차여야 합니다.`,
        )
      }
    } else if (body.divisionLevel !== 1) {
      throw new ConflictException(
        '상위가 없는 일괄 등록은 1차 단위만 가능합니다.',
      )
    }

    // 단위 결정 + 항목 생성을 한 트랜잭션으로 묶는다.
    // (자동 생성한 config나 일부 항목만 남고 나머지가 실패하는 부분 커밋 방지)
    return this.prisma.$transaction(async (tx) => {
      // 단위 결정 — adminDivisionId 우선, 없으면 (countryId, divisionLevel)로 찾고, 그래도 없으면 새로 만듦
      let configId = body.adminDivisionId ?? null
      if (!configId) {
        const existing = await tx.countryAdminDivisionConfig.findFirst({
          where: {
            countryId: body.countryId,
            divisionLevel: body.divisionLevel,
          },
        })
        if (existing) {
          configId = existing.id
        } else if (body.divisionLabel?.trim()) {
          const created = await tx.countryAdminDivisionConfig.create({
            data: {
              countryId: body.countryId,
              divisionLevel: body.divisionLevel,
              divisionLabel: body.divisionLabel.trim(),
            },
          })
          configId = created.id
        } else {
          throw new ConflictException(
            '단위 ID 또는 단위명(divisionLabel)이 필요합니다.',
          )
        }
      } else {
        const cfg = await tx.countryAdminDivisionConfig.findUnique({
          where: { id: configId },
        })
        if (!cfg) throw new NotFoundException('단위를 찾을 수 없습니다.')
        if (cfg.countryId !== body.countryId) {
          throw new ConflictException('단위의 국가가 일치하지 않습니다.')
        }
        if (cfg.divisionLevel !== body.divisionLevel) {
          throw new ConflictException('단위 레벨이 일치하지 않습니다.')
        }
      }

      // 같은 부모 아래의 기존 이름 모음 — 중복 검사용
      const existingSiblings = await tx.administrativeDivision.findMany({
        where: {
          countryId: body.countryId,
          parentId: body.parentId ?? null,
        },
        select: { name: true },
      })
      const existingNames = new Set(existingSiblings.map((s) => s.name))

      const skipped: BulkCreateResult['skipped'] = []
      const createdItems: BulkCreateResult['createdItems'] = []
      const seen = new Set<string>()

      for (const item of body.items) {
        const name = item.name.trim()
        if (!name) {
          skipped.push({ name: item.name, reason: '이름이 비어있음' })
          continue
        }
        if (seen.has(name)) {
          skipped.push({ name, reason: '입력 안에 중복' })
          continue
        }
        if (existingNames.has(name)) {
          skipped.push({ name, reason: '같은 부모 아래 이미 존재' })
          continue
        }
        seen.add(name)
        const row = await tx.administrativeDivision.create({
          data: {
            countryId: body.countryId,
            adminDivisionId: configId!,
            parentId: body.parentId ?? undefined,
            name,
            localName: item.localName ?? undefined,
            nameMeaning: item.nameMeaning ?? undefined,
            centerLat: item.centerLat ?? undefined,
            centerLng: item.centerLng ?? undefined,
          },
        })
        createdItems.push({ id: row.id, name: row.name })
      }

      return { created: createdItems.length, createdItems, skipped }
    })
  }

  /** 행정구역 수정 */
  async updateAdministrativeDivision(
    id: string,
    body: UpdateAdministrativeDivisionBody,
  ): Promise<AdministrativeDivisionResponseDto> {
    const current = await this.prisma.administrativeDivision.findUnique({
      where: { id },
      include: { adminDivisionConfig: true },
    })
    if (!current) throw new NotFoundException('행정구역을 찾을 수 없습니다.')

    // 단위 변경 시 국가 일치 검증
    let nextConfig = current.adminDivisionConfig
    if (
      body.adminDivisionId != null &&
      body.adminDivisionId !== current.adminDivisionId
    ) {
      const newConfig = await this.prisma.countryAdminDivisionConfig.findUnique({
        where: { id: body.adminDivisionId },
      })
      if (!newConfig) throw new NotFoundException('단위를 찾을 수 없습니다.')
      if (newConfig.countryId !== current.countryId) {
        throw new ConflictException('단위의 국가가 일치하지 않습니다.')
      }
      // 레벨이 바뀌면 자식들의 (부모레벨+1=자식레벨) 불변식이 깨진다.
      // 자식이 있는 노드의 레벨 변경은 막아, 트리 정합성을 보장한다.
      if (
        newConfig.divisionLevel !== current.adminDivisionConfig.divisionLevel
      ) {
        const childCount = await this.prisma.administrativeDivision.count({
          where: { parentId: id },
        })
        if (childCount > 0) {
          throw new ConflictException(
            `하위 행정구역이 ${childCount}개 있어 단위 레벨을 변경할 수 없습니다. 하위를 먼저 옮기거나 삭제하세요.`,
          )
        }
      }
      nextConfig = newConfig
    }

    // 부모 변경 시 검증
    const nextParentId =
      body.parentId === undefined ? current.parentId : body.parentId
    if (nextParentId === id) {
      throw new ConflictException('자기 자신을 상위로 지정할 수 없습니다.')
    }
    if (nextParentId) {
      const parent = await this.prisma.administrativeDivision.findUnique({
        where: { id: nextParentId },
        include: { adminDivisionConfig: true },
      })
      if (!parent)
        throw new NotFoundException('상위 행정구역을 찾을 수 없습니다.')
      if (parent.countryId !== current.countryId) {
        throw new ConflictException('상위 행정구역의 국가가 일치하지 않습니다.')
      }
      if (
        parent.adminDivisionConfig.divisionLevel + 1 !==
        nextConfig.divisionLevel
      ) {
        throw new ConflictException(
          `상위(${parent.adminDivisionConfig.divisionLevel}차) 바로 아래 단위는 ${parent.adminDivisionConfig.divisionLevel + 1}차여야 합니다.`,
        )
      }
    } else if (nextConfig.divisionLevel !== 1) {
      throw new ConflictException('상위가 없는 행정구역은 1차 단위여야 합니다.')
    }

    const nextName = body.name ?? current.name
    if (
      nextName !== current.name ||
      (body.parentId !== undefined && nextParentId !== current.parentId)
    ) {
      const dup = await this.prisma.administrativeDivision.findFirst({
        where: {
          countryId: current.countryId,
          parentId: nextParentId ?? null,
          name: nextName,
          NOT: { id },
        },
      })
      if (dup) {
        throw new ConflictException(
          '같은 상위 안에 동일한 이름의 행정구역이 이미 있습니다.',
        )
      }
    }

    if (body.predecessorId !== undefined) {
      await this.validatePredecessor(body.predecessorId, current.countryId, id)
    }

    const row = await this.prisma.administrativeDivision.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.localName !== undefined && { localName: body.localName }),
        ...(body.nameMeaning !== undefined && { nameMeaning: body.nameMeaning }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.adminDivisionId != null && {
          adminDivisionId: body.adminDivisionId,
        }),
        ...(body.centerLat !== undefined && { centerLat: body.centerLat }),
        ...(body.centerLng !== undefined && { centerLng: body.centerLng }),
        ...(body.establishedDate !== undefined && {
          establishedDate: body.establishedDate
            ? new Date(body.establishedDate)
            : null,
        }),
        ...(body.abolishedDate !== undefined && {
          abolishedDate: body.abolishedDate
            ? new Date(body.abolishedDate)
            : null,
        }),
        ...(body.predecessorId !== undefined && {
          predecessorId: body.predecessorId,
        }),
      },
    })
    return this.toAdminDivisionDto(row as any, [])
  }

  /** 행정구역 삭제 (자식은 cascade로 함께 삭제됨) */
  async deleteAdministrativeDivision(id: string): Promise<void> {
    await this.prisma.administrativeDivision.delete({ where: { id } })
  }

  /** DB 도시 검색 (이름 부분 일치) */
  async searchCities(
    q?: string,
    countryId?: string,
  ): Promise<CityResponseDto[]> {
    if (!q || q.trim().length < 1) return []
    const list = await this.prisma.city.findMany({
      where: {
        name: { contains: q.trim() },
        ...(countryId ? { countryId } : {}),
      },
      orderBy: { name: 'asc' },
      take: 10,
      include: {
        administrativeDivision: { select: { id: true, name: true } },
      },
    })
    return list.map((c: any) => ({
      id: c.id,
      name: c.name,
      countryId: c.countryId,
      administrativeDivisionId: c.administrativeDivisionId ?? null,
      administrativeDivisionName: c.administrativeDivision?.name ?? null,
      population: c.population != null ? Number(c.population) : null,
      areaSqKm: c.areaSqKm != null ? String(c.areaSqKm) : null,
    }))
  }

  /** 도시 목록 조회 (선택: countryId / administrativeDivisionId로 필터) */
  async getCities(
    countryId?: string,
    administrativeDivisionId?: string,
  ): Promise<CityResponseDto[]> {
    const list = await this.prisma.city.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(administrativeDivisionId ? { administrativeDivisionId } : {}),
      },
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
      include: {
        administrativeDivision: { select: { id: true, name: true } },
      },
    })
    return list.map((c: any) => ({
      id: c.id,
      name: c.name,
      countryId: c.countryId,
      administrativeDivisionId: c.administrativeDivisionId ?? null,
      administrativeDivisionName: c.administrativeDivision?.name ?? null,
      population: c.population != null ? Number(c.population) : null,
      areaSqKm: c.areaSqKm != null ? String(c.areaSqKm) : null,
    }))
  }

  /**
   * Nominatim (OpenStreetMap) 장소 검색 프록시
   * 브라우저 CORS/User-Agent 제한 우회용
   */
  async searchPlaces(
    q?: string,
    countryCode?: string,
    limit?: string,
  ): Promise<PlaceSearchResult[]> {
    if (!q || q.trim().length < 2) return []

    const query = q.trim()
    const maxResults = limit ?? '8'

    const buildParams = (overrideQ?: string) => {
      const p = new URLSearchParams({
        q: overrideQ ?? query,
        format: 'json',
        addressdetails: '1',
        namedetails: '1',
        limit: maxResults,
        dedupe: '1',
        featuretype: 'city',
      })
      if (countryCode) p.set('countrycodes', countryCode.toLowerCase())
      return p
    }

    const nominatimFetch = async (
      params: URLSearchParams,
      lang: string,
    ): Promise<any[]> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: {
              'User-Agent': 'Papyrus-HistoryApp/1.0 (admin@papyrus.com)',
              'Accept-Language': lang,
            },
          },
        )
        if (!res.ok) return []
        return res.json()
      } catch {
        return []
      }
    }

    const mapItem = (item: any): PlaceSearchResult => {
      const addr = item.address ?? {}
      const namedetails = item.namedetails ?? {}
      const region = addr.state ?? addr.province ?? addr.county ?? ''
      // 한국어 이름 우선, 없으면 name 필드, 없으면 display_name 첫 토큰
      const shortName =
        namedetails['name:ko']?.trim() ||
        item.name?.trim() ||
        item.display_name.split(',')[0].trim()

      return {
        placeId: String(item.place_id),
        displayName: item.display_name,
        shortName,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        countryCode: addr.country_code?.toUpperCase(),
        country: addr.country,
        region,
        city: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '',
      }
    }

    try {
      // 1차: 한국어 Accept-Language로 검색
      let data = await nominatimFetch(buildParams(), 'ko,en')

      // 2차: 결과 없으면 featuretype 제한 풀고 재시도
      if (!data.length) {
        const p = buildParams()
        p.delete('featuretype')
        data = await nominatimFetch(p, 'ko,en')
      }

      // 3차: 그래도 없으면 영어로만
      if (!data.length) {
        data = await nominatimFetch(buildParams(), 'en')
      }

      return data.map(mapItem)
    } catch {
      return []
    }
  }
}
