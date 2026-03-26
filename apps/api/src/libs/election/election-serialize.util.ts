import { Prisma } from '@prisma/client'

/** BigInt·Decimal·Date를 JSON 친화적으로 변환 (선거 득표 등) */
export function serializeElectionBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (Prisma.Decimal.isDecimal(obj)) return obj.toString()
  if (Array.isArray(obj)) return obj.map(serializeElectionBigInt)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj as object)) {
      result[key] = serializeElectionBigInt((obj as Record<string, unknown>)[key])
    }
    return result
  }
  return obj
}
