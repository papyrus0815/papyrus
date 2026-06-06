import { Prisma } from '@prisma/client'

/**
 * Prisma 결과를 JSON 친화적으로 직렬화한다.
 * - BigInt → 문자열
 * - Date → ISO 문자열
 * - Decimal → 문자열
 * - 배열·중첩 객체는 재귀 처리
 *
 * 과거 각 repository에 동일 로직이 수십 곳 복붙돼 있었고, 그중 일부가 Date 가드를
 * 누락해 Date를 빈 객체({})로 만들어 알림 preview가 "[object Object]"로 표시되는
 * 버그를 유발했다. 이 함수를 단일 출처로 사용한다.
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (Prisma.Decimal.isDecimal(obj)) return obj.toString()
  if (Array.isArray(obj)) return obj.map(serializeBigInt)
  if (typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) result[key] = serializeBigInt(obj[key])
    return result
  }
  return obj
}
