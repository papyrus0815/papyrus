/**
 * 재위 행 시드 헬퍼 — 옛 `prisma.sovereignReign` 호출 모양을 재임 테이블로 옮긴다.
 *
 * 직위 보유 단일 모델 4단계에서 sovereign_reign 테이블이 사라졌다. 재위는 이제 재임
 * (government_position_tenure) 가운데 직위 정의가 군주직인 행이다. 군주 시드 수십 개가
 * `prisma.sovereignReign.findFirst/create/update…`로 짜여 있어, 호출 모양은 그대로 두고
 * 받는 쪽만 바꾼다: `prisma.sovereignReign.X(args)` → `reignRows(prisma).X(args)`.
 *
 * 번역 규칙
 * - 재위의 `regnalNumber`(국가 통산 대수) ↔ 재임 `ordinal`(대수 칸은 이것 하나). where·select·orderBy·data 모두.
 * - 재위의 `termNumber`는 의미 없는 칸이었다 — 버린다.
 * - 직위 정의가 없으면 '국왕' 정의로, `positionType`(재임 필수)은 정의에서 온다.
 * - `endDatePrecision`은 재임에 칸이 없다 — 종료 구조화 칸(연·월·일)을 자르는 데만 쓴다.
 *   시작은 DATETIME만 넘기면 DB 트리거가 구조화 칸(정본)으로 옮기고 DATETIME·키를 다시 파생한다(20261023051000).
 * - 결과는 직위 보유 행(asOfficeHolding)에 시드 어휘 regnalNumber(= 대수 ordinal)를 얹어 돌려준다 — 시드 코드가 그대로 읽는다.
 *
 * 범위: 군주직 행. 군주직이 아닌 직위를 '재위 시드'로 쓰는 경우(도쿠가와 쇼군은 정부수반으로
 * 재분류됐다)는 `{ alsoDefinitionIds: [쇼군 정의 id] }`로 그 정의의 행까지 넓힌다 —
 * 범위가 어긋나면 재실행 때 '이미 있음'을 못 찾아 중복 행을 만든다.
 */
import type { GovernmentPositionType, Prisma, PrismaClient } from '@prisma/client'

import { MONARCHICAL_TENURE, asOfficeHolding } from '../../../src/libs/person/infrastructure/office-holding.query'

import { nearestUtcMidnight, normalizeDateWhere } from './date-only'

type AnyArgs = Record<string, any>

export interface ReignRowsOptions {
  /** 군주직 행에 더해 재위로 다룰 직위 정의 id (군주직이 아닌 정의를 재위 시드로 쓸 때) */
  alsoDefinitionIds?: readonly string[]
}

/** 객체 키 regnalNumber → ordinal (where의 AND/OR/NOT 안쪽까지) */
function renameRegnalNumber(value: any): any {
  if (Array.isArray(value)) return value.map(renameRegnalNumber)
  if (value == null || typeof value !== 'object' || value instanceof Date) return value
  const out: AnyArgs = {}
  for (const [key, inner] of Object.entries(value)) {
    if (key === 'regnalNumber') out.ordinal = inner
    else if (key === 'AND' || key === 'OR' || key === 'NOT') out[key] = renameRegnalNumber(inner)
    else out[key] = inner
  }
  return out
}

function mapReadArgs(args: AnyArgs = {}, scope: Prisma.GovernmentPositionTenureWhereInput): AnyArgs {
  const mapped: AnyArgs = { ...args }
  mapped.where = { AND: [normalizeDateWhere(renameRegnalNumber(args.where ?? {})), scope] }
  if (args.select) mapped.select = renameRegnalNumber(args.select)
  if (args.orderBy) mapped.orderBy = renameRegnalNumber(args.orderBy)
  return mapped
}

