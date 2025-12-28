#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main(options = {}) {
  try {
    const { target = 'all' } = options

    console.log('🔧 린트 자동 수정 시작...')

    let args = ['.', '--ext', '.ts,.tsx,.js,.jsx', '--fix']

    if (target === 'api') {
      args = ['apps/api/src', '--ext', '.ts,.tsx', '--fix']
    } else if (target === 'web') {
      args = ['apps/web/src', '--ext', '.ts,.tsx', '--fix']
    }

    await runCommand('npx', ['eslint', ...args])
    success('린트 자동 수정 완료')
  } catch (err) {
    error('린트 자동 수정 실패')
    process.exit(1)
  }
}

// CLI 인수 처리
if (require.main === module) {
  const args = process.argv.slice(2)
  const target = args.includes('--api')
    ? 'api'
    : args.includes('--web')
      ? 'web'
      : 'all'
  main({ target })
}

module.exports = main
