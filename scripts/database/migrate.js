#!/usr/bin/env node

const { runNpx, success, error } = require('../utils/common')

async function main() {
  try {
    console.log('🔄 Prisma 마이그레이션 시작...')
    await runNpx('ts-node', ['libs/db/prisma/run-migrate.ts'])
    success('Prisma 마이그레이션 완료')
  } catch (err) {
    error('Prisma 마이그레이션 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