/** 종료 구조화 칸 — DATETIME + 종료 정밀도(재임엔 칸이 없어 여기서만 쓴다) */
function endColumns(endDate: Date | string | null | undefined, endDatePrecision: string | null | undefined) {
  if (endDate == null) return {}
  // 시드는 로컬 자정으로 Date를 만든다 — 가장 가까운 UTC 자정으로 읽어 시간대에 흔들리지 않게(DB 트리거와 같은 규칙)
  const date = nearestUtcMidnight(endDate instanceof Date ? endDate : new Date(endDate))
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1000) return {}
  return {
    endEra: 'AD' as const,
    endYear: date.getUTCFullYear(),
    endMonth: endDatePrecision === 'year' ? null : date.getUTCMonth() + 1,
    endDay: endDatePrecision === 'year' || endDatePrecision === 'month' ? null : date.getUTCDate(),
  }
}

export function reignRows(prisma: PrismaClient, options: ReignRowsOptions = {}) {
  const extraIds = (options.alsoDefinitionIds ?? []).filter(Boolean)
  const scope: Prisma.GovernmentPositionTenureWhereInput = extraIds.length
    ? { OR: [MONARCHICAL_TENURE, { positionDefinitionId: { in: [...extraIds] } }] }
    : MONARCHICAL_TENURE
  const table = prisma.governmentPositionTenure

  async function definitionFor(positionDefinitionId: string | null | undefined) {
    const definition = positionDefinitionId
      ? await prisma.governmentPositionDefinition.findUnique({
          where: { id: positionDefinitionId },
          select: { id: true, positionType: true },
        })
      : await prisma.governmentPositionDefinition.findFirst({
          where: { title: '국왕', isMonarchical: true },
          select: { id: true, positionType: true },
        })
    if (!definition) throw new Error(`[reignRows] 직위 정의 없음: ${positionDefinitionId ?? '국왕'}`)
    return definition as { id: string; positionType: GovernmentPositionType }
  }

  async function mapWriteData(data: AnyArgs, isCreate: boolean): Promise<AnyArgs> {
    const { regnalNumber, termNumber: _meaninglessReignTermNumber, endDatePrecision, ...rest } = data
    const out: AnyArgs = { ...rest }
    if (regnalNumber !== undefined) out.ordinal = regnalNumber
    if (isCreate || rest.positionDefinitionId !== undefined) {
      const definition = await definitionFor(rest.positionDefinitionId)
      out.positionDefinitionId = definition.id
      out.positionType = definition.positionType
    }
    if (rest.endDate !== undefined && rest.endYear === undefined) {
      Object.assign(out, endColumns(rest.endDate, endDatePrecision))
    }
    return out
  }

  // 시드 어휘: regnalNumber = 대수(ordinal)
  const asReign = (row: any) => (row ? { ...asOfficeHolding(row, true), regnalNumber: row.ordinal ?? null } : row)

  return {
    async findFirst(args: AnyArgs = {}): Promise<any> {
      return asReign(await table.findFirst(mapReadArgs(args, scope) as any))
    },
    async findMany(args: AnyArgs = {}): Promise<any[]> {
      const rows = await table.findMany(mapReadArgs(args, scope) as any)
      return rows.map(asReign)
    },
    async count(args: AnyArgs = {}): Promise<number> {
      return table.count({ where: mapReadArgs(args, scope).where } as any)
    },
    async create(args: AnyArgs): Promise<any> {
      const { data, ...rest } = args
      return asReign(await table.create({ ...renameRegnalNumber(rest), data: await mapWriteData(data, true) } as any))
    },
    /** update는 id로 한 행을 고른다 — 범위 밖 행이면 Prisma가 '없음'으로 실패한다 */
    async update(args: AnyArgs): Promise<any> {
      const { data, where, ...rest } = args
      const target = await table.findFirst({ where: { AND: [normalizeDateWhere(renameRegnalNumber(where)), scope] }, select: { id: true } })
      if (!target) throw new Error(`[reignRows] 범위 안의 재위 행 없음: ${JSON.stringify(where)}`)
      return asReign(
        await table.update({ ...renameRegnalNumber(rest), where: { id: target.id }, data: await mapWriteData(data, false) } as any),
      )
    },
    async updateMany(args: AnyArgs): Promise<Prisma.BatchPayload> {
      const data = await mapWriteData(args.data, false)
      return table.updateMany({ where: mapReadArgs(args, scope).where, data } as any)
    },
  }
}
