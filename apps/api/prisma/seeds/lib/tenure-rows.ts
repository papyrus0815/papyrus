/**
 * 재임 행 시드 헬퍼 — 시드의 `prisma.governmentPositionTenure` 호출을 받아 직위 보유 모델의 규칙을 지킨다.
 *
 * 시드 수십 개가 재임을 직위 종류(positionType) + 직함(title)만으로 만든다. 직위 보유 모델에서는
 * - 모든 재임이 직위 정의를 갖는다 — 정의가 없으면 그 종류의 일반 정의(isGeneric: '군 지휘관' 등)
 * - title은 정의보다 구체적인 이름일 때만 — 정의 이름과 같으면 비운다(표시는 title → 정의 이름)
 * - 대수 칸은 ordinal 하나 — 시드의 옛 어휘 `termNumber`(대수)는 where·select·orderBy·data 모두 ordinal로 옮긴다.
 *   옛 `regnalNumber`(재임의 '이름 속 서수')는 칸이 사라졌다 — 넘기면 실패한다(왕호는 regnalName 문자열에).
 * - where의 `title: '…'`은 '표시 직함'으로 찾는다 — 구체 직함이 그 이름이거나, 구체 직함 없이 정의 이름이 그 이름인 행.
 *   (title을 정의 이름과 같으면 비우므로, 그대로 찾으면 재실행 때 '이미 있음'을 못 찾아 중복 행을 만든다)
 * 호출 모양은 그대로 두고 받는 쪽만 바꾼다: `prisma.governmentPositionTenure.X(args)` → `tenureRows(prisma).X(args)`.
 * 재위(군주직) 시드는 `reign-rows.ts`가 맡는다.
 */
import type { GovernmentPositionType, PrismaClient } from '@prisma/client'

type AnyArgs = Record<string, any>

/** 구체 직함 — 비었거나 정의 이름과 같으면 저장하지 않는다 */
function specificTitle(title: unknown, definitionTitle: string): string | null {
  const trimmed = typeof title === 'string' ? title.trim() : ''
  return trimmed && trimmed !== definitionTitle ? trimmed : null
}

/** 객체 키 termNumber → ordinal (where의 AND/OR/NOT 안쪽까지). regnalNumber는 거부 */
function renameTermNumber(value: any): any {
  if (Array.isArray(value)) return value.map(renameTermNumber)
  if (value == null || typeof value !== 'object' || value instanceof Date) return value
  const out: AnyArgs = {}
  for (const [key, inner] of Object.entries(value)) {
    if (key === 'regnalNumber') throw new Error('[tenureRows] regnalNumber 칸은 없다 — 대수는 ordinal, 이름 속 서수는 regnalName에')
    if (key === 'termNumber') out.ordinal = inner
    else if (key === 'AND' || key === 'OR' || key === 'NOT') out[key] = renameTermNumber(inner)
    else out[key] = inner
  }
  return out
}

/** where의 문자열 title → 표시 직함 조건 (AND/OR/NOT 안쪽까지) */
function displayTitleWhere(where: any): any {
  if (Array.isArray(where)) return where.map(displayTitleWhere)
  if (where == null || typeof where !== 'object') return where
  const out: AnyArgs = {}
  for (const [key, inner] of Object.entries(where)) {
    out[key] = key === 'AND' || key === 'OR' || key === 'NOT' ? displayTitleWhere(inner) : inner
  }
  if (typeof out.title !== 'string') return out
  const { title, ...rest } = out
  return {
    AND: [rest, { OR: [{ title }, { title: null, positionDefinition: { is: { title } } }] }],
  }
}

function mapReadArgs(args: AnyArgs = {}): AnyArgs {
  const mapped: AnyArgs = { ...args }
  if (args.where) mapped.where = displayTitleWhere(renameTermNumber(args.where))
  if (args.select) mapped.select = renameTermNumber(args.select)
  if (args.orderBy) mapped.orderBy = renameTermNumber(args.orderBy)
  return mapped
}

