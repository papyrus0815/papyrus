import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common'
import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import {
  RECORD_INCLUDE,
  serializeRecord,
} from '../application/trade.serializer'
import {
  assertPeriodOrder,
  buildFlowCreateData,
  buildRecordWritable,
} from '../application/trade-write.util'

import type {
  ExportImportResponse,
  UpsertTradeRecordDto,
} from './dto/trade.dto'

export interface TradeRecordListQuery {
  /** 현대 국가 — 브리지로 연결된 역사 국가 자료까지 함께 온다 */
  countryId?: string
  /** 역사 국가 단독 */
  historicalCountryId?: string
  /** 부호 있는 연도 범위 (음수는 기원전) */
  fromYearSigned?: number
  toYearSigned?: number
}

/**
 * 교역 기록 — 현대 국가와 역사 국가를 한 엔드포인트에서 다룬다.
 *
 * 기존 `/countries/:id/export-imports`는 현대 국가 전용이라 조선·청의 교역을 담을 수
 * 없었다. 이 컨트롤러는 주체를 몸통에 실어 둘 다 받는다.
 */
@ApiTags('trade')
@Controller('trade/records')
@UseGuards(AuthGuard('jwt'))
export class TradeRecordController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 교역 기록 목록.
   *
   * `countryId`를 주면 그 현대 국가에 브리지로 연결된 **역사 국가의 교역까지** 함께
   * 온다(정체·법령·사건과 같은 스코프 규약) — 대한민국을 열면 대한제국·조선의 교역이
   * 한 시간축에 놓인다.
   *
   * @tag trade
   */
  @TypedRoute.Get()
  async list(
    @TypedQuery() query: TradeRecordListQuery,
  ): Promise<ExportImportResponse[]> {
    let where: Prisma.ExportImportWhereInput = {}

    if (query.countryId) {
      where = (await resolveCountryScopeOr(
        this.prisma,
        query.countryId,
      )) as Prisma.ExportImportWhereInput
    } else if (query.historicalCountryId) {
      where.historicalCountryId = query.historicalCountryId
    }

    const rows = await this.prisma.exportImport.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: RECORD_INCLUDE,
    })

    /*
     * 정렬은 부호 연도로 — DB의 (era, year)를 그대로 정렬하면 기원전이 뒤집힌다.
     * 범위 필터도 같은 이유로 여기서 건다(BC 조건을 SQL에 올리면 era 분기가 늘어난다).
     */
    return rows
      .map(serializeRecord)
      .filter((row) => {
        if (query.fromYearSigned != null && row.signedYear < query.fromYearSigned)
          return false
        if (query.toYearSigned != null && row.signedYear > query.toYearSigned)
          return false
        return true
      })
      .sort((left, right) => left.signedYear - right.signedYear)
  }

  /**
   * 교역 기록 단건.
   * @tag trade
   */
  @TypedRoute.Get(':id')
  async detail(@TypedParam('id') id: string): Promise<ExportImportResponse> {
    const row = await this.prisma.exportImport.findUnique({
      where: { id },
      include: RECORD_INCLUDE,
    })
    if (!row) throw new NotFoundException('교역 기록을 찾을 수 없습니다.')
    return serializeRecord(row)
  }

  /**
   * 교역 기록 생성/갱신 — (주체 · era · year) 기준 upsert.
   * @tag trade
   */
  @TypedRoute.Post()
  async upsert(
    @TypedBody() dto: UpsertTradeRecordDto,
  ): Promise<ExportImportResponse> {
    const countryId = dto.countryId || null
    const historicalCountryId = dto.historicalCountryId || null
    if ((countryId == null) === (historicalCountryId == null)) {
      throw new BadRequestException(
        '주체는 현대 국가 또는 역사 국가 중 하나만 지정해야 합니다.',
      )
    }
    assertPeriodOrder(dto)

    const era = dto.era ?? 'AD'
    const writable = buildRecordWritable(dto)

    const row = await this.prisma.$transaction(async (tx) => {
      /*
       * 총액과 흐름은 한 트랜잭션이다 — 흐름 교체가 실패했는데 총액만 바뀌어 있으면
       * "수출 6.8조인데 품목은 작년 것"인 상태가 남는다.
       */
      const existing = await tx.exportImport.findFirst({
        where: { countryId, historicalCountryId, era, year: dto.year },
        select: { id: true },
      })

      const parent = existing
        ? await tx.exportImport.update({
            where: { id: existing.id },
            data: writable,
          })
        : await tx.exportImport.create({
            data: {
              countryId,
              historicalCountryId,
              era,
              year: dto.year,
              ...writable,
            },
          })

      if (dto.items !== undefined) {
        await tx.exportImportItem.deleteMany({
          where: { exportImportId: parent.id },
        })
        if (dto.items.length > 0) {
          const data = await buildFlowCreateData(tx as never, parent.id, dto.items)
          await tx.exportImportItem.createMany({ data: data as never })
        }
      }

      return tx.exportImport.findUniqueOrThrow({
        where: { id: parent.id },
        include: RECORD_INCLUDE,
      })
    })

    return serializeRecord(row)
  }

  /**
   * 교역 기록 삭제 (그 해 흐름도 함께).
   * @tag trade
   */
  @TypedRoute.Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TypedParam('id') id: string): Promise<void> {
    await this.prisma.exportImport.delete({ where: { id } })
  }
}
