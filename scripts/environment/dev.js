#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main() {
  try {
    console.log('🔧 개발 환경 설정 적용...')

    if (process.platform === 'win32') {
      await runCommand('copy', ['env.development', '.env'])
    } else {
      await runCommand('cp', ['env.development', '.env'])
    }

    success('개발 환경 설정 완료')
  } catch (err) {
    error('개발 환경 설정 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
