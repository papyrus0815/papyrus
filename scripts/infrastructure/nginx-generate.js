#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main() {
  try {
    console.log('🌐 Nginx 설정 생성 시작...')

    const options = { cwd: 'docker/nginx' }

    if (process.platform === 'win32') {
      await runCommand('bash', ['generate-config.sh'], options)
    } else {
      await runCommand('./generate-config.sh', [], options)
    }

    success('Nginx 설정 생성 완료')
  } catch (err) {
    error('Nginx 설정 생성 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
