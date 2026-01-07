#!/usr/bin/env node

import { runNpx, success, error } from '../utils/common.js'

async function main(options = {}) {
  try {
    const { network = false, tunnel = false } = options

    console.log('🌐 웹 서버 시작...')

    const env = {}

    if (network || tunnel) {
      env.WEB_BIND_HOST = '0.0.0.0'
    }

    if (tunnel) {
      env.WEB_ALLOWED_HOSTS = '*'
    }

    await runNpx('nx', ['serve', 'web'], { env: { ...process.env, ...env } })
    success('웹 서버 시작 완료')
  } catch (err) {
    error('웹 서버 시작 실패')
    process.exit(1)
  }
}

// CLI 인수 처리
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options = {
    network: args.includes('--network'),
    tunnel: args.includes('--tunnel'),
  }
  main(options)
}

export default main
