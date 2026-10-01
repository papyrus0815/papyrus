import { PrismaMariaDb } from '@prisma/adapter-mariadb'

/**
 * 서기 1~99년 DATETIME이 20xx년으로 읽히던 문제를 막는 어댑터.
 *
 * DB에는 '0044-03-15 00:00:00'으로 바르게 저장되고 비교·정렬도 맞다. 틀어지는 건 **읽을 때**다 —
 * @prisma/adapter-mariadb(7.3.0)가 DATETIME 문자열을 `new Date(`${value}Z`)`로 바꾸는데,
 * 'YYYY-MM-DD hh:mm:ss' 같은 비ISO 형식은 V8이 옛 방식으로 읽어 두 자리 연도(0044)를 2044로 본다.
 * 'T'로 이으면 ISO로 읽혀 44년 그대로다. 100년 이후 값은 어느 쪽으로 읽어도 같으므로 앞 두 자리가
 * '00'인 값만 고친다.
 *
 * 어댑터 내부의 행 변환(mapRow)은 감춰져 있어서, 그 앞 단계인 드라이버 query 결과를 고친다.
 * 트랜잭션은 풀에서 커넥션을 따로 빌리므로 getConnection으로 얻은 커넥션도 같이 감싼다.
 */

const DATETIME_TYPES = new Set(['DATETIME', 'DATETIME2', 'TIMESTAMP', 'TIMESTAMP2'])
const EARLY_YEAR_DATETIME = /^00\d\d-\d\d-\d\d /

interface ColumnMeta {
  type?: string
}

type QueryResult = unknown[] & { meta?: ColumnMeta[] }

interface Queryable {
  query: (...args: unknown[]) => Promise<unknown>
}

interface PoolLike extends Queryable {
  getConnection: () => Promise<Queryable>
}

/** 행 배열 결과에서 서기 1~99년 DATETIME 문자열을 ISO('T') 형식으로 */
export function fixEarlyYearDatetimes(result: unknown): unknown {
  if (!Array.isArray(result)) return result
  const meta = (result as QueryResult).meta
  if (!meta) return result
  const columns = meta
    .map((column, index) => (column.type && DATETIME_TYPES.has(column.type) ? index : -1))
    .filter((index) => index >= 0)
  if (columns.length === 0) return result
  for (const row of result) {
    if (!Array.isArray(row)) continue
    for (const index of columns) {
      const value = row[index]
      if (typeof value === 'string' && EARLY_YEAR_DATETIME.test(value)) {
        row[index] = value.replace(' ', 'T')
      }
    }
  }
  return result
}

function wrapQuery<Target extends Queryable>(target: Target): Target {
  const original = target.query.bind(target)
  target.query = async (...args: unknown[]) => fixEarlyYearDatetimes(await original(...args))
  return target
}

export class EarlyYearSafePrismaMariaDb extends PrismaMariaDb {
  override async connect() {
    const adapter = await super.connect()
    const pool = adapter.underlyingDriver() as unknown as PoolLike
    wrapQuery(pool)
    const getConnection = pool.getConnection.bind(pool)
    pool.getConnection = async () => wrapQuery(await getConnection())
    return adapter
  }
}
