#!/usr/bin/env node

const { runNpx, success, error } = require('../utils/common')

async function main() {
  try {
    console.log('🔨 Prisma 스키마 빌드 시작...')
    await runNpx('ts-node', ['libs/db/prisma/build-schema.ts'])
    success('Prisma 스키마 빌드 완료')
  } catch (err) {
    error('Prisma 스키마 빌드 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
