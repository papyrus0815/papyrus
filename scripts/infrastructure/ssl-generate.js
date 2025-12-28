#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main(options = {}) {
  try {
    const { simple = false } = options

    console.log('🔒 SSL 인증서 생성 시작...')

    const scriptName = simple ? 'generate-ssl-simple.ps1' : 'generate-ssl.ps1'
    const cwd = 'docker/nginx'

    await runCommand(
      'powershell',
      ['-ExecutionPolicy', 'Bypass', '-File', scriptName],
      { cwd },
    )

    success('SSL 인증서 생성 완료')
  } catch (err) {
    error('SSL 인증서 생성 실패')
    process.exit(1)
  }
}

// CLI 인수 처리
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {
    simple: args.includes('--simple'),
  }
  main(options)
}

module.exports = main