export function tenureRows(prisma: PrismaClient) {
  const table = prisma.governmentPositionTenure
  const select = { id: true, positionType: true, title: true } as const

  async function definitionFor(positionDefinitionId: unknown, positionType: unknown) {
    const definition =
      typeof positionDefinitionId === 'string' && positionDefinitionId
        ? await prisma.governmentPositionDefinition.findUnique({ where: { id: positionDefinitionId }, select })
        : await prisma.governmentPositionDefinition.findFirst({
            where: { isGeneric: true, positionType: ((positionType as string) || 'OTHER') as GovernmentPositionType },
            select,
          })
    if (!definition) {
      throw new Error(`[tenureRows] 직위 정의 없음: ${String(positionDefinitionId ?? positionType ?? 'OTHER')}`)
    }
    return definition
  }

  async function mapCreateData(raw: AnyArgs): Promise<AnyArgs> {
    const data = renameTermNumber(raw)
    const definition = await definitionFor(data.positionDefinitionId, data.positionType)
    return {
      ...data,
      positionDefinitionId: definition.id,
      positionType: definition.positionType,
      title: specificTitle(data.title, definition.title),
    }
  }

  /** 정의·종류·직함 중 하나라도 바꾸면 정의를 다시 정하고 직함을 정규화한다 */
  async function mapUpdateData(raw: AnyArgs, where: AnyArgs): Promise<AnyArgs> {
    const data = renameTermNumber(raw)
    const touches = 'positionDefinitionId' in data || 'positionType' in data || 'title' in data
    if (!touches) return data
    const current = await table.findFirst({
      where,
      select: { title: true, positionDefinition: { select } },
    })
    if (!current) return data
    let definition = current.positionDefinition
    if (data.positionDefinitionId) {
      definition = await definitionFor(data.positionDefinitionId, undefined)
    } else if (data.positionDefinitionId === null || (data.positionType && data.positionType !== definition.positionType)) {
      definition = await definitionFor(undefined, data.positionType ?? definition.positionType)
    }
    return {
      ...data,
      positionDefinitionId: definition.id,
      positionType: definition.positionType,
      title: specificTitle('title' in data ? data.title : current.title, definition.title),
    }
  }

  return {
    findFirst: (args?: AnyArgs): Promise<any> => table.findFirst(mapReadArgs(args) as any),
    findMany: (args?: AnyArgs): Promise<any[]> => table.findMany(mapReadArgs(args) as any),
    count: (args?: AnyArgs): Promise<number> => table.count(mapReadArgs(args) as any),
    async create(args: AnyArgs): Promise<any> {
      const { data, ...rest } = args
      return table.create({ ...mapReadArgs(rest), data: await mapCreateData(data) } as any)
    },
    /** where를 표시 직함 조건으로 바꾸면 유일 키 모양이 깨진다 — 행을 먼저 찾고 id로 갱신 */
    async update(args: AnyArgs): Promise<any> {
      const { data, where, ...rest } = mapReadArgs(args)
      const target = await table.findFirst({ where, select: { id: true } })
      if (!target) throw new Error(`[tenureRows] 갱신할 재임 행 없음: ${JSON.stringify(args.where)}`)
      return table.update({ ...rest, where: { id: target.id }, data: await mapUpdateData(data, { id: target.id }) } as any)
    },
    /** 여러 행 갱신은 정의·직함을 건드리지 않는 용도만 — 건드리면 행마다 정규화가 필요해 막는다 */
    updateMany(args: AnyArgs): Promise<any> {
      const data = renameTermNumber(args.data ?? {})
      if ('positionDefinitionId' in data || 'positionType' in data || 'title' in data) {
        throw new Error('[tenureRows] updateMany로 정의·종류·직함을 바꾸지 말 것 — update로 행마다')
      }
      return table.updateMany({ ...mapReadArgs(args), data } as any)
    },
  }
}
