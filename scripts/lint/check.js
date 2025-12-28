#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main(options = {}) {
  try {
    const { target = 'all' } = options

    console.log('🔍 린트 검사 시작...')

    let args = ['.', '--ext', '.ts,.tsx,.js,.jsx']

    if (target === 'api') {
      args = ['apps/api/src', '--ext', '.ts,.tsx']
    } else if (target === 'web') {
      args = ['apps/web/src', '--ext', '.ts,.tsx']
    }

    await runCommand('npx', ['eslint', ...args])
    success('린트 검사 완료')
  } catch (err) {
    error('린트 검사에서 오류 발견')
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
