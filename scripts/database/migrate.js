#!/usr/bin/env node

import { runNpx, success, error } from '../utils/common.js'

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default main
