#!/usr/bin/env node

const { runNpx, success, error } = require('../utils/common')

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

if (require.main === module) {
  main()
}

module.exports = main
