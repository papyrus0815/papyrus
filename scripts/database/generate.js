#!/usr/bin/env node

import { runNpx, success, error } from '../utils/common.js'

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default main
