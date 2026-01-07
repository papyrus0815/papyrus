#!/usr/bin/env node

import { runCommands, success, error } from '../utils/common.js'

async function main(options = {}) {
  try {
    const { nginx = false } = options

    console.log('🔧 개발 환경 시작...')

    const commands = []

    if (nginx) {
      // Docker 컨테이너 시작
      commands.push({
        command: 'docker-compose',
        args: ['up', '-d'],
      })
    }

    // Nestia 빌드
    commands.push({
      command: 'node',
      args: ['scripts/build/nestia.js'],
    })

    // API와 웹 서버 동시 실행
    commands.push({
      command: 'npx',
      args: [
        'concurrently',
        '-n',
        'api,web',
        '-c',
        'blue,green',
        '"nx serve api"',
        nginx ? '"nx serve web"' : '"npm run serve:web"',
      ],
    })

    await runCommands(commands)
    success('개발 환경 시작 완료')
  } catch (err) {
    error('개발 환경 시작 실패')
    process.exit(1)
  }
}

// CLI 인수 처리
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options = {
    nginx: args.includes('--nginx'),
  }
  main(options)
}

export default main
