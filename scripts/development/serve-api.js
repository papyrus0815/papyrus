#!/usr/bin/env node

import { runNpx, success, error } from '../utils/common.js'

async function main() {
  try {
    console.log('🚀 API 서버 시작...')
    await runNpx('nx', ['serve', 'api'])
    success('API 서버 시작 완료')
  } catch (err) {
    error('API 서버 시작 실패')
    process.exit(1)
  }
}

// ES 모듈에서 직접 실행 여부 확인
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default main
