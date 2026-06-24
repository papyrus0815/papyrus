import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AggregateType, EventMethod } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import { PointService } from '../../gamification/application/point.service'
import { completenessBonus } from '../../gamification/domain/point.policy'
import { NotificationService } from '../../notification/application/notification.service'
import { getActorAccountId } from '../../shared/actor-context'

import type {
  AdminDivisionConfigResponseDto,
  AdminDivisionSchemeResponseDto,
  AdminDivisionSectionResponseDto,
  AdministrativeDivisionResponseDto,
  CreateAdminDivisionSchemeBody,
  UpdateAdminDivisionSchemeBody,
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
 * 행정구역 소속 — 현대 국가(countryId) 또는 역사적 국가(historicalCountryId) 중 정확히 하나.
 */
type DivisionOwner = {
  countryId: string | null
  historicalCountryId: string | null
}

/**
 * City / AdministrativeDivision 도메인 비즈니스 로직.
 *
 * 컨트롤러(CityController)는 HTTP 매핑만 담당하고, 모든 검증·트랜잭션·쿼리는 여기에 모은다.
 * DTO 타입은 컨트롤러에 정의돼 있고(생성 SDK가 그 경로를 참조), 여기서는 type-only로 가져온다.
 */
@Injectable()
export class CityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly pointService: PointService,
  ) {}

  /**
   * 행정구역 완성도 신호 수 — 현지어 명칭·명칭 뜻·좌표·설립일.
   * 채울수록 보너스 점수 (PointService가 콘텐츠당 1회 멱등 처리).
   */
  private divisionCompletenessSignals(row: {
    localName?: string | null
    nameMeaning?: string | null
    centerLat?: unknown | null
    centerLng?: unknown | null
    establishedDate?: Date | null
  }): number {
    return [
      !!row.localName,
      !!row.nameMeaning,
      row.centerLat != null && row.centerLng != null,
      !!row.establishedDate,
    ].filter(Boolean).length
  }

  /** body의 countryId/historicalCountryId에서 소속을 결정 — 정확히 하나만 허용 */
  private resolveOwner(body: {
    countryId?: string | null
    historicalCountryId?: string | null
  }): DivisionOwner {
    const countryId = body.countryId ?? null
    const historicalCountryId = body.historicalCountryId ?? null
    if (!countryId === !historicalCountryId) {
      throw new ConflictException(
        'countryId 또는 historicalCountryId 중 정확히 하나를 지정해야 합니다.',
      )
    }
    return { countryId, historicalCountryId }
  }

  /** 두 행정구역/단위가 같은 소속(국가)인지 비교 */
  private isSameOwner(
    a: { countryId: string | null; historicalCountryId: string | null },
    b: { countryId: string | null; historicalCountryId: string | null },
  ): boolean {
    return (
      (a.countryId ?? null) === (b.countryId ?? null) &&
      (a.historicalCountryId ?? null) === (b.historicalCountryId ?? null)
    )
  }

  /**
   * 행정구역 트리 조회 (N-depth, 모든 자손 포함)
   *
   * Prisma의 nested include는 깊이 제한이 있어, 전체 row를 한 번에 가져와
   * application 레벨에서 트리 구성. 일반적인 행정구역 규모에서는 충분히 빠름.
   */
  async getAdministrativeDivisions(
    countryId?: string,
    historicalCountryId?: string,
    schemeId?: string,
  ): Promise<AdministrativeDivisionResponseDto[]> {
    const ownerWhere = countryId
      ? { countryId }
      : historicalCountryId
        ? { historicalCountryId }
        : {}
    const rows = await this.prisma.administrativeDivision.findMany({
      where: { ...ownerWhere, ...(schemeId ? { schemeId } : {}) },
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
      countryId: string | null
      historicalCountryId?: string | null
      adminDivisionId: string
      schemeId?: string | null
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
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      adminDivisionId: row.adminDivisionId,
      schemeId: row.schemeId ?? null,
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
   * @param owner 현재 행정구역의 소속 국가
   * @param selfId 수정 중인 행정구역 자신의 ID (생성 시 undefined)
   */
  private async validatePredecessor(
    predecessorId: string | null | undefined,
    owner: DivisionOwner,
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
    if (!this.isSameOwner(predecessor, owner)) {
      throw new ConflictException('이전 행정구역의 국가가 일치하지 않습니다.')
    }
  }

  /**
   * 국가별 행정구역 단위(레벨) 설정 조회.
   * schemeId가 있으면 그 체계 전용 + 체계 공용(schemeId NULL)을 함께 반환.
   */
  async getAdminDivisionConfigs(
    countryId?: string,
    historicalCountryId?: string,
    schemeId?: string,
  ): Promise<AdminDivisionConfigResponseDto[]> {
    if (!countryId && !historicalCountryId) return []
    const ownerWhere = countryId ? { countryId } : { historicalCountryId }
    const list = await this.prisma.countryAdminDivisionConfig.findMany({
      where: {
        ...ownerWhere,
        ...(schemeId ? { OR: [{ schemeId }, { schemeId: null }] } : {}),
      },
      orderBy: { divisionLevel: 'asc' },
    })
    return list.map((c) => ({
      id: c.id,
      countryId: c.countryId ?? null,
      historicalCountryId: c.historicalCountryId ?? null,
      schemeId: c.schemeId ?? null,
      divisionLevel: c.divisionLevel,
      divisionLabel: c.divisionLabel,
      description: c.description ?? null,
    }))
  }

  /** 행정구역 단위 생성 (예: "도", "주") */
  async createAdminDivisionConfig(
    body: CreateAdminDivisionConfigBody,
  ): Promise<AdminDivisionConfigResponseDto> {
    const owner = this.resolveOwner(body)
    if (body.schemeId) await this.validateScheme(body.schemeId, owner)
    // 중복 검사는 같은 체계 + 같은 (레벨, 라벨)에 한정 — 같은 레벨이라도 라벨이 다르면 공존 허용
    // (예: 미국 2차에 '카운티'와 '통합시'(NYC)가 함께 존재)
    const dup = await this.prisma.countryAdminDivisionConfig.findFirst({
      where: {
        ...owner,
        schemeId: body.schemeId ?? null,
        divisionLevel: body.divisionLevel,
        divisionLabel: body.divisionLabel,
      },
    })
    if (dup) {
      throw new ConflictException(
        `해당 국가의 ${body.divisionLevel}차에 '${body.divisionLabel}' 단위가 이미 존재합니다.`,
      )
    }
    const row = await this.prisma.countryAdminDivisionConfig.create({
      data: {
        ...owner,
        schemeId: body.schemeId ?? undefined,
        divisionLevel: body.divisionLevel,
        divisionLabel: body.divisionLabel,
        description: body.description ?? undefined,
      },
    })
    return {
      id: row.id,
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      schemeId: row.schemeId ?? null,
      divisionLevel: row.divisionLevel,
      divisionLabel: row.divisionLabel,
      description: row.description ?? null,
    }
  }

  /** schemeId 검증 — 존재 + 소속 국가 일치 */
  private async validateScheme(
    schemeId: string,
    owner: DivisionOwner,
  ): Promise<void> {
    const scheme = await this.prisma.adminDivisionScheme.findUnique({
      where: { id: schemeId },
    })
    if (!scheme) throw new NotFoundException('체계를 찾을 수 없습니다.')
    if (!this.isSameOwner(scheme, owner)) {
      throw new ConflictException('체계의 국가가 일치하지 않습니다.')
    }
  }

  /** 행정구역 체계 목록 (all=true면 전체 + 소속 국가 표시명) */
  async getAdminDivisionSchemes(
    countryId?: string,
    historicalCountryId?: string,
    all = false,
  ): Promise<AdminDivisionSchemeResponseDto[]> {
    if (!all && !countryId && !historicalCountryId) return []
    const rows = await this.prisma.adminDivisionScheme.findMany({
      where: all
        ? {}
        : countryId
          ? { countryId }
          : { historicalCountryId },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { divisions: true } },
        country: { select: { name: true } },
        historicalCountry: { select: { name: true } },
      },
    })
    return rows.map((r) => ({
      id: r.id,
      countryId: r.countryId ?? null,
      historicalCountryId: r.historicalCountryId ?? null,
      name: r.name,
      description: r.description ?? null,
      startDate: r.startDate ? r.startDate.toISOString() : null,
      endDate: r.endDate ? r.endDate.toISOString() : null,
      divisionCount: r._count.divisions,
      ownerName: r.country?.name ?? r.historicalCountry?.name ?? null,
    }))
  }

  /**
   * 체계 시행일 파싱 — 빈 값이면 null.
   * MySQL DATETIME은 기원전(음수 연도)을 저장할 수 없어 명시적으로 거부한다.
   */
  private parseSchemeDate(
    value: string | null | undefined,
    label: string,
  ): Date | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('-')) {
      throw new BadRequestException(
        `${label}에 기원전 날짜는 저장할 수 없습니다 — 비워 두세요.`,
      )
    }
    const date = new Date(trimmed)
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} 형식이 올바르지 않습니다.`)
    }
    return date
  }

  /** 체계 이름 정리 — 공백뿐인 이름 거부 */
  private normalizeSchemeName(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new BadRequestException('체계 이름을 입력해 주세요.')
    }
    return trimmed
  }

  /** 시행 시작일 <= 종료일 검증 */
  private assertSchemeDateRange(
    startDate: Date | null,
    endDate: Date | null,
  ): void {
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('시행 종료일은 시작일 이후여야 합니다.')
    }
  }

  /** 행정구역 체계 생성 */
  async createAdminDivisionScheme(
    body: CreateAdminDivisionSchemeBody,
  ): Promise<AdminDivisionSchemeResponseDto> {
    const owner = this.resolveOwner(body)
    const startDate = this.parseSchemeDate(body.startDate, '시행 시작일')
    const endDate = this.parseSchemeDate(body.endDate, '시행 종료일')
    this.assertSchemeDateRange(startDate, endDate)
    const row = await this.prisma.adminDivisionScheme.create({
      data: {
        ...owner,
        name: this.normalizeSchemeName(body.name),
        description: body.description ?? undefined,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
      },
    })
    await this.notificationService.notifyAdministrativeDivision(
      `${row.name} 체계`,
      EventMethod.CREATE,
      row.id,
    )
    return {
      id: row.id,
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      name: row.name,
      description: row.description ?? null,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
      divisionCount: 0,
    }
  }

  /** 행정구역 체계 수정 */
  async updateAdminDivisionScheme(
    id: string,
    body: UpdateAdminDivisionSchemeBody,
  ): Promise<AdminDivisionSchemeResponseDto> {
    const current = await this.prisma.adminDivisionScheme.findUnique({
      where: { id },
    })
    if (!current) throw new NotFoundException('체계를 찾을 수 없습니다.')
    // 변경 후 시행 기간이 유효한지 — 한쪽만 바뀌어도 기존 값과 교차 검증
    const nextStartDate =
      body.startDate !== undefined
        ? this.parseSchemeDate(body.startDate, '시행 시작일')
        : current.startDate
    const nextEndDate =
      body.endDate !== undefined
        ? this.parseSchemeDate(body.endDate, '시행 종료일')
        : current.endDate
    this.assertSchemeDateRange(nextStartDate, nextEndDate)
    const row = await this.prisma.adminDivisionScheme.update({
      where: { id },
      data: {
        ...(body.name != null && { name: this.normalizeSchemeName(body.name) }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.startDate !== undefined && { startDate: nextStartDate }),
        ...(body.endDate !== undefined && { endDate: nextEndDate }),
      },
      include: { _count: { select: { divisions: true } } },
    })
    await this.notificationService.notifyAdministrativeDivision(
      `${row.name} 체계`,
      EventMethod.UPDATE,
      row.id,
    )
    return {
      id: row.id,
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      name: row.name,
      description: row.description ?? null,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
      divisionCount: row._count.divisions,
    }
  }

  /** 행정구역 체계 삭제 — 소속 구역이나 체계 전용 단위가 있으면 거부 */
  async deleteAdminDivisionScheme(id: string): Promise<void> {
    const divCount = await this.prisma.administrativeDivision.count({
      where: {
        OR: [{ schemeId: id }, { adminDivisionConfig: { schemeId: id } }],
      },
    })
    if (divCount > 0) {
      throw new ConflictException(
        `이 체계에 등록된 행정구역이 ${divCount}개 있어 삭제할 수 없습니다. 먼저 구역을 삭제하거나 다른 체계로 옮기세요.`,
      )
    }
    const row = await this.prisma.adminDivisionScheme.findUnique({
      where: { id },
      select: { name: true },
    })
    await this.prisma.adminDivisionScheme.delete({ where: { id } })
    if (row) {
      await this.notificationService.notifyAdministrativeDivision(
        `${row.name} 체계`,
        EventMethod.DELETE,
        id,
      )
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

    // (레벨, 라벨) 쌍 기준 중복 검사 — 레벨/라벨 어느 쪽이 바뀌든 충돌 방지
    const nextLevel = body.divisionLevel ?? current.divisionLevel
    const nextLabel = body.divisionLabel ?? current.divisionLabel
    if (
      nextLevel !== current.divisionLevel ||
      nextLabel !== current.divisionLabel
    ) {
      // 같은 체계 범위 안에서만 (수정으로 체계는 못 바꿈)
      const dup = await this.prisma.countryAdminDivisionConfig.findFirst({
        where: {
          countryId: current.countryId,
          historicalCountryId: current.historicalCountryId,
          schemeId: current.schemeId ?? null,
          divisionLevel: nextLevel,
          divisionLabel: nextLabel,
          NOT: { id },
        },
      })
      if (dup) {
        throw new ConflictException(
          `해당 국가의 ${nextLevel}차에 '${nextLabel}' 단위가 이미 존재합니다.`,
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
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
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
    const owner = this.resolveOwner(body)
    if (body.schemeId) await this.validateScheme(body.schemeId, owner)
    const config = await this.prisma.countryAdminDivisionConfig.findUnique({
      where: { id: body.adminDivisionId },
    })
    if (!config) throw new NotFoundException('단위를 찾을 수 없습니다.')
    if (!this.isSameOwner(config, owner)) {
      throw new ConflictException('단위의 국가가 일치하지 않습니다.')
    }

    // 체계 결정 — 명시값 우선, 미지정이면 부모의 체계를 상속 (트리 한 그루 = 한 체계)
    let effectiveSchemeId: string | null = body.schemeId ?? null

    if (body.parentId) {
      const parent = await this.prisma.administrativeDivision.findUnique({
        where: { id: body.parentId },
        include: { adminDivisionConfig: true },
      })
      if (!parent)
        throw new NotFoundException('상위 행정구역을 찾을 수 없습니다.')
      if (!this.isSameOwner(parent, owner)) {
        throw new ConflictException('상위 행정구역의 국가가 일치하지 않습니다.')
      }
      if (parent.adminDivisionConfig.divisionLevel + 1 !== config.divisionLevel) {
        throw new ConflictException(
          `상위(${parent.adminDivisionConfig.divisionLevel}차) 바로 아래 단위는 ${parent.adminDivisionConfig.divisionLevel + 1}차여야 합니다.`,
        )
      }
      if (body.schemeId == null) {
        effectiveSchemeId = parent.schemeId ?? null
      } else if ((parent.schemeId ?? null) !== body.schemeId) {
        throw new ConflictException(
          '상위 행정구역과 같은 체계에 속해야 합니다.',
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

    // 체계 전용 단위는 같은 체계의 행정구역에만 사용 가능 (공용 단위는 어디서나 가능)
    if (config.schemeId != null && config.schemeId !== effectiveSchemeId) {
      throw new ConflictException(
        '단위의 체계가 일치하지 않습니다. 같은 체계(또는 공용) 단위를 사용하세요.',
      )
    }

    // 중복 검사는 같은 체계 범위 안에서만 — 다른 체계의 동명 구역(예: 팔도제/13도제의 경기도) 허용
    const dup = await this.prisma.administrativeDivision.findFirst({
      where: {
        ...owner,
        schemeId: effectiveSchemeId ?? null,
        parentId: body.parentId ?? null,
        name: body.name,
      },
    })
    if (dup) {
      throw new ConflictException(
        '같은 상위 안에 동일한 이름의 행정구역이 이미 있습니다.',
      )
    }

    await this.validatePredecessor(body.predecessorId, owner)

    const row = await this.prisma.administrativeDivision.create({
      data: {
        ...owner,
        adminDivisionId: body.adminDivisionId,
        schemeId: effectiveSchemeId ?? undefined,
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

    await this.notificationService.notifyAdministrativeDivision(
      row.name,
      EventMethod.CREATE,
      row.id,
    )
    await this.pointService.awardForCreate(
      getActorAccountId(),
      AggregateType.ADMINISTRATIVE_DIVISION,
      row.id,
      completenessBonus(this.divisionCompletenessSignals(row)),
    )

    return this.toAdminDivisionDto(row as any, [])
  }

  /**
   * 행정구역 평탄 검색 (모든 깊이 — 부모 경로 포함)
   */
  async searchAdministrativeDivisions(
    q?: string,
    countryId?: string,
    limitStr?: string,
    historicalCountryId?: string,
    schemeId?: string,
  ): Promise<AdministrativeDivisionSearchResult[]> {
    if (!q || q.trim().length < 1) return []
    const limit = Math.min(200, Math.max(1, Number(limitStr) || 20))
    const rows = await this.prisma.administrativeDivision.findMany({
      where: {
        ...(countryId
          ? { countryId }
          : historicalCountryId
            ? { historicalCountryId }
            : {}),
        ...(schemeId ? { schemeId } : {}),
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
        countryId: r.countryId ?? null,
        historicalCountryId: r.historicalCountryId ?? null,
        schemeId: r.schemeId ?? null,
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

    const owner = this.resolveOwner(body)
    if (body.schemeId) await this.validateScheme(body.schemeId, owner)

    // 체계 결정 — 명시값 우선, 미지정이면 부모의 체계를 상속
    let effectiveSchemeId: string | null = body.schemeId ?? null

    // 부모 검증
    if (body.parentId) {
      const parent = await this.prisma.administrativeDivision.findUnique({
        where: { id: body.parentId },
        include: { adminDivisionConfig: true },
      })
      if (!parent)
        throw new NotFoundException('상위 행정구역을 찾을 수 없습니다.')
      if (!this.isSameOwner(parent, owner)) {
        throw new ConflictException('상위 행정구역의 국가가 일치하지 않습니다.')
      }
      if (parent.adminDivisionConfig.divisionLevel + 1 !== body.divisionLevel) {
        throw new ConflictException(
          `상위(${parent.adminDivisionConfig.divisionLevel}차) 바로 아래 단위는 ${parent.adminDivisionConfig.divisionLevel + 1}차여야 합니다.`,
        )
      }
      if (body.schemeId == null) {
        effectiveSchemeId = parent.schemeId ?? null
      } else if ((parent.schemeId ?? null) !== body.schemeId) {
        throw new ConflictException(
          '상위 행정구역과 같은 체계에 속해야 합니다.',
        )
      }
    } else if (body.divisionLevel !== 1) {
      throw new ConflictException(
        '상위가 없는 일괄 등록은 1차 단위만 가능합니다.',
      )
    }

    // 단위 결정 + 항목 생성을 한 트랜잭션으로 묶는다.
    // (자동 생성한 config나 일부 항목만 남고 나머지가 실패하는 부분 커밋 방지)
    const result = await this.prisma.$transaction(async (tx) => {
      // 단위 결정 — adminDivisionId 우선. 없으면 라벨로 (레벨,라벨) 매칭/생성,
      // 라벨도 없으면 해당 레벨 단위가 유일할 때만 자동 선택(복수면 모호 → 명시 요구).
      let configId = body.adminDivisionId ?? null
      if (!configId) {
        const label = body.divisionLabel?.trim()
        if (label) {
          const existing = await tx.countryAdminDivisionConfig.findFirst({
            where: {
              ...owner,
              schemeId: effectiveSchemeId,
              divisionLevel: body.divisionLevel,
              divisionLabel: label,
            },
          })
          configId =
            existing?.id ??
            (
              await tx.countryAdminDivisionConfig.create({
                data: {
                  ...owner,
                  schemeId: effectiveSchemeId ?? undefined,
                  divisionLevel: body.divisionLevel,
                  divisionLabel: label,
                },
              })
            ).id
        } else {
          const atLevel = await tx.countryAdminDivisionConfig.findMany({
            where: {
              ...owner,
              schemeId: effectiveSchemeId,
              divisionLevel: body.divisionLevel,
            },
            take: 2,
          })
          if (atLevel.length === 1) {
            configId = atLevel[0]!.id
          } else if (atLevel.length === 0) {
            throw new ConflictException(
              '단위 ID 또는 단위명(divisionLabel)이 필요합니다.',
            )
          } else {
            throw new ConflictException(
              `${body.divisionLevel}차에 단위가 여러 개입니다. adminDivisionId 또는 divisionLabel로 단위를 지정하세요.`,
            )
          }
        }
      } else {
        const cfg = await tx.countryAdminDivisionConfig.findUnique({
          where: { id: configId },
        })
        if (!cfg) throw new NotFoundException('단위를 찾을 수 없습니다.')
        if (!this.isSameOwner(cfg, owner)) {
          throw new ConflictException('단위의 국가가 일치하지 않습니다.')
        }
        if (cfg.divisionLevel !== body.divisionLevel) {
          throw new ConflictException('단위 레벨이 일치하지 않습니다.')
        }
        // 체계 전용 단위는 같은 체계의 행정구역에만 사용 가능 (공용 단위는 어디서나 가능)
        if (cfg.schemeId != null && cfg.schemeId !== effectiveSchemeId) {
          throw new ConflictException(
            '단위의 체계가 일치하지 않습니다. 같은 체계(또는 공용) 단위를 사용하세요.',
          )
        }
      }

      // 같은 부모·같은 체계 아래의 기존 이름 모음 — 중복 검사용
      const existingSiblings = await tx.administrativeDivision.findMany({
        where: {
          ...owner,
          schemeId: effectiveSchemeId ?? null,
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
            ...owner,
            adminDivisionId: configId!,
            schemeId: effectiveSchemeId ?? undefined,
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

    // 알림(요약 1건) + 항목별 점수 적립 — 트랜잭션 커밋 후에만
    if (result.createdItems.length > 0) {
      const first = result.createdItems[0]!
      const label =
        result.createdItems.length === 1
          ? first.name
          : `${first.name} 외 ${result.createdItems.length - 1}개`
      await this.notificationService.notifyAdministrativeDivision(
        label,
        EventMethod.CREATE,
        first.id,
      )
      await this.pointService.awardForCreateMany(
        getActorAccountId(),
        AggregateType.ADMINISTRATIVE_DIVISION,
        result.createdItems.map((item) => item.id),
      )
    }

    return result
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
      if (!this.isSameOwner(newConfig, current)) {
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
    const nextSchemeId =
      body.schemeId !== undefined ? body.schemeId : (current.schemeId ?? null)
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
      if (!this.isSameOwner(parent, current)) {
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
      if ((parent.schemeId ?? null) !== (nextSchemeId ?? null)) {
        throw new ConflictException(
          '상위 행정구역과 같은 체계에 속해야 합니다. 최상위 구역의 체계를 바꾸면 하위가 함께 이동합니다.',
        )
      }
    } else if (nextConfig.divisionLevel !== 1) {
      throw new ConflictException('상위가 없는 행정구역은 1차 단위여야 합니다.')
    }

    // 체계 전용 단위는 (변경 후) 같은 체계의 행정구역에만 사용 가능 (공용 단위는 어디서나 가능)
    if (
      nextConfig.schemeId != null &&
      nextConfig.schemeId !== (nextSchemeId ?? null)
    ) {
      throw new ConflictException(
        '단위의 체계가 일치하지 않습니다. 같은 체계(또는 공용) 단위를 사용하세요.',
      )
    }

    const nextName = body.name ?? current.name
    if (
      nextName !== current.name ||
      (body.parentId !== undefined && nextParentId !== current.parentId)
    ) {
      // 중복 검사는 (변경 후) 같은 체계 범위 안에서만 — 다른 체계의 동명 구역 허용
      const dup = await this.prisma.administrativeDivision.findFirst({
        where: {
          countryId: current.countryId,
          historicalCountryId: current.historicalCountryId,
          schemeId: nextSchemeId ?? null,
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
      await this.validatePredecessor(
        body.predecessorId,
        {
          countryId: current.countryId,
          historicalCountryId: current.historicalCountryId,
        },
        id,
      )
    }

    if (body.schemeId != null) {
      await this.validateScheme(body.schemeId, {
        countryId: current.countryId,
        historicalCountryId: current.historicalCountryId,
      })
    }

    // 본체 수정 + 체계 변경 하위 동반 이동 + 섹션 교체를 한 트랜잭션으로 —
    // 중간 실패 시 한 트리가 두 체계에 걸치거나 섹션만 유실되는 부분 커밋 방지
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.administrativeDivision.update({
        where: { id },
        data: {
          ...(body.name != null && { name: body.name }),
          ...(body.localName !== undefined && { localName: body.localName }),
          ...(body.nameMeaning !== undefined && {
            nameMeaning: body.nameMeaning,
          }),
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
          ...(body.schemeId !== undefined && { schemeId: body.schemeId }),
        },
      })

      // 체계 변경 시 하위 트리 전체 동반 이동 — 한 트리가 두 체계에 걸치지 않도록
      if (
        body.schemeId !== undefined &&
        (body.schemeId ?? null) !== (current.schemeId ?? null)
      ) {
        let frontier: string[] = [id]
        while (frontier.length > 0) {
          const children = await tx.administrativeDivision.findMany({
            where: { parentId: { in: frontier } },
            select: { id: true },
          })
          if (children.length === 0) break
          const ids = children.map((c) => c.id)
          await tx.administrativeDivision.updateMany({
            where: { id: { in: ids } },
            data: { schemeId: body.schemeId },
          })
          frontier = ids
        }
      }

      // 서술 섹션 전체 교체 — EventSection과 동일한 delete-and-recreate
      if (body.sections !== undefined) {
        await tx.administrativeDivisionSection.deleteMany({
          where: { administrativeDivisionId: id },
        })
        if (body.sections.length > 0) {
          await tx.administrativeDivisionSection.createMany({
            data: body.sections.map((s, index) => ({
              administrativeDivisionId: id,
              title: s.title,
              content: s.content,
              order: s.order !== undefined ? s.order : index,
            })),
          })
        }
      }

      return updated
    })

    await this.notificationService.notifyAdministrativeDivision(
      row.name,
      EventMethod.UPDATE,
      row.id,
    )
    // 수정으로 필드를 채웠으면 완성도 보너스 (콘텐츠당 1회 멱등)
    await this.pointService.awardCompletenessBonus(
      getActorAccountId(),
      AggregateType.ADMINISTRATIVE_DIVISION,
      id,
      completenessBonus(this.divisionCompletenessSignals(row)),
    )
    // 설립일이 바뀌면 세기별 리더보드 귀속도 다시 스탬프
    if (body.establishedDate !== undefined) {
      await this.pointService.restampContentCentury(
        AggregateType.ADMINISTRATIVE_DIVISION,
        id,
      )
    }

    return this.toAdminDivisionDto(row as any, [])
  }

  /** 행정구역 서술 섹션 조회 (order 순) */
  async getAdministrativeDivisionSections(
    id: string,
  ): Promise<AdminDivisionSectionResponseDto[]> {
    const rows = await this.prisma.administrativeDivisionSection.findMany({
      where: { administrativeDivisionId: id },
      orderBy: { order: 'asc' },
    })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      order: r.order,
    }))
  }

  /** 행정구역 삭제 (자식은 cascade로 함께 삭제됨 — 하위 포함 점수 회수) */
  async deleteAdministrativeDivision(id: string): Promise<void> {
    const root = await this.prisma.administrativeDivision.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!root) throw new NotFoundException('행정구역을 찾을 수 없습니다.')

    // cascade로 함께 지워질 하위 ID를 미리 수집 (점수 회수 대상)
    const allIds: string[] = [id]
    let frontier: string[] = [id]
    while (frontier.length > 0) {
      const children = await this.prisma.administrativeDivision.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      })
      if (children.length === 0) break
      frontier = children.map((c) => c.id)
      allIds.push(...frontier)
    }

    await this.prisma.administrativeDivision.delete({ where: { id } })

    await this.notificationService.notifyAdministrativeDivision(
      root.name,
      EventMethod.DELETE,
      id,
    )
    await this.pointService.revokeForRecordMany(
      AggregateType.ADMINISTRATIVE_DIVISION,
      allIds,
    )
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
