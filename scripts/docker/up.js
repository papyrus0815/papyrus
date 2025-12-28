#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main(options = {}) {
  try {
    const { env = false, https = false } = options

    console.log('🐳 Docker 컨테이너 시작...')

    if (https) {
      // SSL 생성
      await runCommand('node', ['scripts/infrastructure/ssl-generate.js'])
      // Nginx 설정 생성
      await runCommand('node', ['scripts/infrastructure/nginx-generate.js'])
    } else if (env) {
      // Nginx 설정만 생성
      await runCommand('node', ['scripts/infrastructure/nginx-generate.js'])
    }

    await runCommand('docker-compose', ['up', '-d'])
    success('Docker 컨테이너 시작 완료')
  } catch (err) {
    error('Docker 컨테이너 시작 실패')
    process.exit(1)
  }
}

// CLI 인수 처리
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {
    env: args.includes('--env'),
    https: args.includes('--https'),
  }
  main(options)
}

module.exports = main
