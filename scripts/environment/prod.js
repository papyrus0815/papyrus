#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main() {
  try {
    console.log('🚀 프로덕션 환경 설정 적용...')

    if (process.platform === 'win32') {
      await runCommand('copy', ['env.production', '.env'])
    } else {
      await runCommand('cp', ['env.production', '.env'])
    }

    success('프로덕션 환경 설정 완료')
  } catch (err) {
    error('프로덕션 환경 설정 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
