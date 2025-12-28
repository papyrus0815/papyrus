#!/usr/bin/env node

const { runNpx, success, error } = require('../utils/common')

async function main() {
  try {
    console.log('🏗️  API 빌드 시작...')
    await runNpx('nx', ['build', 'api'])
    success('API 빌드 완료')
  } catch (err) {
    error('API 빌드 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
