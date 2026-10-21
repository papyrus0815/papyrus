/**
 * 재임 행 시드 헬퍼 — 시드의 `prisma.governmentPositionTenure` 호출을 받아 직위 보유 모델의 규칙을 지킨다.
 *
 * 시드 수십 개가 재임을 직위 종류(positionType) + 직함(title)만으로 만든다. 직위 보유 모델에서는
 * - 모든 재임이 직위 정의를 갖는다 — 정의가 없으면 그 종류의 일반 정의(isGeneric: '군 지휘관' 등)
 * - title은 정의보다 구체적인 이름일 때만 — 정의 이름과 같으면 비운다(표시는 title → 정의 이름)
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

  async function mapCreateData(data: AnyArgs): Promise<AnyArgs> {
    const definition = await definitionFor(data.positionDefinitionId, data.positionType)
    return {
      ...data,
      positionDefinitionId: definition.id,
      positionType: definition.positionType,
      title: specificTitle(data.title, definition.title),
    }
  }

  /** 정의·종류·직함 중 하나라도 바꾸면 정의를 다시 정하고 직함을 정규화한다 */
  async function mapUpdateData(data: AnyArgs, where: AnyArgs): Promise<AnyArgs> {
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
    findFirst: (args?: AnyArgs): Promise<any> => table.findFirst(args as any),
    findMany: (args?: AnyArgs): Promise<any[]> => table.findMany(args as any),
    count: (args?: AnyArgs): Promise<number> => table.count(args as any),
    async create(args: AnyArgs): Promise<any> {
      const { data, ...rest } = args
      return table.create({ ...rest, data: await mapCreateData(data) } as any)
    },
    async update(args: AnyArgs): Promise<any> {
      const { data, where, ...rest } = args
      return table.update({ ...rest, where, data: await mapUpdateData(data, where) } as any)
    },
    /** 여러 행 갱신은 정의·직함을 건드리지 않는 용도만 — 건드리면 행마다 정규화가 필요해 막는다 */
    updateMany(args: AnyArgs): Promise<any> {
      const data = args.data ?? {}
      if ('positionDefinitionId' in data || 'positionType' in data || 'title' in data) {
        throw new Error('[tenureRows] updateMany로 정의·종류·직함을 바꾸지 말 것 — update로 행마다')
      }
      return table.updateMany(args as any)
    },
  }
}
