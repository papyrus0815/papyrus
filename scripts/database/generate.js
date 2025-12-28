#!/usr/bin/env node

const { runNpx, success, error } = require('../utils/common')

async function main() {
  try {
    console.log('⚙️  Prisma 클라이언트 생성 시작...')
    await runNpx('prisma', [
      'generate',
      '--schema=apps/api/prisma/schema.prisma',
    ])
    success('Prisma 클라이언트 생성 완료')
  } catch (err) {
    error('Prisma 클라이언트 생성 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
