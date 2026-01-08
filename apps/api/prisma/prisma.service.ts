import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

/**
 * Prisma 공통 설정
 * seed.ts와 prisma.module.ts에서 공통으로 사용
 */

export interface PrismaConfigOptions {
  useAdapter?: boolean
  log?: boolean
}

export class PrismaService extends PrismaClient {
  constructor(options: PrismaConfigOptions = {}) {
    const { useAdapter = true, log = true } = options

    // 환경변수에서 DB 설정 읽기 (필수)
    const dbHost = process.env.MYSQL_HOST
    const dbPort = process.env.MYSQL_PORT
      ? parseInt(process.env.MYSQL_PORT)
      : undefined
    const dbUser = process.env.MYSQL_USER
    const dbPassword = process.env.MYSQL_PASSWORD
    const dbName = process.env.MYSQL_DATABASE

    // 환경변수 검증 - Prisma v7에서는 adapter가 필수
    if (!dbHost || !dbPort || !dbUser || !dbPassword || !dbName) {
      throw new Error(
        '❌ DB 환경변수가 설정되지 않았습니다. ' +
          'MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE를 확인하세요.',
      )
    }

    const logConfig = log
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error']

    // Prisma v7에서는 adapter가 필수
    const adapter = new PrismaMariaDb({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    })
    super({ adapter, log: logConfig as any })
  }
}
