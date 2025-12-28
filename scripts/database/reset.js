#!/usr/bin/env node

const { runCommands, runNpx, success, error } = require('../utils/common')
const build = require('./build')
const generate = require('./generate')

async function main() {
  try {
    console.log('🔄 Prisma 데이터베이스 리셋 시작...')

    // 1. 스키마 빌드
    await build()

    // 2. 마이그레이션 리셋
    await runNpx('prisma', [
      'migrate',
      'reset',
      '--schema=apps/api/prisma/schema.prisma',
      '--force',
    ])

    // 3. 클라이언트 생성
    await generate()

    success('Prisma 데이터베이스 리셋 완료')
  } catch (err) {
    error('Prisma 데이터베이스 리셋 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
